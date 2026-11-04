// Item selection for a session task (BL-0045; doc 06 section 3.8, FR-031) and the same-day retrieval gap
// (FR-030, LS-006 / PRM-04). Pure: candidates and history are arguments; no I/O and no clock.
import { DEFAULT_PARAMS, targetItemDifficulty, type SchedulerParams } from "@polymath/scheduler";
import type { Candidate, ServedHistory } from "@/server/privileged/session-store";

const TIER_ORDER: readonly string[] = ["L0", "L1", "L2", "L3"];
/** 06 section 3.8 (2): answers of the last 5 items served for the skill are not served again. */
export const ANSWER_MEMORY = 5;
/** 06 section 3.8 (2): the template of the last 2 reviews is avoided when another qualifies. */
export const TEMPLATE_MEMORY = 2;

export type SelectContext = {
  /** The learner's Elo on the skill. */
  theta: number;
  /** skills.tier_target. */
  tierTarget: string;
  /** True while the skill is below `mastered`: reviews must then also count toward mastery. */
  belowMastered: boolean;
  history: ServedHistory;
};

const tierRank = (t: string): number => TIER_ORDER.indexOf(t);

/**
 * Picks one candidate of a skill and kind, or undefined when none is allowed.
 * Hard rules (never relaxed): the (template, seed) pair and the canonical answer of the last 5 served items
 * were not served before. Soft rules, each relaxed when it would leave nothing: tier >= tier_target while below
 * mastered; a template other than the last 2 used. Then the template whose difficulty is nearest
 * `targetItemDifficulty(theta)`, ties to the least recently used template, then the item id.
 */
export function selectItem(
  candidates: readonly Candidate[],
  ctx: SelectContext,
  params: SchedulerParams = DEFAULT_PARAMS,
): Candidate | undefined {
  const seeds = new Set(ctx.history.seeds);
  const answers = new Set(ctx.history.answers.slice(0, ANSWER_MEMORY));
  let pool = candidates.filter((c) => !seeds.has(`${c.templateKey}|${c.seed}`) && !(c.answer !== null && answers.has(c.answer)));
  if (ctx.belowMastered) {
    const floor = tierRank(ctx.tierTarget);
    const inTier = pool.filter((c) => tierRank(c.tier ?? ctx.tierTarget) >= floor);
    if (inTier.length > 0) pool = inTier;
  }
  const recent = new Set(ctx.history.templates.slice(0, TEMPLATE_MEMORY));
  const fresh = pool.filter((c) => !recent.has(c.templateKey));
  if (fresh.length > 0) pool = fresh;

  const want = targetItemDifficulty(ctx.theta, params);
  const key = (c: Candidate): [number, number, string] => [
    Math.abs(c.difficulty - want),
    c.lastUsed === null ? Number.NEGATIVE_INFINITY : c.lastUsed.getTime(),
    c.itemId,
  ];
  let best: Candidate | undefined;
  for (const c of pool) {
    if (best === undefined) best = c;
    else {
      const [a, b] = [key(c), key(best)];
      if (a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])))) best = c;
    }
  }
  return best;
}

type GapTask = { skill_key: string | null; task_kind: string; est_min: number; reason: string };

/** PRM-04: at least this many tasks, or this many minutes, between the faded problem and its retrieval. */
export const RETRIEVAL_GAP_TASKS = 3;
export const RETRIEVAL_GAP_MIN = 10;

/**
 * FR-030 / LS-006: a same-day retrieval that would follow its chunk (worked example or faded problem of the
 * same skill, this session) with fewer than 3 intervening tasks and under 10 minutes is left out. The skill's
 * loop_step stays `retrieval_same_day`, so the next session carries it. Returns the kept tasks, order unchanged.
 */
export function enforceRetrievalGap<T extends GapTask>(tasks: readonly T[]): T[] {
  return tasks.filter((t, i) => {
    if (t.reason !== "same_day_retrieval" || t.skill_key === null) return true;
    let chunkAt = -1;
    for (let j = i - 1; j >= 0; j -= 1) {
      const p = tasks[j];
      if (p && p.skill_key === t.skill_key && (p.task_kind === "faded_problem" || p.task_kind === "worked_example")) {
        chunkAt = j;
        break;
      }
    }
    if (chunkAt < 0) return true;
    const between = tasks.slice(chunkAt + 1, i);
    const minutes = between.reduce((s, x) => s + x.est_min, 0);
    return between.length >= RETRIEVAL_GAP_TASKS || minutes >= RETRIEVAL_GAP_MIN;
  });
}

/**
 * FR-034 / expertise reversal: a skill the learner brought in with placement evidence and has not started
 * the loop on skips the worked example (the faded problem is then the first step). Other tasks are kept.
 */
export function dropSkippedWorkedExamples<T extends GapTask>(
  tasks: readonly T[],
  states: Record<string, { source?: string | undefined; mastery_state?: string | undefined; loop_step?: string | null | undefined }>,
): T[] {
  return tasks.filter((t) => {
    if (t.task_kind !== "worked_example" || t.skill_key === null) return true;
    const s = states[t.skill_key];
    return !(s && s.source === "placement" && (s.mastery_state === "unseen" || s.mastery_state === "learning") && (s.loop_step ?? null) === null);
  });
}
