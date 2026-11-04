// Learner-state transaction (BL-0042; doc 06 sections 3.3, 3.4, 4 and 5; 00a H15, B3). The only
// writer of skill_state and review_log besides its session-close twin (CLAUDE.md rule 2.8).
//
// Two entry points, one transaction each:
//  - applyGradedAttempt, once per graded attempt: compare-and-set of attempts.state_applied_at, then
//    Elo, n_attempts, mastery state, tier and loop_step. An attempt with no session is its own review
//    unit and also runs FSRS and writes its review_log row in the same transaction (06 section 3.3).
//  - commitSessionReviews, at session close: one FSRS review and one review_log row per skill from the
//    session's applied attempts (review_log_session_skill_unique makes it idempotent).
// Not graded attempts are ignored and left unstamped, so a later grade can still be applied.
// Time is the `now` argument; the database clock is never read for state.
import {
  FSRS_MODEL,
  REVIEW_KINDS,
  aggregateAttempts,
  createFsrsAdapter,
  fromSkillStateColumns,
  isQualifying,
  mapRating,
  masteryRule,
  masteryState,
  tierAttained,
  toSkillStateColumns,
  updateElo,
  type EloAttempt,
  type FsrsCard,
  type FsrsPort,
  type MasteryAttempt,
} from "@polymath/scheduler";
import { DEFAULT_PARAMS, type AttemptSnapshot, type SchedulerParams } from "./scheduler-params.ts";
import { checkEvent } from "@/lib/events/emit.ts";
import { privilegedDb } from "@/server/privileged/db";
import {
  createStateStore,
  type ClaimedAttempt,
  type HistoryAttempt,
  type SkillRow,
  type StateStore,
  type StateTx,
  type UnitAttempt,
} from "@/server/privileged/state-store";

export type SkillUpdate = {
  skill_key: string;
  mastery_state: string;
  /** Null until a review unit commits (docs/06 section 3.3). */
  rating: 1 | 2 | 3 | 4 | null;
  next_due: string | null;
  tier_attained: string | null;
};

export type ApplyResult =
  | { applied: false; reason: "not_found" | "not_graded" | "already_applied" | "not_mastery_eligible" }
  | { applied: true; skillUpdate: SkillUpdate };

export type StateDeps = { store: StateStore; fsrs: FsrsPort; params: SchedulerParams };

let sharedFsrs: Promise<FsrsPort> | undefined;
/** One adapter per process (the model is pure and has no per-user state). */
export const sharedFsrsPort = (): Promise<FsrsPort> => (sharedFsrs ??= createFsrsAdapter());

export async function defaultStateDeps(): Promise<StateDeps> {
  return { store: createStateStore(privilegedDb()), fsrs: await sharedFsrsPort(), params: DEFAULT_PARAMS };
}

type Tier = "L0" | "L1" | "L2" | "L3";
const TIER_ORDER: readonly string[] = ["L0", "L1", "L2", "L3"];
const MS_PER_DAY = 86_400_000;
const FSRS_PARAMS_VERSION = `${FSRS_MODEL}/default`;

/** Offset of `timezone` from UTC in minutes at instant `at`; an unknown zone counts as UTC. */
export function tzOffsetMinutes(timezone: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).formatToParts(at);
    const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
  } catch {
    return 0;
  }
}

/**
 * The scheduler functions count days on the UTC date of `submitted_at`. Shifting each timestamp by the
 * learner's offset at that instant makes the UTC date the learner-local date (06 section 4.1).
 */
function toMasteryAttempt(a: HistoryAttempt, timezone: string): MasteryAttempt {
  const shifted = new Date(a.submittedAt.getTime() + tzOffsetMinutes(timezone, a.submittedAt) * 60_000);
  return {
    item_id: a.itemId,
    template_key: a.templateKey,
    item_tier: a.itemTier as Tier,
    task_kind: a.taskKind,
    grader_type: a.graderType,
    score: a.score,
    max_hint_level: a.maxHintLevel,
    unaided: a.unaided,
    submitted_at: shifted.toISOString(),
    verified: a.verified,
  };
}

