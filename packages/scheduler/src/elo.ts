// Elo / IRT-lite learner model and the attempt-to-FSRS rating map (doc 06 sections 2 and 3; 00a G5).
// Pure functions over plain data; ported from polymath-app-spec/reference/scheduler_reference.py.
import { DEFAULT_PARAMS } from "./params.ts";
import type { SchedulerParams } from "./params.ts";

/** Task kinds that create a review (reference REVIEW_KINDS). */
export const REVIEW_KINDS: ReadonlySet<string> = new Set([
  "retrieval",
  "problem",
  "perceptual_drill",
  "debug_case",
  "explain_back",
  "checkpoint",
]);

/** The attempt fields the Elo update and the rating map read. */
export interface EloAttempt {
  readonly task_kind: string;
  readonly score: number;
  readonly max_hint_level?: number;
  readonly unaided?: boolean;
  readonly confidence?: number | null;
  readonly latency_ms?: number | null;
  readonly expected_ms?: number | null;
  readonly template_n_obs?: number | null;
  readonly grader_type?: string;
  readonly rapid_flag?: boolean;
}

export interface EloUpdate {
  readonly expected: number;
  readonly weight: number;
  readonly theta: number;
  readonly d: number;
  readonly n_skill: number;
  readonly n_item: number;
}

export interface RatingResult {
  /** FSRS rating 1 to 4, or null when the attempt creates no review. */
  readonly rating: 1 | 2 | 3 | 4 | null;
  readonly flags: readonly string[];
}

/** Rounds to 4 decimals on the exact binary value, like Python's round(x, 4); normalises -0. */
function round4(x: number): number {
  return Number(x.toFixed(4)) + 0;
}

/** item_templates.difficulty_prior in [0, 1] to Elo-scale difficulty 1200..1800. */
export function difficultyFromPrior(prior: number): number {
  return 1200 + 600 * Math.min(Math.max(prior, 0), 1);
}

/** Expected score; `guess` is the multiple-choice floor. Unrounded. */
export function expectedScore(theta: number, d: number, guess = 0, params: SchedulerParams = DEFAULT_PARAMS): number {
  const logistic = 1 / (1 + 10 ** ((d - theta) / params.elo_scale));
  return guess + (1 - guess) * logistic;
}

/** Learner-side K: starts at k0, halves at k_half_n observations, floors at k_min. */
export function kFactor(n: number, params: SchedulerParams = DEFAULT_PARAMS): number {
  return Math.max(params.k_min, params.k0 / (1 + n / params.k_half_n));
}

/** Item-side K (template difficulty). */
export function kItem(n: number, params: SchedulerParams = DEFAULT_PARAMS): number {
  return Math.max(params.k_item_min, params.k_item0 / (1 + n / params.k_item_half_n));
}

export function isRapidGuess(
  latencyMs: number | null | undefined,
  expectedMs: number | null | undefined,
  score: number,
  params: SchedulerParams = DEFAULT_PARAMS,
): boolean {
  if (latencyMs === null || latencyMs === undefined || !expectedMs) return false;
  return (
    score < params.fail_threshold &&
    latencyMs < params.rapid_guess_floor_ms &&
    latencyMs < params.rapid_guess_ratio * expectedMs
  );
}

/** Weight in [0, 1.25] applied to the learner-side update. */
export function learnerWeight(att: EloAttempt, params: SchedulerParams = DEFAULT_PARAMS): number {
  if (att.task_kind === "worked_example") return 0;
  const h = att.max_hint_level ?? 0;
  let w = 1;
  if (h >= 4) w = params.w_hint4;
  else if (h === 3) w = params.w_hint3;
  else if (h === 2) w = params.w_hint2;
  if (att.task_kind === "faded_problem") w *= params.w_scaffold;
  if (isRapidGuess(att.latency_ms, att.expected_ms, att.score, params)) {
    w *= params.w_rapid_guess;
  } else if (
    att.confidence !== null &&
    att.confidence !== undefined &&
    att.confidence >= 4 &&
    att.score < params.fail_threshold &&
    h <= 1
  ) {
    w = Math.min(params.w_hiconf_wrong, w * params.w_hiconf_wrong);
  }
  return w;
}

