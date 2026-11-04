// Mastery rule, mastery state, tier attainment and attempt aggregation (doc 06 sections 5 and 6;
// 00a G2, G3, B5). Ports reference/scheduler_reference.py; the shared vectors are the oracle. Pure:
// time arrives as attempt timestamps and a timezone offset, never from a clock.
import { DEFAULT_PARAMS, type SchedulerParams, type Tier } from "./params.ts";
import type { AttemptSnapshot } from "./types.ts";

export type MasteryStateName = "unseen" | "learning" | "reviewing" | "mastered" | "decayed";

/** An attempt as the mastery rule reads it. `verified` defaults to true (only verified items are served). */
export interface MasteryAttempt extends AttemptSnapshot {
  readonly item_id: string;
  readonly submitted_at: string;
  readonly verified?: boolean;
}

export interface MasteryRuleChecks {
  readonly count: boolean;
  readonly days: boolean;
  readonly variants: boolean;
  readonly last_two_not_failed: boolean;
  readonly constructed_response: boolean;
  readonly applied: boolean;
}

export interface MasteryRuleResult {
  readonly met: boolean;
  readonly qualifying: number;
  readonly days: number;
  readonly variants: number;
  readonly checks: MasteryRuleChecks;
}

export interface MasteryRuleOptions {
  /** Learner offset from UTC in minutes; defines the local calendar day. */
  readonly tzOffsetMin?: number;
  /** The skill has a template that is not multiple choice (default true). */
  readonly hasNonMc?: boolean | undefined;
  /** The skill has an applied template (default true). */
  readonly hasApplied?: boolean | undefined;
  /** 00a B5: accepted project evidence satisfies the "applied" condition only. */
  readonly projectCreditApplied?: boolean | undefined;
  /** 00a G3: the template-diversity condition applies at 2 or more verified templates. */
  readonly nVerifiedTemplates?: number | undefined;
  readonly params?: SchedulerParams | undefined;
}

const TIERS: readonly string[] = ["L0", "L1", "L2", "L3"];
const REVIEW_KINDS: ReadonlySet<string> = new Set([
  "retrieval",
  "problem",
  "perceptual_drill",
  "debug_case",
  "explain_back",
  "checkpoint",
]);
const APPLIED_KINDS: ReadonlySet<string> = new Set(["problem", "debug_case", "checkpoint"]);
const MS_PER_DAY = 86_400_000;
const MS_PER_MIN = 60_000;

function tierIdx(t: string | undefined): number {
  return TIERS.indexOf(t ?? "");
}

function hint(a: AttemptSnapshot): number {
  return a.max_hint_level;
}

/** Number of the learner-local calendar day of an ISO timestamp (days since the epoch). */
function localDay(iso: string, tzOffsetMin: number): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`invalid submitted_at: ${iso}`);
  return Math.floor((ms + tzOffsetMin * MS_PER_MIN) / MS_PER_DAY);
}

/** Round half to even, as Python's round() does on exact ties. */
function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

function round4(x: number): number {
  return Number((x + 0).toFixed(4));
}

/** Qualifying attempt: unaided, hint level <= 1, score >= correct threshold, verified, item tier >= tier. */
export function isQualifying(a: MasteryAttempt, tier: Tier, params: SchedulerParams = DEFAULT_PARAMS): boolean {
  return (
    (REVIEW_KINDS.has(a.task_kind) || a.task_kind === "diagnostic") &&
    (a.unaided ?? false) &&
    hint(a) <= 1 &&
    a.score >= params.correct_threshold &&
    (a.verified ?? true) &&
    tierIdx(a.item_tier ?? "L0") >= tierIdx(tier)
  );
}

/**
 * Review unit: all review-eligible attempts of one skill in one session become one review. Score is the
 * mean, hint level the max, latency ratio and confidence the (lower) median, task kind the last attempt's,
 * grader type `multiple_choice` only when all are, and `template_n_obs` the minimum (00a G5).
 */