function snapshot(a: UnitAttempt): AttemptSnapshot {
  return {
    task_kind: a.taskKind,
    grader_type: a.graderType,
    score: a.score,
    max_hint_level: a.maxHintLevel,
    template_n_obs: a.templateNObs,
    ...(a.confidence === null ? {} : { confidence: a.confidence }),
    ...(a.latencyMs === null ? {} : { latency_ms: a.latencyMs }),
    ...(a.expectedMs === null ? {} : { expected_ms: a.expectedMs }),
  };
}

function eloAttempt(a: ClaimedAttempt, templateNObs: number): EloAttempt {
  return {
    task_kind: a.taskKind,
    score: a.score,
    max_hint_level: a.maxHintLevel,
    unaided: a.unaided,
    grader_type: a.graderType,
    template_n_obs: templateNObs,
    confidence: a.confidence,
    latency_ms: a.latencyMs,
    expected_ms: a.expectedMs,
  };
}

const asUnit = (a: ClaimedAttempt, templateNObs: number): UnitAttempt => ({
  id: a.id,
  itemId: a.itemId,
  templateKey: a.templateKey,
  itemTier: a.itemTier,
  taskKind: a.taskKind,
  graderType: a.graderType,
  score: a.score,
  maxHintLevel: a.maxHintLevel,
  unaided: a.unaided,
  verified: a.verified,
  submittedAt: a.submittedAt,
  confidence: a.confidence,
  latencyMs: a.latencyMs,
  expectedMs: a.expectedMs,
  templateNObs,
});

type Ctx = { tx: StateTx; deps: StateDeps; userId: string; skillKey: string; now: Date; timezone: string };
type Review = { rating: 1 | 2 | 3 | 4 };

/** One review unit: FSRS review of the skill card and the review_log row. Null when no review is due. */
async function commitUnit(ctx: Ctx, skill: SkillRow, unit: readonly UnitAttempt[], sessionId: string | null): Promise<Review | null> {
  const { tx, deps, userId, skillKey, now } = ctx;
  const last = unit[unit.length - 1];
  if (last === undefined) return null;
  if (sessionId !== null && (await tx.sessionReviewed(sessionId, skillKey))) return null;
  // The unit is dated by its last attempt, so a late close does not move it to another day (06 3.3).
  const reviewedAt = last.submittedAt.getTime() > now.getTime() ? now : last.submittedAt;
  if (await tx.reviewedSameLocalDay(userId, skillKey, reviewedAt, ctx.timezone)) return null;

  const agg = aggregateAttempts(unit.map(snapshot));
  const { rating, flags } = mapRating(agg, skill.reps, deps.params);
  if (rating === null) return null;
  const ratioMissing = (agg.template_n_obs ?? 0) < deps.params.latency_min_obs && agg.latency_ms !== undefined;
  const allFlags = ratioMissing ? [...flags, "latency_rows_ignored"] : [...flags];

  const isNew = skill.fsrsState === 0 && skill.lastReview === null && skill.due === null;
  const card: FsrsCard = isNew
    ? deps.fsrs.newCard(reviewedAt)
    : fromSkillStateColumns({
        stability: skill.stability,
        difficulty: skill.difficulty,
        due: (skill.due ?? reviewedAt).toISOString(),
        last_review: skill.lastReview === null ? null : skill.lastReview.toISOString(),
        reps: skill.reps,
        lapses: skill.lapses,
        fsrs_state: skill.fsrsState as 0 | 1 | 2 | 3,
        scheduled_days: skill.scheduledDays,
        learning_steps: skill.learningSteps,
        fsrs_extra: skill.fsrsExtra,
      });
  const stateBefore = skill.fsrsState;
  const predicted = deps.fsrs.retrievability(card, reviewedAt);
  const out = await deps.fsrs.review(card, rating, reviewedAt);
  const cols = toSkillStateColumns(out.card, out.log);

  skill.stability = cols.stability;
  skill.difficulty = cols.difficulty;
  skill.due = new Date(cols.due);
  skill.lastReview = cols.last_review === null ? null : new Date(cols.last_review);
  skill.reps = cols.reps;
  skill.lapses = cols.lapses;
  skill.fsrsState = cols.fsrs_state;
  skill.elapsedDays = cols.elapsed_days;
  skill.scheduledDays = cols.scheduled_days;
  skill.learningSteps = cols.learning_steps;
  skill.fsrsExtra = { ...cols.fsrs_extra };

  await tx.insertReview({
    userId,
    skillKey,
    attemptId: last.id,
    attemptIds: unit.map((u) => u.id),
    sessionId,
    rating,
    reviewedAt,
    elapsedDays: out.log.elapsed_days,
    scheduledDays: out.log.scheduled_days,
    stateBefore,
    stabilityAfter: cols.stability,
    difficultyAfter: cols.difficulty,
    dueAfter: skill.due,
    paramsVersion: FSRS_PARAMS_VERSION,
    flags: allFlags,
  });
  await tx.events([
    {
      userId,
      name: "review_scheduled",
      props: checkEvent("review_scheduled", {
        skill_key: skillKey,
        due: cols.due,
        stability: cols.stability,
        difficulty: cols.difficulty,
        predicted_retrievability: predicted,
      }),
    },
  ]);
  return { rating };
}

