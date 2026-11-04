// Frontier: prerequisite satisfaction, available set, outer fringe, ordering scores, project pull
// (doc 06 section 6; 00a G1). Ports reference/scheduler_reference.py; the shared vectors are the oracle.
// Pure: state snapshots and the graph arrive as arguments.
import { DEFAULT_PARAMS, type SchedulerParams } from "./params.ts";
import type { GraphEdge, SkillGraph, SkillStateSnapshot } from "./types.ts";

export type StateMap = Readonly<Record<string, SkillStateSnapshot>>;

const TIERS: readonly string[] = ["L0", "L1", "L2", "L3"];

function tierIdx(t: string | undefined | null): number {
  return t === undefined || t === null ? -1 : TIERS.indexOf(t);
}

/** Rounds to 4 decimals on the exact binary value, like Python's round(x, 4); normalises -0. */
function round4(x: number): number {
  return Number(x.toFixed(4)) + 0;
}

/**
 * Frontier test for one hard edge (contract 7.1). 00a G1: a `reviewing` card with source `placement`
 * inside the grace window (not verified since, no failed verify retrieval) satisfies the retrievability
 * test whatever its R and counts as tier L1 for the `min_tier` test, for this test only.
 * `hysteresis` uses the lower continue threshold for a skill already being learned.
 */
export function prereqSatisfied(
  state: SkillStateSnapshot,
  edge: Pick<GraphEdge, "min_tier">,
  hysteresis = false,
  params: SchedulerParams = DEFAULT_PARAMS,
): boolean {
  const ms = state.mastery_state ?? "unseen";
  const r = state.retrievability;
  const threshold = hysteresis ? params.continue_r_threshold : params.prereq_r_threshold;
  let ok = ms === "mastered" || (ms === "reviewing" && r !== undefined && r !== null && r >= threshold);
  let tier = tierIdx(state.tier_attained);
  const age = state.placement_age_days;
  const grace =
    ms === "reviewing" &&
    state.source === "placement" &&
    state.verified_after_placement !== true &&
    state.placement_verify_failed !== true &&
    age !== undefined &&
    age <= params.placement_grace_days;
  if (grace) {
    ok = true;
    tier = Math.max(tier, tierIdx(params.placement_grace_max_tier));
  }
  if (!ok) return false;
  return edge.min_tier === null || tier >= tierIdx(edge.min_tier);
}

function hardEdgesInto(graph: SkillGraph, key: string): GraphEdge[] {
  return graph.edges.filter((e) => e.to === key && e.strength === "hard");
}

/** Stub skills have no verified content, so they are never offered (BL-0049 note). */
function isOffered(graph: SkillGraph, key: string): boolean {
  return graph.skills[key]?.status !== "stub";
}

/** Skills whose hard prerequisites are all satisfied, sorted by key. Skills already being learned use hysteresis. */
export function computeAvailable(
  graph: SkillGraph,
  states: StateMap,
  hysteresisFor: Iterable<string> = [],
  params: SchedulerParams = DEFAULT_PARAMS,
): string[] {
  const hyst = new Set(hysteresisFor);
  return Object.keys(graph.skills)
    .sort()
    .filter(
      (key) =>
        isOffered(graph, key) &&
        hardEdgesInto(graph, key).every((e) => prereqSatisfied(states[e.from] ?? {}, e, hyst.has(key), params)),
    );
}

/** Outer fringe: available skills still `unseen` or `learning`. */
export function computeFrontier(
  graph: SkillGraph,
  states: StateMap,
  params: SchedulerParams = DEFAULT_PARAMS,
): string[] {
  const learning = Object.keys(states).filter((k) => states[k]?.mastery_state === "learning");
  return computeAvailable(graph, states, learning, params).filter((k) => {
    const ms = states[k]?.mastery_state ?? "unseen";
    return ms === "unseen" || ms === "learning";
  });
}

export interface LockedReason {
  readonly prerequisite: string;
  readonly mastery_state: string;
  readonly retrievability: number | null;
  readonly tier_attained: string | null;
  readonly min_tier: string | null;
}