export function aggregateAttempts(atts: readonly AttemptSnapshot[]): AttemptSnapshot {
  const last = atts[atts.length - 1];
  if (last === undefined) throw new Error("aggregateAttempts needs at least one attempt");
  const ratios: number[] = [];
  const confs: number[] = [];
  for (const a of atts) {
    if (a.latency_ms !== undefined && a.latency_ms !== null && a.expected_ms) ratios.push(a.latency_ms / a.expected_ms);
    if (a.confidence !== undefined && a.confidence !== null) confs.push(a.confidence);
  }
  ratios.sort((x, y) => x - y);
  confs.sort((x, y) => x - y);
  const medianRatio = ratios[Math.floor((ratios.length - 1) / 2)];
  const medianConf = confs[Math.floor((confs.length - 1) / 2)];
  const sum = atts.reduce((s, a) => s + a.score, 0);
  return {
    task_kind: last.task_kind,
    score: round4(sum / atts.length),
    max_hint_level: Math.max(...atts.map((a) => a.max_hint_level)),
    grader_type: atts.every((a) => a.grader_type === "multiple_choice") ? "multiple_choice" : "mixed",
    ...(medianRatio === undefined ? {} : { latency_ms: roundHalfEven(medianRatio * 1000), expected_ms: 1000 }),
    ...(medianConf === undefined ? {} : { confidence: medianConf }),
    ...(atts.some((a) => "template_n_obs" in a)
      ? { template_n_obs: Math.min(...atts.map((a) => a.template_n_obs ?? 0)) }
      : {}),
  };
}

/**
 * The mastery rule (doc 06 section 5; 00a G2, G3, B5). `attempts` are chronological and since the current
 * mastery epoch. Met when: at least 3 qualifying attempts, on at least 2 local calendar days whose first and
 * last qualifying attempts are at least `mastery_min_span_days` apart, on at least 2 item variants (and, with
 * 2 or more verified templates, 2 templates), the last two unaided graded attempts are not failures, one
 * qualifying attempt is constructed-response and, from L1, one is applied (project credit counts for that only).
 */
export function masteryRule(
  attempts: readonly MasteryAttempt[],
  tier: Tier,
  opts: MasteryRuleOptions = {},
): MasteryRuleResult {
  const P = opts.params ?? DEFAULT_PARAMS;
  const tz = opts.tzOffsetMin ?? 0;
  const q = attempts.filter((a) => isQualifying(a, tier, P));
  const qDays = q.map((a) => localDay(a.submitted_at, tz)).sort((x, y) => x - y);
  const days = new Set(qDays).size;
  const variants = new Set(q.map((a) => a.item_id)).size;
  const graded = attempts.filter((a) => REVIEW_KINDS.has(a.task_kind) && (a.unaided ?? false));
  const lastTwoOk = graded.slice(-2).every((a) => a.score >= P.fail_threshold);
  const nonMcOk = !(opts.hasNonMc ?? true) || q.some((a) => a.grader_type !== "multiple_choice");
  const appliedOk =
    !(opts.hasApplied ?? true) ||
    tierIdx(tier) < 1 ||
    (opts.projectCreditApplied ?? false) ||
    q.some((a) => APPLIED_KINDS.has(a.task_kind));
  let spanOk = true;
  const first = qDays[0];
  const last = qDays[qDays.length - 1];
  if (P.mastery_min_span_days > 0 && first !== undefined && last !== undefined) {
    spanOk = last - first >= P.mastery_min_span_days;
  }
  let templatesOk = true;
  if ((opts.nVerifiedTemplates ?? 0) >= 2 && P.mastery_min_templates > 0) {
    const keys = new Set(q.map((a) => a.template_key).filter((k): k is string => k !== undefined && k !== ""));
    templatesOk = keys.size >= P.mastery_min_templates;
  }
  const checks: MasteryRuleChecks = {
    count: q.length >= P.mastery_min_correct,
    days: days >= P.mastery_min_days && spanOk,
    variants: variants >= P.mastery_min_variants && templatesOk,
    last_two_not_failed: lastTwoOk,
    constructed_response: nonMcOk,
    applied: appliedOk,
  };
  return { met: Object.values(checks).every(Boolean), qualifying: q.length, days, variants, checks };
}