/** Loop-step moves (06 section 7.4 "Loop-step transitions"); it moves forward except the decay reset. */
function nextLoopStep(
  step: string | null,
  trigger: { kind: string; score: number } | null,
  state: string,
  priorRating: number | null,
  params: SchedulerParams,
): string | null {
  let s = step;
  if (trigger) {
    const { kind } = trigger;
    if (kind === "worked_example" && (s === null || s === "worked_example")) s = "faded_problem";
    else if (kind === "faded_problem" && (s === null || s === "worked_example" || s === "faded_problem")) s = "retrieval_same_day";
    else if (kind === "retrieval" && s === "retrieval_same_day") s = "practice";
    else if (kind === "problem" && s === "practice") s = "done";
    // A relearning retrieval that fails twice in a row sends a decayed skill back to the worked example.
    if (state === "decayed" && trigger.score < params.fail_threshold && priorRating === 1) s = "worked_example";
  }
  if ((state === "reviewing" || state === "mastered") && (s === "practice" || s === "verify")) s = "done";
  return s;
}

/**
 * Re-derives mastery state, tier and loop_step after new evidence (06 sections 4.3 and 4.6) and returns the
 * skill_state_changed event rows. `at` dates a decay (the triggering attempt), `lastRating` is the rating that
 * decides the "last rating was 1" clause.
 */
