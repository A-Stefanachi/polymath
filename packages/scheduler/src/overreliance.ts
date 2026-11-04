// Tutor over-reliance rule (00a G6; thresholds are [P]). Port of tutor_overreliance in
// reference/scheduler_reference.py. Only this pure function lives here. BL-0188 owns the integration
// (tutor mode switch, allowed_hint_level, the checkpoint_gap_flag and tutor_mode_changed events, API).
import { resolveParams, type SchedulerParams } from "./params.ts";

/** One checkpoint record for ONE node, chronological order (oldest first). */
export interface RelianceCheckpoint {
  /** Strict-unaided checkpoint attempts. */
  readonly unaided_n: number;
  readonly unaided_correct: number;
  /** Aided attempts (max_hint_level >= 1 or tutor panel opened) on the same skills since the previous checkpoint. */
  readonly aided_n: number;
  readonly aided_correct: number;
}

export type RelianceReason = "too_few_checkpoints" | "too_few_attempts" | "unaided_trails_aided" | "within_threshold";

export interface RelianceResult {
  readonly flag: boolean;
  readonly gap: number | null;
  readonly reason: RelianceReason;
  readonly tutor_mode: "normal" | "post_attempt_only";
}

const round4 = (x: number): number => Math.round((x + 0) * 1e4) / 1e4;

/**
 * Pools the last `reliance_checkpoints` records; flags when strict-unaided accuracy trails aided accuracy
 * by more than `reliance_gap_threshold` and both pools have at least `reliance_min_attempts` attempts.
 */
export function tutorOverreliance(
  checkpoints: readonly RelianceCheckpoint[],
  params?: Partial<SchedulerParams>,
): RelianceResult {
  const P = resolveParams(params);
  const last = checkpoints.slice(-P.reliance_checkpoints);
  if (last.length < P.reliance_checkpoints) {
    return { flag: false, gap: null, reason: "too_few_checkpoints", tutor_mode: "normal" };
  }
  const sum = (f: (c: RelianceCheckpoint) => number): number => last.reduce((a, c) => a + f(c), 0);
  const un = sum((c) => c.unaided_n);
  const ad = sum((c) => c.aided_n);
  if (un < P.reliance_min_attempts || ad < P.reliance_min_attempts) {
    return { flag: false, gap: null, reason: "too_few_attempts", tutor_mode: "normal" };
  }
  const gap = round4(sum((c) => c.aided_correct) / ad - sum((c) => c.unaided_correct) / un);
  const flag = gap > P.reliance_gap_threshold + 1e-12;
  return {
    flag,
    gap,
    reason: flag ? "unaided_trails_aided" : "within_threshold",
    tutor_mode: flag ? "post_attempt_only" : "normal",
  };
}
