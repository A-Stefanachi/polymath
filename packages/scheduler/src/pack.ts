// Session packing, interleave stages, checkpoint status, stuck detection, trace-back and hint reliance
// (doc 06 sections 7 to 10; 00a A1, G1, G4). Ports reference/scheduler_reference.py; the shared vectors
// are the oracle. Pure: the graph, snapshots and parameters arrive as arguments.
//
// Call order inside packSession is fixed by BL-0037: checkpoint reservation, due reviews, continuation,
// applied_gap (rule b2, G2), new skills, interleaved practice, practice fill, due checkpoint, same-day
// retrievals. The applied_gap step is isolated in `addAppliedGap`; BL-0184 owns the `needs_applied`
// flag it reads from the state snapshot (the function that derives the flag stays in mastery).
import { computeAvailable, computeFrontier, frontierScores, prereqSatisfied, type StateMap } from "./frontier.ts";
import { DEFAULT_PARAMS, TASK_MINUTES, type SchedulerParams, type SessionType } from "./params.ts";
import type { GraphSkill, SkillGraph, SkillStateSnapshot } from "./types.ts";

/** Rounds to `digits` decimals on the exact binary value, like Python's round(x, n); normalises -0. */
function roundTo(x: number, digits: number): number {
  return Number(x.toFixed(digits)) + 0;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Kinds a phone can serve (06 section 8). A skill may narrow them with `phone_kinds`. */
export const PHONE_KINDS: readonly string[] = [
  "retrieval",
  "worked_example",
  "faded_problem",
  "perceptual_drill",
  "problem_short",
  "checkpoint",
];

const APPLIED_KINDS: ReadonlySet<string> = new Set(["problem", "debug_case", "checkpoint"]);

export type PackContext = "phone" | "desktop" | "bench";
export type CheckpointFlag = "none" | "due" | "overdue";

/** Skill snapshot as the session builder sees it: the learner state plus the loop fields of 06 section 7. */
export interface PackSkillState extends SkillStateSnapshot {
  /** Due by the end of the learner's local today. */
  readonly due?: boolean;
  readonly loop_step?: string | null;
  /** Set by trace-back (06 section 10); a blocked skill leaves continuation. */
  readonly blocked_by?: string | readonly string[] | null;
  /** The skill's only open mastery condition is the applied one (BL-0184 derives it). */
  readonly needs_applied?: boolean;
}

export type PackStateMap = Readonly<Record<string, PackSkillState>>;
type PackSkill = GraphSkill & { readonly phone_kinds?: readonly string[] };

export interface ProjectStepInput {
  readonly key: string;
  readonly skill_key?: string | null;
  readonly est_min: number;
  readonly session_type?: SessionType;
}

export interface PackInput {
  readonly available_minutes: number;
  readonly context: PackContext;
  readonly session_type: SessionType;
  readonly graph: SkillGraph;
  readonly states: PackStateMap;
  readonly checkpoint?: CheckpointFlag;
  readonly checkpoint_skills?: readonly string[];
  /** Module to interleave stage (0 blocked .. 3 whole module). */
  readonly interleave?: Readonly<Record<string, number>>;
  readonly project_pull?: Readonly<Record<string, number>>;
  readonly node_minutes?: Readonly<Record<string, number>>;
  /** Review backlog: reviews may use the whole budget. */
  readonly backlog?: boolean;
  /** Review backlog: no new skills. */
  readonly backlog_suspend_new?: boolean;
  /**
   * New frontier skills still allowed today (daily cap minus those already introduced, BL-0046, FR-024).
   * Continuations are not new skills and are not counted; absent means no daily cap.
   */
  readonly max_new_frontier?: number;
  readonly project_steps?: readonly ProjectStepInput[];
}

export interface PackedTask {
  readonly task_kind: string;
  readonly skill_key: string | null;
  readonly est_min: number;
  readonly reason: string;
  readonly position: number;
  readonly interleaved?: true;
  readonly strategy_prompt?: true;
  readonly step_key?: string;
}

export interface PackResult {
  readonly tasks: readonly PackedTask[];
  readonly total_est_min: number;
  readonly available_minutes: number;
  readonly fill: number;
  readonly fits: boolean;
  /** Present on a lab slot served as a focus session (00a G4). */
  readonly served_as?: "focus";
}

// --------------------------------------------------------------------------------------
// interleaving schedule (06 section 7.6)
// --------------------------------------------------------------------------------------

/**
 * Stage 0 blocked, 1 pairs, 2 triples, 3 whole module (max 5 skills). `eligibleSkills` counts the group's
 * skills in `reviewing` or `mastered`; `interleavedSets` holds recent interleaved-set accuracies, oldest first.
 */
export function interleaveStage(
  eligibleSkills: number,
  interleavedSets: readonly number[],
  currentStage: number,
  params: SchedulerParams = DEFAULT_PARAMS,
): number {
  if (eligibleSkills < 2) return 0;
  let stage = currentStage > 0 ? Math.max(currentStage, 1) : 1;
  const last = interleavedSets.length > 0 ? interleavedSets[interleavedSets.length - 1] : undefined;
  if (last !== undefined && last < params.interleave_regress_acc) return stage > 1 ? stage - 1 : 1;
  if (
    stage === 1 &&
    eligibleSkills >= 3 &&
    interleavedSets.length >= 2 &&
    interleavedSets.slice(-2).every((a) => a >= params.interleave_stage2_acc)
  ) {
    stage = 2;
  }
  if (
    stage === 2 &&
    eligibleSkills >= 4 &&
    interleavedSets.length >= 3 &&
    interleavedSets.slice(-3).every((a) => a >= params.interleave_stage3_acc)
  ) {
    stage = 3;
  }
  return stage;
}

/** Skills mixed per set at a stage. */
export function interleaveWidth(stage: number, eligibleSkills: number): number {
  if (eligibleSkills < 1) return 1;
  switch (stage) {
    case 0:
      return 1;
    case 1:
      return 2;
    case 2:
      return 3;
    default:
      return Math.min(eligibleSkills, 5);
  }
}

/** Deterministic order with no skill twice in a row when there are at least two skills. */
export function roundRobinOrder(skillKeys: readonly string[], nItems: number): string[] {
  if (skillKeys.length === 0) return [];
  return Array.from({ length: nItems }, (_, i) => skillKeys[i % skillKeys.length] as string);
}

// --------------------------------------------------------------------------------------
// time estimates and filters (06 section 8)
// --------------------------------------------------------------------------------------

/**
 * Minutes for one task. A personal ratio (actual over estimate) applies from 5 observations, clamped to
 * [0.6, 1.8]. A `project_step` takes its authored minutes.
 */
export function estimateMinutes(kind: string, personalRatio?: number | null, nObs = 0, stepMin?: number | null): number {
  const table = TASK_MINUTES[kind];
  const authored = kind === "project_step" && stepMin !== undefined && stepMin !== null ? stepMin : table;
  if (authored === undefined) throw new Error(`estimateMinutes: unknown task kind ${kind}`);
  let base = authored;
  if (personalRatio !== undefined && personalRatio !== null && nObs >= 5) {
    base *= Math.min(Math.max(personalRatio, 0.6), 1.8);
  }
  return roundTo(base, 2);
}

export function phoneSuitable(taskKind: string, skill: { readonly phone_kinds?: readonly string[] }): boolean {
  return (skill.phone_kinds ?? PHONE_KINDS).includes(taskKind);
}

/**
 * Window rule (00a A1, 06 section 7.1): there is no session type for 21 to 44 minutes. The window is one
 * `micro` session (at most 20 minutes) and, when time is left, an optional second `micro` session of the
 * remainder (a separate sessions row, built by a fresh packSession call).
 */
export function microWindow(availableMinutes: number): { first: number; chained: number | null } {
  const first = Math.min(availableMinutes, 20);
  const rest = availableMinutes - first;
  return { first, chained: rest > 0 ? Math.min(rest, 20) : null };
}

// --------------------------------------------------------------------------------------
// session packer (06 section 7)
// --------------------------------------------------------------------------------------

function truthyBlock(b: PackSkillState["blocked_by"]): boolean {
  return b !== undefined && b !== null && b.length > 0;
}

const REASON_RANK: Readonly<Record<string, number>> = {
  checkpoint_overdue: 0,
  due_review: 1,
  due_review_interleaved: 1,
  verify_inferred: 1,
  continue: 2,
  new_frontier: 2,
  applied_gap: 2,
  project_step: 2,
  practice: 3,
  interleaved_practice: 3,
  checkpoint_due: 3,
  lab_review: 4,
  same_day_retrieval: 5,
};

type DraftTask = Omit<PackedTask, "position">;

function finish(drafts: readonly DraftTask[], avail: number): PackResult {
  const ordered = drafts
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (REASON_RANK[a.t.reason] ?? 5) - (REASON_RANK[b.t.reason] ?? 5) || a.i - b.i)
    .map(({ t }, pos): PackedTask => ({ ...t, position: pos + 1 }));
  const total = roundTo(
    ordered.reduce((s, t) => s + t.est_min, 0),
    2,
  );
  return {
    tasks: ordered,
    total_est_min: total,
    available_minutes: avail,
    fill: roundTo(avail !== 0 ? total / avail : 0, 3),
    fits: total <= avail + 1e-9,
  };
}

