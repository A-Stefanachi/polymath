// listSkills, getSkill, getGraph, getFrontier, getReviewQueue (BL-0048; FR-011, FR-012, FR-013, FR-043;
// doc 06 section 6). Read-only: the caller's own skill_state is merged into the content graph and the
// pure scheduler decides what is available. Nothing here writes learner state (CLAUDE.md rule 2.8).
//
// The API exposes graph fields only. Answer keys, items.params, template bodies and verification reports
// are not selected by the store, so no allow-list can leak them (rule 2.6).
import {
  computeFrontier,
  DEFAULT_PARAMS,
  frontierScores,
  fromSkillStateColumns,
  lockedReasons,
  type FsrsPort,
  type PackInput,
  type SchedulerParams,
  type Tier,
} from "@polymath/scheduler";
import type { components } from "@polymath/shared-types";
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { sharedFsrsPort } from "@/lib/state/apply-attempt.ts";
import { createGraphStore, type GraphEdgeRow, type GraphSkillRow, type GraphSnapshot, type GraphStateRow, type GraphStore } from "@/server/privileged/graph-store";
import { privilegedDb } from "@/server/privileged/db";

type SkillGraph = PackInput["graph"];
type SkillStateSnapshot = Parameters<typeof lockedReasons>[1][string];
type Skill = components["schemas"]["Skill"];
type SkillDetail = components["schemas"]["SkillDetail"];
type Edge = components["schemas"]["Edge"];
type StateView = components["schemas"]["SkillStateView"];
type Frontier = components["schemas"]["Frontier"];
type ReviewQueue = components["schemas"]["ReviewQueue"];

export type GraphDeps = {
  store: GraphStore;
  fsrs: () => Promise<FsrsPort>;
  params: SchedulerParams;
  now: () => Date;
};

export const defaultGraphDeps = (): GraphDeps => ({
  store: createGraphStore(privilegedDb()),
  fsrs: sharedFsrsPort,
  params: DEFAULT_PARAMS,
  now: () => new Date(),
});

const NODE_CODES = ["math", "phys", "sw", "ml", "elec", "sig", "ctl", "mech", "sens", "net", "matl", "sys", "sec", "econ", "prof", "def", "rf", "robo", "cv", "pwr"];
const MASTERY_STATES = ["unseen", "learning", "reviewing", "mastered", "decayed"];
/** States that carry an FSRS card and so can be due (06 section 4.3). */
const CARD_STATES: readonly string[] = ["learning", "reviewing", "mastered", "decayed"];
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** Planning estimate for one due review, in minutes (the example in api.openapi.yaml: 6 due, 12 minutes). */
const MINUTES_PER_REVIEW = 2;
const SKILL_KEY = /^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$/;

function userId(ctx: ApiContext): string {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  return ctx.caller.userId;
}

function bad(field: string, message: string): ApiError {
  return new ApiError("validation_failed", { errors: [{ field, message }] });
}

/** The query string, with every parameter outside `allowed` rejected (strict validation). */
function query(ctx: ApiContext, allowed: readonly string[]): URLSearchParams {
  const q = new URL(ctx.request.url).searchParams;
  for (const name of q.keys()) if (!allowed.includes(name)) throw bad(name, "is not a parameter of this operation");
  return q;
}

function enumParam(q: URLSearchParams, name: string, values: readonly string[]): string | undefined {
  const v = q.get(name);
  if (v === null) return undefined;
  if (!values.includes(v)) throw bad(name, `must be one of ${values.join(", ")}`);
  return v;
}

function intParam(q: URLSearchParams, name: string, min: number, max: number, fallback: number): number {
  const raw = q.get(name);
  if (raw === null) return fallback;
  const n = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(n) || n < min || n > max) throw bad(name, `must be an integer from ${min} to ${max}`);
  return n;
}

// ---------- merged view ----------

type View = {
  snap: GraphSnapshot;
  skillByKey: Map<string, GraphSkillRow>;
  stateByKey: Map<string, GraphStateRow>;
  retrievability: Map<string, number>;
  graph: SkillGraph;
  snapshots: Record<string, SkillStateSnapshot>;
};