export interface MasteryStateInput {
  readonly attempts: readonly MasteryAttempt[];
  readonly tier: Tier;
  /** Current retrievability, or null when unknown. */
  readonly retrievability: number | null;
  /** The rule was met at some earlier time in this epoch. */
  readonly everMastered: boolean;
  readonly lastRating: number | null;
  readonly recentLapses60d?: number;
  /** Attempts made since the skill last became decayed. */
  readonly postDecayAttempts?: readonly MasteryAttempt[];
  readonly hasNonMc?: boolean | undefined;
  readonly hasApplied?: boolean | undefined;
  readonly nVerifiedTemplates?: number | undefined;
  readonly params?: SchedulerParams | undefined;
}

/** Derives `mastery_state` (doc 06 section 6) from attempts since the mastery epoch. */
export function masteryState(input: MasteryStateInput): MasteryStateName {
  const P = input.params ?? DEFAULT_PARAMS;
  if (input.attempts.length === 0) return "unseen";
  const r = input.retrievability;
  const notDecayedR = r === null || r >= P.decay_threshold_r;
  if (input.everMastered) {
    const decayed = (r !== null && r < P.decay_threshold_r) || input.lastRating === 1;
    if (!decayed) return "mastered";
    const need = (input.recentLapses60d ?? 0) >= 2 ? 2 : 1;
    const pd = (input.postDecayAttempts ?? []).filter((a) => isQualifying(a, input.tier, P));
    const pdDays = new Set(pd.map((a) => a.submitted_at.slice(0, 10)));
    return pd.length >= need && pdDays.size >= need ? "mastered" : "decayed";
  }
  const rule = masteryRule(input.attempts, input.tier, {
    hasNonMc: input.hasNonMc,
    hasApplied: input.hasApplied,
    nVerifiedTemplates: input.nVerifiedTemplates,
    params: P,
  });
  if (rule.met && notDecayedR && input.lastRating !== 1) return "mastered";
  const q = input.attempts.filter((a) => isQualifying(a, input.tier, P));
  const qDays = new Set(q.map((a) => a.submitted_at.slice(0, 10)));
  return q.length >= 2 && qDays.size >= 2 ? "reviewing" : "learning";
}

export interface TierAttainedInput {
  readonly attempts: readonly MasteryAttempt[];
  /** A qualifying checkpoint attempt exists (needed for L2). */
  readonly checkpointOk: boolean;
  /** Days between the first and the latest qualifying evidence (L2 needs 14). */
  readonly spanDays: number;
  readonly hasNonMc?: boolean | undefined;
  readonly hasApplied?: boolean | undefined;
  readonly projectCreditApplied?: boolean | undefined;
  readonly nVerifiedTemplates?: number | undefined;
  readonly params?: SchedulerParams | undefined;
}

/**
 * Highest tier whose rule is met: L0 on any item tier, L1 on items of L1 or above, L2 on items of L2 or above
 * plus a checkpoint and a 14-day span. L3 is never automatic (human review), so the result is at most L2.
 * Project credit can satisfy only the "applied" condition (00a B5). Returns null when not even L0 is met.
 */
export function tierAttained(input: TierAttainedInput): Tier | null {
  let best: Tier | null = null;
  for (const t of ["L0", "L1", "L2"] as const) {
    const r = masteryRule(input.attempts, t, {
      hasNonMc: input.hasNonMc,
      hasApplied: input.hasApplied,
      projectCreditApplied: input.projectCreditApplied,
      nVerifiedTemplates: input.nVerifiedTemplates,
      params: input.params,
    });
    const ok = t === "L2" ? r.met && input.checkpointOk && input.spanDays >= 14 : r.met;
    if (!ok) break;
    best = t;
  }
  return best;
}