/**
 * Greedy priority packer. Never returns more than `available_minutes` (micro: at most 20), and on a phone
 * only suitable kinds; on `bench` no cards. Throws for a state key missing from the graph (a data error).
 */
export function packSession(input: PackInput, params: SchedulerParams = DEFAULT_PARAMS): PackResult {
  const stype = input.session_type;
  const ctx = input.context;
  let avail = input.available_minutes;
  if (stype === "micro") avail = Math.min(avail, 20);
  const budget = avail * (1 - params.slack_fraction);
  const { graph, states } = input;
  const stateKeys = Object.keys(states);
  const drafts: DraftTask[] = [];
  let used = 0;

  const skillOf = (key: string): PackSkill => {
    const s = graph.skills[key];
    if (s === undefined) throw new Error(`packSession: state for unknown skill ${key}`);
    return s;
  };
  const retr = (k: string, dflt: number): number => states[k]?.retrievability ?? dflt;
  const fits = (m: number): boolean => used + m <= budget + 1e-9;
  const okCtx = (kind: string, key: string): boolean => {
    if (ctx === "phone") return phoneSuitable(kind, skillOf(key));
    return ctx !== "bench";
  };
  const add = (
    kind: string,
    key: string | null,
    reason: string,
    minutes?: number,
    extra: Partial<Pick<PackedTask, "interleaved" | "strategy_prompt" | "step_key">> = {},
  ): void => {
    const m = minutes ?? estimateMinutes(kind);
    drafts.push({ task_kind: kind, skill_key: key, est_min: m, reason, ...extra });
    used += m;
  };

  if (stype === "lab") {
    // 00a G4: no eligible project step => a focus session of practice tasks capped at lab_fallback_cap_min.
    const steps = input.project_steps ?? [];
    const labSteps = steps.filter((st) => (st.session_type ?? "lab") === "lab");
    if (!labSteps.some((st) => st.est_min <= budget + 1e-9)) {
      const out = packSession(
        {
          ...input,
          session_type: "focus",
          available_minutes: Math.min(input.available_minutes, params.lab_fallback_cap_min),
          project_steps: [],
        },
        params,
      );
      return { ...out, served_as: "focus" };
    }
    for (const st of labSteps) {
      if (fits(st.est_min)) add("project_step", st.skill_key ?? null, "project_step", st.est_min, { step_key: st.key });
    }
    const remCap = Math.min(10, budget * 0.1);
    const dueKeys = stateKeys.filter((k) => states[k]?.due === true).sort((a, b) => retr(a, 1) - retr(b, 1) || cmp(a, b));
    for (const key of dueKeys) {
      const m = estimateMinutes("retrieval");
      const spent = drafts.filter((t) => t.task_kind === "retrieval").reduce((s, t) => s + t.est_min, 0);
      if (used + m <= budget && spent + m <= remCap && ctx !== "bench") add("retrieval", key, "lab_review");
    }
    return finish(drafts, avail);
  }

  // Checkpoint: overdue is reserved first; due is appended at the end when there is room.
  const cp = input.checkpoint ?? "none";
  const cpItems = input.checkpoint_skills ?? [];
  if (cp === "overdue") {
    for (const key of cpItems) {
      if (okCtx("checkpoint", key) && fits(estimateMinutes("checkpoint"))) add("checkpoint", key, "checkpoint_overdue");
    }
  }

  // (a) due reviews, lowest retrievability first, capped by max_review_share unless there is a backlog.
  const cap = input.backlog === true ? budget : budget * params.max_review_share;
  // A placed skill has no FSRS card until its first verification (06 section 3), so it is never `due` by date.
  const placed = new Set(stateKeys.filter((k) => states[k]?.mastery_state === "reviewing" && states[k]?.loop_step === "verify"));
  const due = stateKeys
    .filter((k) => states[k]?.due === true || placed.has(k))
    .sort((a, b) => (states[a]?.retrievability ?? 0) - (states[b]?.retrievability ?? 0) || cmp(a, b));
  let reviewUsed = 0;
  const bySet = new Map<string, { mod: string; set: string; keys: string[] }>();
  for (const k of due) {
    const sk = skillOf(k);
    if (sk.confusable_set !== undefined && sk.confusable_set !== "") {
      // 06 section 7.6 (F-13): an untagged skill is never interleaved.
      const id = JSON.stringify([sk.module, sk.confusable_set]);
      const g = bySet.get(id) ?? { mod: sk.module, set: sk.confusable_set, keys: [] };
      g.keys.push(k);
      bySet.set(id, g);
    }
  }
  const doneKeys = new Set<string>();
  for (const g of [...bySet.values()].sort((a, b) => cmp(a.mod, b.mod) || cmp(a.set, b.set))) {
    const stage = input.interleave?.[g.mod] ?? 0;
    if (
      stage >= 1 &&
      ctx !== "bench" && // the oracle lets interleaved reviews through on bench; bench has no cards (06 section 7)
      g.keys.length >= 2 &&
      g.keys.every((k) => ctx !== "phone" || phoneSuitable("problem_short", skillOf(k)))
    ) {
      const grp = g.keys.slice(0, interleaveWidth(stage, g.keys.length));
      const order = roundRobinOrder(grp, Math.max(4, 2 * grp.length));
      const m = estimateMinutes("problem_short");
      if (reviewUsed + m * order.length <= cap && fits(m * order.length)) {
        for (const k of order) add("problem", k, "due_review_interleaved", m, { interleaved: true, strategy_prompt: true });
        reviewUsed += m * order.length;
        for (const k of grp) doneKeys.add(k);
      }
    }
  }
  for (const k of due) {
    if (doneKeys.has(k)) continue;
    const m = estimateMinutes("retrieval");
    if (okCtx("retrieval", k) && reviewUsed + m <= cap && fits(m)) {
      add("retrieval", k, "due_review", m);
      reviewUsed += m;
    }
  }

  // (b) continuation of in-progress skills, (c) new frontier skills
  let skillSlots = params.max_new_skills[stype];
  const sameDayRetrievals: string[] = [];
  const decayedHardPrereq = (k: string): boolean =>
    graph.edges.some(
      (e) =>
        e.strength === "hard" &&
        e.to === k &&
        states[e.from]?.mastery_state === "decayed" &&
        (states[e.from]?.retrievability ?? 0) < params.continue_r_threshold,
    ); // 06 section 4.3
  const inProg = stateKeys
    .filter((k) => {
      const s = states[k];
      return (
        s?.mastery_state === "learning" &&
        s.loop_step !== undefined &&
        s.loop_step !== null &&
        s.loop_step !== "done" &&
        !truthyBlock(s.blocked_by) && // 06 section 10: trace-back removes a blocked skill from continuation
        !decayedHardPrereq(k)
      );
    })
    .sort(cmp);
  const practiceKind = ctx === "phone" ? "problem_short" : "problem";
  const loopSeq = (step: string, newSkill: boolean): string[] => {
    const fadedN = stype === "focus" && newSkill ? 2 : 1;
    switch (step) {
      case "worked_example":
        return ["worked_example", ...Array<string>(fadedN).fill("faded_problem")];
      case "faded_problem":
        return ["faded_problem"];
      case "practice":
        return [practiceKind];
      case "verify":
        return ["retrieval"];
      default:
        return [];
    }
  };

  let verifyCap = 4;
  for (const k of inProg) {
    const step = states[k]?.loop_step as string;
    if (step === "verify") {
      if (verifyCap > 0 && okCtx("retrieval", k) && fits(estimateMinutes("retrieval"))) {
        add("retrieval", k, "verify_inferred");
        verifyCap -= 1;
      }
      continue;
    }
    if (skillSlots <= 0) break;
    const seq = loopSeq(step, false);
    const need = seq.reduce((s, x) => s + estimateMinutes(x), 0) + (step !== "practice" ? estimateMinutes("retrieval") : 0);
    if (seq.length > 0 && seq.every((x) => okCtx(x, k)) && fits(need)) {
      for (const x of seq) add(x, k, x !== practiceKind ? "continue" : "practice");
      if (step !== "practice") sameDayRetrievals.push(k);
      skillSlots -= 1;
    } else if (step === "retrieval_same_day" && okCtx("retrieval", k) && fits(estimateMinutes("retrieval"))) {
      add("retrieval", k, "same_day_retrieval");
    }
  }

  addAppliedGap();

  if (skillSlots > 0 && input.backlog_suspend_new !== true) {
    const fr = computeFrontier(graph, states, params);
    const ranked = frontierScores(graph, states, fr, input.project_pull ?? {}, input.node_minutes ?? {}, params);
    const inProgSet = new Set(inProg);
    let dailyLeft = input.max_new_frontier ?? Number.POSITIVE_INFINITY;
    for (const r of ranked) {
      const k = r.key;
      if (inProgSet.has(k) || skillSlots <= 0 || dailyLeft <= 0 || truthyBlock(states[k]?.blocked_by)) continue;
      for (const seq of [loopSeq("worked_example", true), loopSeq("worked_example", false)]) {
        const need = seq.reduce((s, x) => s + estimateMinutes(x), 0) + estimateMinutes("retrieval");
        if (seq.every((x) => okCtx(x, k)) && fits(need)) {
          for (const x of seq) add(x, k, "new_frontier");
          sameDayRetrievals.push(k);
          skillSlots -= 1;
          dailyLeft -= 1;
          break;
        }
      }
    }
  }

  // (d) interleaved practice among confusable skills of one module (not already used above)
  const usedMods = new Set(
    drafts.filter((t) => t.interleaved === true && t.skill_key !== null).map((t) => skillOf(t.skill_key as string).module),
  );
  for (const [mod, stage] of Object.entries(input.interleave ?? {}).sort(([a], [b]) => cmp(a, b))) {
    if (stage < 1 || usedMods.has(mod)) continue;
    const elig = stateKeys
      .filter((k) => {
        const sk = skillOf(k);
        const ms = states[k]?.mastery_state;
        return sk.module === mod && !!sk.confusable_set && (ms === "reviewing" || ms === "mastered");
      })
      .sort((a, b) => retr(a, 1) - retr(b, 1) || cmp(a, b));
    const first = elig[0];
    if (first === undefined || elig.length < 2) continue;
    const oneSet = elig.filter((k) => skillOf(k).confusable_set === skillOf(first).confusable_set);
    if (oneSet.length < 2) continue;
    const grp = oneSet.slice(0, interleaveWidth(stage, oneSet.length));
    const m = estimateMinutes("problem_short");
    if (!grp.every((k) => okCtx("problem_short", k))) continue;
    const order = roundRobinOrder(grp, Math.max(4, 2 * grp.length));
    if (fits(m * order.length + estimateMinutes("retrieval") * sameDayRetrievals.length)) {
      for (const k of order) add("problem", k, "interleaved_practice", m, { interleaved: true, strategy_prompt: true });
    }
  }

  // (b') practice fill (focus only): extra standard problems on skills still being learned
  if (stype === "focus") {
    const available = new Set(computeAvailable(graph, states as StateMap, stateKeys, params));
    const learners = stateKeys
      .filter((k) => {
        const ms = states[k]?.mastery_state;
        return (ms === "learning" || ms === "reviewing") && available.has(k);
      })
      .sort((a, b) => retr(a, 1) - retr(b, 1) || cmp(a, b));
    const counts = new Map(learners.map((k) => [k, drafts.some((t) => t.skill_key === k && t.reason === "applied_gap") ? 1 : 0]));
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const k of learners) {
        const m = estimateMinutes("problem");
        if (
          (counts.get(k) ?? 0) < params.practice_fill_max_per_skill &&
          okCtx("problem", k) &&
          fits(m + estimateMinutes("retrieval") * sameDayRetrievals.length)
        ) {
          add("problem", k, "practice", m);
          counts.set(k, (counts.get(k) ?? 0) + 1);
          progressed = true;
        }
      }
    }
  }

  // (e) due (not overdue) checkpoint if there is room
  if (cp === "due") {
    for (const key of cpItems) {
      if (okCtx("checkpoint", key) && fits(estimateMinutes("checkpoint"))) add("checkpoint", key, "checkpoint_due");
    }
  }

  // same-day retrieval for skills that got a faded problem this session: last tasks
  for (const k of sameDayRetrievals) {
    const m = estimateMinutes("retrieval");
    if (okCtx("retrieval", k) && fits(m)) add("retrieval", k, "same_day_retrieval", m);
  }
  return finish(drafts, avail);

  /**
   * (b2) applied-gap (design review 00f F-01): a `reviewing` skill whose only open mastery condition is the
   * applied one counts as in progress and gets one `problem`, without using a new-skill slot. Ranked by hard
   * dependents (what it unblocks), then key. Reads the caller's `needs_applied` flag (BL-0184 derives it).
   */
  function addAppliedGap(): void {
    let gapSlots = params.applied_gap_max[stype];
    if (gapSlots <= 0) return;
    const nDep = new Map<string, number>();
    for (const e of graph.edges) if (e.strength === "hard") nDep.set(e.from, (nDep.get(e.from) ?? 0) + 1);
    const gapKeys = stateKeys
      .filter(
        (k) =>
          states[k]?.mastery_state === "reviewing" &&
          states[k]?.needs_applied === true &&
          !drafts.some((t) => t.skill_key === k && APPLIED_KINDS.has(t.task_kind)),
      )
      .sort((a, b) => (nDep.get(b) ?? 0) - (nDep.get(a) ?? 0) || cmp(a, b));
    for (const k of gapKeys) {
      if (gapSlots <= 0) break;
      const m = estimateMinutes(practiceKind);
      if (okCtx(practiceKind, k) && fits(m)) {
        add("problem", k, "applied_gap", m);
        gapSlots -= 1;
      }
    }
  }
}