/** Why a skill is locked (FR-013): the unmet hard prerequisites with their current state. Empty when unlocked. */
export function lockedReasons(
  graph: SkillGraph,
  states: StateMap,
  key: string,
  params: SchedulerParams = DEFAULT_PARAMS,
  hysteresis = false,
): LockedReason[] {
  return hardEdgesInto(graph, key)
    .filter((e) => !prereqSatisfied(states[e.from] ?? {}, e, hysteresis, params))
    .map((e) => {
      const s = states[e.from] ?? {};
      return {
        prerequisite: e.from,
        mastery_state: s.mastery_state ?? "unseen",
        retrievability: s.retrievability ?? null,
        tier_attained: s.tier_attained ?? null,
        min_tier: e.min_tier,
      };
    })
    .sort((a, b) => (a.prerequisite < b.prerequisite ? -1 : a.prerequisite > b.prerequisite ? 1 : 0));
}

export interface FrontierScore {
  readonly key: string;
  readonly score: number;
  readonly unmet_soft: number;
  readonly unlocks: number;
}

function solid(states: StateMap, key: string): boolean {
  const ms = states[key]?.mastery_state;
  return ms === "mastered" || ms === "reviewing";
}

/**
 * Ordering: score = w_p*pull + w_u*unlocks - w_s*unmet_soft - w_b*balance_excess - w_c*est_hours.
 * Skills with more than half their soft prerequisites unmet go last.
 */
export function frontierScores(
  graph: SkillGraph,
  states: StateMap,
  frontier: readonly string[],
  pull: Readonly<Record<string, number>>,
  nodeMinutes: Readonly<Record<string, number>>,
  params: SchedulerParams = DEFAULT_PARAMS,
): FrontierScore[] {
  const total = Object.values(nodeMinutes).reduce((a, b) => a + b, 0);
  const out = frontier.map((key) => {
    const skill = graph.skills[key];
    if (skill === undefined) throw new Error(`frontierScores: unknown skill ${key}`);
    let unlocks = 0;
    for (const dep of graph.edges.filter((e) => e.from === key && e.strength === "hard").map((e) => e.to)) {
      const others = graph.edges.filter((e) => e.to === dep && e.strength === "hard" && e.from !== key);
      if (others.every((e) => solid(states, e.from))) unlocks += 1;
    }
    const unlocksN = Math.min(unlocks, 3) / 3;
    const softs = graph.edges.filter((e) => e.to === key && e.strength === "soft").map((e) => e.from);
    const unmet = softs.length === 0 ? 0 : softs.filter((s) => !solid(states, s)).length / softs.length;
    const share = total > 0 ? (nodeMinutes[skill.node] ?? 0) / total : 0;
    const excess = Math.max(0, share - params.max_node_share);
    const score =
      params.frontier_w_project * (pull[key] ?? 0) +
      params.frontier_w_unlocks * unlocksN -
      params.frontier_w_soft_unmet * unmet -
      params.frontier_w_balance * excess -
      (params.frontier_w_cost * skill.est_minutes) / 60;
    return { key, score: round4(score), unmet_soft: round4(unmet), unlocks };
  });
  return out.sort((a, b) => {
    const ga = a.unmet_soft > 0.5 ? 1 : 0;
    const gb = b.unmet_soft > 0.5 ? 1 : 0;
    if (ga !== gb) return ga - gb;
    if (a.score !== b.score) return b.score - a.score;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

/** pull(s) = 1 / (1 + distance) over hard and soft ancestors of the project's upcoming step skills; max over steps. */
export function projectPull(graph: SkillGraph, stepSkillKeys: readonly string[]): Record<string, number> {
  const parents = new Map<string, string[]>();
  for (const e of graph.edges) parents.set(e.to, [...(parents.get(e.to) ?? []), e.from]);
  const pull: Record<string, number> = {};
  for (const root of stepSkillKeys) {
    const dist = new Map<string, number>([[root, 0]]);
    const queue = [root];
    for (let i = 0; i < queue.length; i += 1) {
      const cur = queue[i] as string;
      for (const p of [...(parents.get(cur) ?? [])].sort()) {
        if (!dist.has(p)) {
          dist.set(p, (dist.get(cur) as number) + 1);
          queue.push(p);
        }
      }
    }
    for (const [k, d] of dist) pull[k] = Math.max(pull[k] ?? 0, 1 / (1 + d));
  }
  return Object.fromEntries(Object.entries(pull).map(([k, v]) => [k, round4(v)]));
}