async function settle(
  ctx: Ctx,
  skill: SkillRow,
  at: Date,
  lastRating: number | null,
  priorRating: number | null,
  trigger: { kind: string; score: number } | null,
): Promise<void> {
  const { tx, deps, userId, skillKey, now } = ctx;
  const { params } = deps;
  const [history, stats, lapses] = await Promise.all([
    tx.history(userId, skillKey, skill.epochStart),
    tx.templateStats(skillKey),
    tx.lapsesSince(userId, skillKey, new Date(now.getTime() - 60 * MS_PER_DAY)),
  ]);
  const attempts = history.map((h) => toMasteryAttempt(h, ctx.timezone));
  const tier = skill.tierTarget as Tier;
  const neverReviewed = skill.fsrsState === 0 && skill.lastReview === null;
  const retrievability = neverReviewed
    ? null
    : deps.fsrs.retrievability(
        fromSkillStateColumns({
          stability: skill.stability,
          difficulty: skill.difficulty,
          due: (skill.due ?? now).toISOString(),
          last_review: skill.lastReview === null ? null : skill.lastReview.toISOString(),
          reps: skill.reps,
          lapses: skill.lapses,
          fsrs_state: skill.fsrsState as 0 | 1 | 2 | 3,
          scheduled_days: skill.scheduledDays,
          learning_steps: skill.learningSteps,
          fsrs_extra: skill.fsrsExtra,
        }),
        now,
      );
  const prev = skill.masteryState;
  const decayedAtRaw = skill.masteryEvidence["decayed_at"];
  const decayedAt = prev === "decayed" && typeof decayedAtRaw === "string" ? Date.parse(decayedAtRaw) : null;
  const postDecay =
    decayedAt === null
      ? []
      : history.filter((h) => h.submittedAt.getTime() > decayedAt).map((h) => toMasteryAttempt(h, ctx.timezone));
  const opts = { hasNonMc: stats.hasNonMc, hasApplied: stats.hasApplied, nVerifiedTemplates: stats.nVerified, params };

  const state = masteryState({
    attempts,
    tier,
    retrievability,
    everMastered: skill.everMastered,
    lastRating,
    recentLapses60d: lapses,
    postDecayAttempts: postDecay,
    ...opts,
  });

  const rule = masteryRule(attempts, tier, opts);
  const evidence: Record<string, unknown> = {
    ...skill.masteryEvidence,
    qualifying_count: rule.qualifying,
    days: rule.days,
    variants: rule.variants,
    checks: rule.checks,
  };
  if (state === "mastered" && !skill.everMastered) skill.everMastered = true;
  if (state === "mastered" && prev !== "mastered") skill.masteredAt = now;
  if (state === "decayed") {
    if (prev !== "decayed") {
      evidence["decayed_at"] = at.toISOString();
      // A decayed skill is due now (06 section 4.3, FR-044).
      if (skill.due === null || skill.due.getTime() > now.getTime()) skill.due = now;
    }
  } else {
    delete evidence["decayed_at"];
  }
  skill.masteryEvidence = evidence;
  skill.masteryState = state;

  const q0 = attempts.filter((a) => isQualifying(a, "L0", params)).map((a) => Date.parse(a.submitted_at));
  const attained = tierAttained({
    attempts,
    checkpointOk: attempts.some((a) => a.task_kind === "checkpoint" && isQualifying(a, "L2", params)),
    spanDays: q0.length === 0 ? 0 : (Math.max(...q0) - Math.min(...q0)) / MS_PER_DAY,
    ...opts,
  });
  // Tiers only ever increase automatically, and decay never erases one (06 section 4.6).
  if (attained !== null && TIER_ORDER.indexOf(attained) > TIER_ORDER.indexOf(skill.tierAttained ?? "")) {
    skill.tierAttained = attained;
  }
  skill.loopStep = nextLoopStep(skill.loopStep, trigger, state, priorRating, params);

  if (state !== prev) {
    const reason =
      state === "mastered" ? (prev === "decayed" ? "remastered" : "rule_met") : state === "decayed" ? "decay" : "progress";
    await tx.events([
      {
        userId,
        name: "skill_state_changed",
        props: checkEvent("skill_state_changed", { skill_key: skillKey, from_state: prev, to_state: state, reason }),
      },
    ]);
  }
}

const toSkillUpdate = (skillKey: string, s: SkillRow, rating: 1 | 2 | 3 | 4 | null): SkillUpdate => ({
  skill_key: skillKey,
  mastery_state: s.masteryState,
  rating,
  next_due: s.due === null ? null : s.due.toISOString(),
  tier_attained: s.tierAttained,
});

/**
 * Applies one graded attempt to the learner state (06 section 3.3 step 1). Idempotent per attempt: the
 * compare-and-set on `state_applied_at` makes a second call, or a concurrent one, write nothing.
 * Attempts that are not graded, or not mastery-eligible (an uncalibrated rubric grade), change nothing
 * but the second is stamped so reconcile never returns to it.
 */
