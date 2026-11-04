// Desired-retention default switch (00a G5, doc 06 section 3.7). Pure: the learner age and the calibration
// summary are arguments; the nightly job (BL-0189) supplies the summary, until then the result is 0.85.
import { DEFAULT_PARAMS, type SchedulerParams } from "./params.ts";

/**
 * 0.85 during the learner's first `retention_initial_weeks` weeks. Afterwards 0.90, but only when a
 * calibration gap (observed minus predicted recall) is supplied and its magnitude is within the tolerance
 * (0.07, inclusive); a larger gap or no calibration keeps 0.85, the safe side.
 */
export function desiredRetention(
  weeksSinceStart: number,
  observedMinusPredicted: number | null | undefined,
  params: SchedulerParams = DEFAULT_PARAMS,
): number {
  if (weeksSinceStart < params.retention_initial_weeks || observedMinusPredicted == null) {
    return params.desired_retention_initial;
  }
  // The epsilon matches the reference: a gap of exactly 0.07 written as a float still counts as within.
  if (Math.abs(observedMinusPredicted) <= params.retention_calibration_tolerance + 1e-12) {
    return params.desired_retention_mature;
  }
  return params.desired_retention_initial;
}