function retrievabilityOf(fsrs: FsrsPort, st: GraphStateRow, now: Date): number | undefined {
  if (!CARD_STATES.includes(st.masteryState)) return undefined;
  if (st.fsrsState === 0 && st.lastReview === null) return undefined;
  return fsrs.retrievability(
    fromSkillStateColumns({
      stability: st.stability,
      difficulty: st.difficulty,
      due: (st.due ?? now).toISOString(),
      last_review: st.lastReview === null ? null : st.lastReview.toISOString(),
      reps: st.reps,
      lapses: st.lapses,
      fsrs_state: st.fsrsState as 0 | 1 | 2 | 3,
      scheduled_days: st.scheduledDays,
      learning_steps: st.learningSteps,
      fsrs_extra: st.fsrsExtra,
    }),
    now,
  );
}

async function load(deps: GraphDeps, user: string): Promise<View> {
  const now = deps.now();
  const [snap, fsrs] = await Promise.all([deps.store.snapshot(user), deps.fsrs()]);
  snap.skills.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)); // code-point order, as the cursor compares
  const skillByKey = new Map(snap.skills.map((s) => [s.key, s]));
  const stateByKey = new Map(snap.states.filter((s) => skillByKey.has(s.skillKey)).map((s) => [s.skillKey, s]));
  const retrievability = new Map<string, number>();
  const snapshots: Record<string, SkillStateSnapshot> = {};
  for (const st of stateByKey.values()) {
    const r = retrievabilityOf(fsrs, st, now);
    if (r !== undefined) retrievability.set(st.skillKey, r);
    const age = st.source === "placement" && st.firstSeenAt ? (now.getTime() - st.firstSeenAt.getTime()) / DAY_MS : undefined;
    snapshots[st.skillKey] = {
      mastery_state: st.masteryState,
      ...(st.tierAttained === null ? {} : { tier_attained: st.tierAttained as Tier }),
      ...(r === undefined ? {} : { retrievability: r }),
      elo: st.elo,
      source: st.source,
      ...(age === undefined ? {} : { placement_age_days: age }),
    };
  }
  const graph: SkillGraph = {
    skills: Object.fromEntries(
      snap.skills.map((s) => [
        s.key,
        {
          node: s.node,
          module: s.module,
          est_minutes: s.estMinutes,
          tier_target: s.tierTarget as Tier,
          ...(s.confusableSet === null ? {} : { confusable_set: s.confusableSet }),
          status: s.status,
        },
      ]),
    ),
    edges: snap.edges.map((e) => ({
      from: e.from,
      to: e.to,
      strength: e.strength === "soft" ? ("soft" as const) : ("hard" as const),
      min_tier: e.minTier as Tier,
    })),
  };
  return { snap, skillByKey, stateByKey, retrievability, graph, snapshots };
}

const iso = (d: Date | null): string | null => (d === null ? null : d.toISOString());

function stateView(v: View, key: string): StateView {
  const st = v.stateByKey.get(key);
  if (!st) return { mastery_state: "unseen" };
  const r = v.retrievability.get(key);
  return {
    mastery_state: st.masteryState as StateView["mastery_state"],
    elo: st.elo,
    due: iso(st.due),
    retrievability: r === undefined ? null : r,
    reps: st.reps,
    lapses: st.lapses,
    tier_attained: st.tierAttained as NonNullable<StateView["tier_attained"]> | null,
  };
}

function toSkill(v: View, s: GraphSkillRow): Skill {
  return {
    key: s.key,
    node: s.node as Skill["node"],
    module: s.module,
    title: s.title,
    description: s.description,
    tier_target: s.tierTarget as Skill["tier_target"],
    est_minutes: s.estMinutes,
    license: s.license,
    source: s.source,
    status: s.status as Skill["status"],
    task_kinds: s.taskKinds as NonNullable<Skill["task_kinds"]>,
    grader_types: s.graderTypes as NonNullable<Skill["grader_types"]>,
    phone_suitable: s.phoneSuitable,
    confusable_set: s.confusableSet,
    state: stateView(v, s.key),
  };
}

const toEdge = (e: GraphEdgeRow): Edge => ({
  from_skill_key: e.from,
  to_skill_key: e.to,
  strength: e.strength as Edge["strength"],
  min_tier: e.minTier as Edge["min_tier"],
});