// --------------------------------------------------------------------------------------
// checkpoint scheduling (06 section 9)
// --------------------------------------------------------------------------------------

export interface CheckpointStatus {
  readonly status: CheckpointFlag;
  readonly module_checkpoints: string[];
}

/**
 * Global: due at >= checkpoint_reserve_after_days (12), overdue at >= checkpoint_interval_days (14). A learner
 * who never took one passes `null` only once at least 5 skills are reviewing or mastered. Module: the fraction
 * of the module's skills in {reviewing, mastered} is >= 0.8 and no module checkpoint in the last 7 days.
 */
export function checkpointStatus(
  daysSinceLast: number | null | undefined,
  moduleFractionReady: Readonly<Record<string, number>>,
  daysSinceModule: Readonly<Record<string, number | null | undefined>>,
  params: SchedulerParams = DEFAULT_PARAMS,
): CheckpointStatus {
  let status: CheckpointFlag = "none";
  if (daysSinceLast !== undefined && daysSinceLast !== null) {
    if (daysSinceLast >= params.checkpoint_interval_days) status = "overdue";
    else if (daysSinceLast >= params.checkpoint_reserve_after_days) status = "due";
  }
  const mods = Object.entries(moduleFractionReady)
    .filter(([m, f]) => {
      const d = daysSinceModule[m];
      return f >= params.module_checkpoint_fraction && (d === undefined || d === null || d >= 7);
    })
    .map(([m]) => m)
    .sort(cmp);
  if (mods.length > 0 && status === "none") status = "due";
  return { status, module_checkpoints: mods };
}