/** One Elo step for the skill rating and the template difficulty. Outputs rounded to 4 decimals. */
export function updateElo(
  theta: number,
  nSkill: number,
  d: number,
  nItem: number,
  att: EloAttempt,
  guess = 0,
  params: SchedulerParams = DEFAULT_PARAMS,
): EloUpdate {
  const s = (att.max_hint_level ?? 0) >= 4 ? 0 : att.score;
  const e = expectedScore(theta, d, guess, params);
  const w = learnerWeight(att, params);
  const newTheta = theta + kFactor(nSkill, params) * w * (s - e);
  // Only unaided, non-scaffolded, non-rapid-guess attempts say something about the item.
  const itemOk =
    att.unaided === true &&
    att.task_kind !== "worked_example" &&
    att.task_kind !== "faded_problem" &&
    !isRapidGuess(att.latency_ms, att.expected_ms, att.score, params);
  const newD = itemOk ? d - kItem(nItem, params) * (s - e) : d;
  return {
    expected: round4(e),
    weight: round4(w),
    theta: round4(newTheta),
    d: round4(newD),
    n_skill: nSkill + (w > 0 ? 1 : 0),
    n_item: nItem + (itemOk ? 1 : 0),
  };
}

/** Performance-rating start from one diagnostic item: d + scale*log10(p/(1-p)), p clipped to [0.1, 0.9]. */
export function diagnosticInit(d: number, score: number, params: SchedulerParams = DEFAULT_PARAMS): number {
  const p = Math.min(Math.max(score, 0.1), 0.9);
  return round4(d + params.elo_scale * Math.log10(p / (1 - p)));
}

/** Start rating for a skill with no evidence: default, or mean of prerequisite ratings minus 50 within 1100..1700. */
export function coldStartTheta(prereqThetas: readonly number[], params: SchedulerParams = DEFAULT_PARAMS): number {
  if (prereqThetas.length === 0) return params.elo_init_default;
  const mean = prereqThetas.reduce((a, b) => a + b, 0) / prereqThetas.length;
  return round4(Math.min(Math.max(mean - 50, 1100), 1700));
}

/** Difficulty at which the expected score equals target_success (no guess floor). */
export function targetItemDifficulty(theta: number, params: SchedulerParams = DEFAULT_PARAMS): number {
  const p = params.target_success;
  return round4(theta - params.elo_scale * Math.log10(p / (1 - p)));
}

/** Maps a graded (aggregated) attempt to an FSRS rating 1 to 4 (06 section 3; 00a G5 for the latency rows). */
export function mapRating(
  att: EloAttempt,
  reps = 0,
  params: SchedulerParams = DEFAULT_PARAMS,
): RatingResult {
  if (!REVIEW_KINDS.has(att.task_kind)) return { rating: null, flags: ["not_review_eligible"] };
  const s = att.score;
  const h = att.max_hint_level ?? 0;
  const conf = att.confidence ?? null;
  const flags: string[] = [];
  let ratio: number | null = null;
  if (att.latency_ms !== null && att.latency_ms !== undefined && att.expected_ms) {
    ratio = att.latency_ms / att.expected_ms;
    // 00a G5: latency rows are ignored until the template has enough observations.
    if ((att.template_n_obs ?? 0) < params.latency_min_obs) ratio = null;
  }
  if (h >= 4 || s < params.fail_threshold) {
    if (conf !== null && conf >= 4 && h < 4) flags.push("high_confidence_error");
    return { rating: 1, flags };
  }
  if (s < params.correct_threshold || h >= 2) return { rating: 2, flags };
  if (ratio !== null && ratio > params.latency_slow_ratio) return { rating: 2, flags: ["slow"] };
  const easy =
    s >= 0.95 &&
    h === 0 &&
    ratio !== null &&
    ratio <= params.latency_fast_ratio &&
    conf !== null &&
    conf >= params.easy_min_confidence &&
    reps >= params.easy_min_reps &&
    att.rapid_flag !== true &&
    att.grader_type !== "multiple_choice";
  if (conf !== null && conf <= 2) flags.push("low_confidence_correct");
  return { rating: easy ? 4 : 3, flags };
}