// ---------- cursor ----------

const encodeCursor = (key: string): string => Buffer.from(JSON.stringify({ k: key })).toString("base64url");

function decodeCursor(raw: string): string {
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { k?: unknown };
    if (typeof v.k === "string" && SKILL_KEY.test(v.k)) return v.k;
  } catch {
    // falls through to the validation error
  }
  throw bad("cursor", "is not a valid cursor");
}

// ---------- operations ----------

export async function listSkills(ctx: ApiContext, deps: GraphDeps = defaultGraphDeps()): Promise<Response> {
  const user = userId(ctx);
  const q = query(ctx, ["node", "module", "mastery_state", "limit", "cursor"]);
  const node = enumParam(q, "node", NODE_CODES);
  const masteryState = enumParam(q, "mastery_state", MASTERY_STATES);
  const moduleName = q.get("module");
  if (moduleName !== null && !/^[a-z0-9-]+$/.test(moduleName)) throw bad("module", "is not a module name");
  const limit = intParam(q, "limit", 1, 100, 25);
  const cursorRaw = q.get("cursor");
  const after = cursorRaw === null ? undefined : decodeCursor(cursorRaw);
  const v = await load(deps, user);
  const rows = v.snap.skills.filter(
    (s) =>
      (node === undefined || s.node === node) &&
      (moduleName === null || s.module === moduleName) &&
      (masteryState === undefined || (v.stateByKey.get(s.key)?.masteryState ?? "unseen") === masteryState) &&
      (after === undefined || s.key > after),
  );
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return json({ items: page.map((s) => toSkill(v, s)), next_cursor: rows.length > limit && last ? encodeCursor(last.key) : null });
}

export async function getSkill(ctx: ApiContext, deps: GraphDeps = defaultGraphDeps()): Promise<Response> {
  const user = userId(ctx);
  query(ctx, []);
  const key = ctx.params["skill_key"] ?? "";
  if (!SKILL_KEY.test(key)) throw new ApiError("not_found");
  const v = await load(deps, user);
  const skill = v.skillByKey.get(key);
  if (!skill) throw new ApiError("not_found");
  // FR-013: the unmet hard prerequisites, with their state, come from the scheduler's lockedReasons.
  const blocked = lockedReasons(v.graph, v.snapshots, key, deps.params, v.stateByKey.get(key)?.masteryState === "learning");
  const detail: SkillDetail = {
    ...toSkill(v, skill),
    prerequisites: v.snap.edges.filter((e) => e.to === key).map(toEdge),
    dependants: v.snap.edges.filter((e) => e.from === key).map(toEdge),
    available: skill.status !== "stub" && blocked.length === 0,
    blocked_by: blocked.map((b) => b.prerequisite),
  };
  return json(detail);
}

export async function getGraph(ctx: ApiContext, deps: GraphDeps = defaultGraphDeps()): Promise<Response> {
  const user = userId(ctx);
  const q = query(ctx, ["nodes", "include_stubs"]);
  const nodesRaw = q.get("nodes");
  let nodes: string[] | undefined;
  if (nodesRaw !== null) {
    nodes = nodesRaw.split(",");
    const unknown = nodes.find((n) => !NODE_CODES.includes(n));
    if (unknown !== undefined) throw bad("nodes", `unknown node code: ${unknown.slice(0, 20)}`);
  }
  const stubs = q.get("include_stubs");
  if (stubs !== null && stubs !== "true" && stubs !== "false") throw bad("include_stubs", "must be true or false");
  const v = await load(deps, user);
  const shown = v.snap.skills.filter((s) => (nodes === undefined || nodes.includes(s.node)) && (stubs === "true" || s.status !== "stub"));
  const keys = new Set(shown.map((s) => s.key));
  return json({
    nodes: shown.map((s) => toSkill(v, s)),
    edges: v.snap.edges.filter((e) => keys.has(e.from) && keys.has(e.to)).map(toEdge),
  });
}

export type LockedSkill = { skill_key: string; blocked_by: string[] };
export type FrontierView = Frontier & { locked: LockedSkill[] };