// --------------------------------------------------------------------------------------
// stuck detection, trace-back, hint reliance (06 section 10)
// --------------------------------------------------------------------------------------

export interface RecentAttempt {
  readonly item_id?: string;
  readonly score: number;
  readonly max_hint_level?: number;
  readonly submitted_at?: string;
}

export interface StuckResult {
  readonly stuck: boolean;
  readonly reason: "consecutive_fails" | "reveals" | null;
}

/**
 * `recent` is chronological. Stuck when (a) the last 3 attempts all failed (score < 0.5 or a hint-4 reveal),
 * across at least 2 distinct items and 2 distinct days, or (b) at least 2 of the last 4 are hint-4 reveals.
 */
export function isStuck(recent: readonly RecentAttempt[], params: SchedulerParams = DEFAULT_PARAMS): StuckResult {
  const n = params.stuck_consecutive_fails;
  const last = recent.slice(-n);
  const a =
    last.length === n &&
    last.every((x) => x.score < params.fail_threshold || (x.max_hint_level ?? 0) >= 4) &&
    new Set(last.map((x) => x.item_id)).size >= 2 &&
    new Set(last.map((x) => (x.submitted_at ?? "").slice(0, 10))).size >= 2;
  const b = recent.slice(-4).filter((x) => (x.max_hint_level ?? 0) >= 4).length >= params.stuck_reveals_in_last4;
  return { stuck: a || b, reason: a ? "consecutive_fails" : b ? "reveals" : null };
}