export async function applyGradedAttempt(attemptId: string, now: Date, deps: StateDeps): Promise<ApplyResult> {
  return deps.store.run(async (tx) => {
    const claim = await tx.claim(attemptId, now);
    if (claim.kind === "skipped") return { applied: false, reason: claim.reason };
    const a = claim.attempt;
    if (!a.masteryEligible) return { applied: false, reason: "not_mastery_eligible" };
    const { params } = deps;
    const timezone = await tx.profileTimezone(a.userId);
    const ctx: Ctx = { tx, deps, userId: a.userId, skillKey: a.skillKey, now, timezone };
    const skill = await tx.lockSkill(a.userId, a.skillKey, params.elo_init_default);

    // Elo on the learner and on the template difficulty (06 section 5.4); worked examples weigh 0.
    const template = await tx.lockTemplate(a.templateKey, a.templateVersion);
    const nObs = template?.nObs ?? 0;
    const guess = a.graderType === "multiple_choice" && a.mcOptions !== null && a.mcOptions > 0 ? 1 / a.mcOptions : 0;
    const elo = updateElo(
      skill.elo,
      skill.nAttempts,
      template?.difficulty ?? a.difficulty,
      nObs,
      eloAttempt(a, nObs),
      guess,
      params,
    );
    skill.elo = elo.theta;
    skill.nAttempts = elo.n_skill;
    if (template && (elo.n_item !== nObs || elo.d !== template.difficulty)) {
      await tx.writeTemplate(a.templateKey, a.templateVersion, elo.d, elo.n_item);
    }
    skill.firstSeenAt ??= now;
    skill.epochStart ??= a.submittedAt.getTime() > now.getTime() ? now : a.submittedAt;

    // The review unit: alone when there is no session; with the whole session when it already closed
    // without committing this skill; otherwise it waits for commitSessionReviews.
    const priorRating = await tx.lastRating(a.userId, a.skillKey);
    const reviewKind = REVIEW_KINDS.has(a.taskKind);
    let review: Review | null = null;
    if (reviewKind) {
      if (a.sessionId === null) {
        review = await commitUnit(ctx, skill, [asUnit(a, nObs)], null);
      } else {
        const status = await tx.sessionStatus(a.userId, a.sessionId);
        if (status === "completed" || status === "abandoned") {
          review = await commitUnit(ctx, skill, await tx.sessionUnit(a.userId, a.sessionId, a.skillKey), a.sessionId);
        }
      }
    }
    // Until the unit commits, the attempt's own rating stands in for "the last rating" (a failed
    // attempt on a mastered skill decays it at once, 06 section 4.3).
    const provisional = reviewKind ? mapRating(eloAttempt(a, nObs), skill.reps, params).rating : null;
    const lastRating = review?.rating ?? provisional ?? priorRating;
    await settle(ctx, skill, a.submittedAt, lastRating, priorRating, { kind: a.taskKind, score: a.score });

    await tx.writeSkill(a.userId, a.skillKey, skill);
    return { applied: true, skillUpdate: toSkillUpdate(a.skillKey, skill, review?.rating ?? null) };
  });
}

/**
 * Session close (06 section 3.3 step 2; complete, abandon and idle timeout call this): one FSRS review and
 * one review_log row per skill. Returns null when the session is not the caller's (the route answers 404).
 */
export async function commitSessionReviews(
  userId: string,
  sessionId: string,
  now: Date,
  deps: StateDeps,
): Promise<SkillUpdate[] | null> {
  return deps.store.run(async (tx) => {
    if (!(await tx.ownsSession(userId, sessionId))) return null;
    const timezone = await tx.profileTimezone(userId);
    const updates: SkillUpdate[] = [];
    for (const skillKey of await tx.sessionSkills(userId, sessionId)) {
      const ctx: Ctx = { tx, deps, userId, skillKey, now, timezone };
      const skill = await tx.lockSkill(userId, skillKey, deps.params.elo_init_default);
      const unit = await tx.sessionUnit(userId, sessionId, skillKey);
      const priorRating = await tx.lastRating(userId, skillKey);
      const review = await commitUnit(ctx, skill, unit, sessionId);
      if (review === null) continue;
      const last = unit[unit.length - 1];
      await settle(ctx, skill, last?.submittedAt ?? now, review.rating, priorRating, null);
      await tx.writeSkill(userId, skillKey, skill);
      updates.push(toSkillUpdate(skillKey, skill, review.rating));
    }
    return updates;
  });
}