/**
 * The frontier with the data for FR-013: available skills (best first), skills in progress, and the
 * non-stub skills that are locked with their unmet prerequisite keys. The `locked` list is not part of the
 * `Frontier` response schema; `getFrontier` strips it and the UI reads the reasons from `getSkill.blocked_by`.
 */
export async function frontierView(deps: GraphDeps, user: string): Promise<FrontierView> {
  const v = await load(deps, user);
  const learning = Object.keys(v.snapshots).filter((k) => v.snapshots[k]?.mastery_state === "learning" && v.graph.skills[k]?.status !== "stub");
  const frontier = computeFrontier(v.graph, v.snapshots, deps.params).filter((k) => !learning.includes(k));
  const nodeMinutes: Record<string, number> = {};
  for (const s of v.snap.skills) {
    const ms = v.stateByKey.get(s.key)?.masteryState;
    if (ms === "mastered" || ms === "reviewing") nodeMinutes[s.node] = (nodeMinutes[s.node] ?? 0) + s.estMinutes;
  }
  const scored = frontierScores(v.graph, v.snapshots, frontier, {}, nodeMinutes, deps.params);
  const available = scored.map((sc) => {
    const hard = v.snap.edges.filter((e) => e.to === sc.key && e.strength === "hard").length;
    const reason = hard === 0 ? "no prerequisites" : `all ${hard} hard prerequisite${hard === 1 ? "" : "s"} satisfied`;
    return { skill_key: sc.key, reason };
  });
  const open = new Set([...frontier, ...learning]);
  const locked: LockedSkill[] = [];
  for (const s of v.snap.skills) {
    if (s.status === "stub" || open.has(s.key)) continue;
    const ms = v.stateByKey.get(s.key)?.masteryState ?? "unseen";
    if (ms !== "unseen") continue;
    const reasons = lockedReasons(v.graph, v.snapshots, s.key, deps.params);
    if (reasons.length > 0) locked.push({ skill_key: s.key, blocked_by: reasons.map((r) => r.prerequisite) });
  }
  return { available, in_progress: learning.sort(), locked };
}

export async function getFrontier(ctx: ApiContext, deps: GraphDeps = defaultGraphDeps()): Promise<Response> {
  const user = userId(ctx);
  query(ctx, []);
  const view = await frontierView(deps, user);
  return json({ available: view.available, in_progress: view.in_progress } satisfies Frontier);
}

export async function getReviewQueue(ctx: ApiContext, deps: GraphDeps = defaultGraphDeps()): Promise<Response> {
  const user = userId(ctx);
  const q = query(ctx, ["horizon_h"]);
  const horizonH = intParam(q, "horizon_h", 0, 168, 24);
  const v = await load(deps, user);
  const now = deps.now();
  const horizon = new Date(now.getTime() + horizonH * HOUR_MS);
  const rows = [...v.stateByKey.values()]
    .filter((st) => {
      const skill = v.skillByKey.get(st.skillKey);
      const inLoop = st.masteryState === "learning" && st.loopStep !== null && st.loopStep !== "done";
      return skill !== undefined && skill.status !== "stub" && st.due !== null && st.due <= horizon && CARD_STATES.includes(st.masteryState) && !inLoop;
    })
    .map((st) => ({ st, due: st.due as Date, r: v.retrievability.get(st.skillKey) }))
    // Most overdue first, then the weakest memory (lowest retrievability), then key for a stable order.
    .sort((a, b) => a.due.getTime() - b.due.getTime() || (a.r ?? 1) - (b.r ?? 1) || (a.st.skillKey < b.st.skillKey ? -1 : 1));
  const dueNow = rows.filter((x) => x.due <= now).length;
  const body: ReviewQueue = {
    now: now.toISOString(),
    due_now: dueNow,
    due_within_horizon: rows.length,
    estimated_minutes: dueNow * MINUTES_PER_REVIEW,
    items: rows.map((x) => ({
      skill_key: x.st.skillKey,
      due: x.due.toISOString(),
      retrievability: x.r === undefined ? null : x.r,
      mastery_state: x.st.masteryState as ReviewQueue["items"][number]["mastery_state"],
    })),
  };
  return json(body);
}