export interface TraceResult {
  readonly skill: string;
  readonly status: "probe_needed" | "skill_specific" | "blocked";
  readonly blocked_by: string[];
  readonly chain: string[];
  readonly probe?: string[];
  readonly action?: "restart_loop_at_worked_example";
  readonly flag_content_review?: true;
  readonly source?: "state" | "probe";
  readonly mark_decayed?: string[];
  readonly prioritise?: string[];
}

/**
 * Explicit trace rule (06 section 10). Direct hard prerequisites that are not satisfied are suspects; with no
 * suspect, up to 4 prerequisites (lowest Elo first) are probed with one unaided retrieval, the scores arriving
 * in `probeResults` (a missing one yields `probe_needed`). A prerequisite is faulty if suspect or probed below
 * fail_threshold; blocked chains recurse to trace_max_depth.
 */
export function traceBack(
  graph: SkillGraph,
  states: StateMap,
  skillKey: string,
  probeResults: Readonly<Record<string, number>> = {},
  depth = 0,
  params: SchedulerParams = DEFAULT_PARAMS,
): TraceResult {
  const hard = graph.edges
    .filter((e) => e.to === skillKey && e.strength === "hard")
    .map((e) => e.from)
    .sort(cmp);
  const suspects = hard.filter((p) => !prereqSatisfied(states[p] ?? {}, { min_tier: null }, false, params));
  let faulty: string[];
  let source: "state" | "probe";
  if (suspects.length > 0) {
    faulty = suspects;
    source = "state";
  } else {
    const need = [...hard].sort((x, y) => (states[x]?.elo ?? 1300) - (states[y]?.elo ?? 1300) || cmp(x, y)).slice(0, 4);
    if (need.some((p) => probeResults[p] === undefined)) {
      return { skill: skillKey, status: "probe_needed", probe: need, blocked_by: [], chain: [] };
    }
    faulty = need.filter((p) => (probeResults[p] as number) < params.fail_threshold);
    source = "probe";
  }
  if (faulty.length === 0) {
    return {
      skill: skillKey,
      status: "skill_specific",
      action: "restart_loop_at_worked_example",
      flag_content_review: true,
      blocked_by: [],
      chain: [],
    };
  }
  const chain = new Set<string>(faulty);
  if (depth + 1 < params.trace_max_depth) {
    for (const p of faulty) {
      const sub = traceBack(graph, states, p, probeResults, depth + 1, params);
      if (sub.status === "blocked") for (const c of sub.chain) chain.add(c);
    }
  }
  return {
    skill: skillKey,
    status: "blocked",
    source,
    blocked_by: faulty,
    chain: [...chain].sort(cmp),
    mark_decayed: faulty.filter((p) => states[p]?.mastery_state === "mastered"),
    prioritise: faulty.filter((p) => states[p]?.mastery_state !== "mastered"),
  };
}

/** Share of the last `window` attempts that used hint level 2 or more; flagged above `threshold` from 8 attempts. */
export function hintReliance(
  recent: readonly RecentAttempt[],
  window = 20,
  threshold = 0.5,
): { rate: number; flag: boolean } {
  const last = recent.slice(-window);
  if (last.length === 0) return { rate: 0, flag: false };
  const rate = last.filter((a) => (a.max_hint_level ?? 0) >= 2).length / last.length;
  return { rate: roundTo(rate, 4), flag: last.length >= 8 && rate > threshold };
}
