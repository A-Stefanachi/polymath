// View model of the skill map (S14, doc 09). Pure: it only arranges what getGraph and getFrontier returned.
// Which skills are locked and why is decided by the scheduler on the server (getFrontier, getSkill.blocked_by);
// nothing here re-implements a prerequisite rule.
import type { components } from "@polymath/shared-types";
import type { SkillState } from "@/components/ui/status-chip";
import { lists } from "@/copy/strings";

type Graph = components["schemas"]["Graph"];
type Frontier = components["schemas"]["Frontier"];

export type MapEdge = { from: string; to: string; strength: "hard" | "soft"; minTier: string };

export type MapSkill = {
  key: string;
  title: string;
  node: string;
  description: string;
  state: SkillState;
  /** The state word of doc 09 section 3.2. */
  word: string;
  /** The raw mastery state (unseen for a skill with no state yet). */
  mastery: string;
  /** `reviewing` with the applied attempt as the only open mastery condition (BL-0184). */
  needsApplied: boolean;
  tier: string | null;
  due: Date | null;
  /** Due at the end of today (local) or earlier, for a skill that carries a review card. */
  dueToday: boolean;
  /** On the frontier or in progress: the learner can practise it now. */
  practisable: boolean;
};

const WORDS: Record<SkillState, string> = {
  reviewing: lists.stateReviewing,
  learning: lists.stateLearning,
  ready: lists.stateReady,
  locked: lists.stateLocked,
  mastered: lists.stateMastered,
  refresher: lists.stateRefresher,
};

/** Sort rank of the list view: what needs attention first, locked last. */
const RANK: Record<SkillState, number> = { refresher: 0, learning: 1, ready: 2, reviewing: 3, mastered: 4, locked: 5 };

export function endOfLocalDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function buildMapSkills(graph: Graph, frontier: Frontier, now: Date): MapSkill[] {
  const available = new Set(frontier.available.map((a) => a.skill_key));
  const inProgress = new Set(frontier.in_progress);
  const endOfToday = endOfLocalDay(now);
  return graph.nodes.map((s) => {
    const mastery = s.state?.mastery_state ?? "unseen";
    let state: SkillState;
    if (mastery === "decayed") state = "refresher";
    else if (mastery === "mastered") state = "mastered";
    else if (mastery === "reviewing") state = "reviewing";
    else if (mastery === "learning" || inProgress.has(s.key)) state = "learning";
    else state = available.has(s.key) ? "ready" : "locked";
    const due = s.state?.due ? new Date(s.state.due) : null;
    const carriesCard = mastery !== "unseen";
    // Doc 09 section 3.2: a placement-grace skill reads "Seems solid (to re-check)" and never shows a tier (G1).
    const grace = state === "reviewing" && s.state?.placement_grace === true;
    const needsApplied = state === "reviewing" && !grace && s.state?.needs_applied === true;
    return {
      key: s.key,
      title: s.title,
      node: s.node,
      description: s.description ?? "",
      state,
      word: grace ? lists.statePlacementGrace : needsApplied ? lists.stateReviewingApplied : WORDS[state],
      mastery,
      needsApplied,
      tier: grace ? null : (s.state?.tier_attained ?? null),
      due,
      dueToday: carriesCard && due !== null && due.getTime() <= endOfToday.getTime(),
      practisable: state === "ready" || state === "learning",
    };
  });
}

export function toMapEdges(graph: Graph): MapEdge[] {
  return graph.edges.map((e) => ({ from: e.from_skill_key, to: e.to_skill_key, strength: e.strength, minTier: e.min_tier }));
}

export type Filters = { node: string | null; readyNow: boolean; dueNow: boolean; query: string };

export function filterSkills(skills: readonly MapSkill[], f: Filters): MapSkill[] {
  const q = f.query.trim().toLowerCase();
  return skills.filter(
    (s) => (f.node === null || s.node === f.node) && (!f.readyNow || s.state === "ready") && (!f.dueNow || s.dueToday) && (q === "" || s.title.toLowerCase().includes(q)),
  );
}

/** Trail order: prerequisites before the skills that need them (Kahn's algorithm, ties by key). */
export function trailOrder(skills: readonly MapSkill[], edges: readonly MapEdge[]): MapSkill[] {
  const byKey = new Map(skills.map((s) => [s.key, s]));
  const indegree = new Map(skills.map((s) => [s.key, 0]));
  const next = new Map<string, string[]>();
  for (const e of edges) {
    if (!byKey.has(e.from) || !byKey.has(e.to)) continue;
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
    next.set(e.from, [...(next.get(e.from) ?? []), e.to]);
  }
  const ready = [...byKey.keys()].filter((k) => (indegree.get(k) ?? 0) === 0).sort();
  const out: MapSkill[] = [];
  while (ready.length > 0) {
    const key = ready.shift() as string;
    const skill = byKey.get(key);
    if (skill) out.push(skill);
    for (const to of next.get(key) ?? []) {
      const left = (indegree.get(to) ?? 0) - 1;
      indegree.set(to, left);
      if (left === 0) {
        ready.push(to);
        ready.sort();
      }
    }
  }
  // The graph is a DAG; a cycle would only drop skills from the trail, so keep them at the end instead.
  const placed = new Set(out.map((s) => s.key));
  return [...out, ...skills.filter((s) => !placed.has(s.key)).sort((a, b) => (a.key < b.key ? -1 : 1))];
}

/** List order: by state, then by key (doc 09 S14). */
export function listOrder(skills: readonly MapSkill[]): MapSkill[] {
  return [...skills].sort((a, b) => RANK[a.state] - RANK[b.state] || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function nodesOf(skills: readonly MapSkill[]): string[] {
  return [...new Set(skills.map((s) => s.node))].sort();
}

export function startedCount(skills: readonly MapSkill[]): number {
  return skills.filter((s) => s.mastery !== "unseen").length;
}

/** The area the map opens on: the first one with a started skill, else the first one. */
export function defaultNode(skills: readonly MapSkill[]): string | null {
  const nodes = nodesOf(skills);
  return nodes.find((n) => skills.some((s) => s.node === n && s.mastery !== "unseen")) ?? nodes[0] ?? null;
}
