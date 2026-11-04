// Scheduler parameters and task-time constants (doc 06 section 11 defaults; 00a G1-G8 values).
// Copied from PARAMS in polymath-app-spec/reference/scheduler_reference.py; every value is a
// default that experiments may override through a partial SchedulerParams argument.

export type SessionType = "micro" | "focus" | "lab";
export type Tier = "L0" | "L1" | "L2" | "L3";

export interface SchedulerParams {
  readonly elo_scale: number;
  readonly elo_init_default: number;
  readonly k0: number;
  readonly k_min: number;
  readonly k_half_n: number;
  readonly k_item0: number;
  readonly k_item_min: number;
  readonly k_item_half_n: number;
  readonly w_hint2: number;
  readonly w_hint3: number;
  readonly w_hint4: number;
  readonly w_scaffold: number;
  readonly w_rapid_guess: number;
  readonly w_hiconf_wrong: number;
  readonly rapid_guess_ratio: number;
  readonly rapid_guess_floor_ms: number;
  readonly correct_threshold: number;
  readonly fail_threshold: number;
  readonly latency_slow_ratio: number;
  readonly latency_fast_ratio: number;
  readonly easy_min_confidence: number;
  readonly easy_min_reps: number;
  readonly mastery_min_correct: number;
  readonly mastery_min_days: number;
  readonly mastery_min_variants: number;
  readonly mastery_min_span_days: number;
  readonly mastery_min_templates: number;
  readonly decay_threshold_r: number;
  readonly prereq_r_threshold: number;
  readonly continue_r_threshold: number;
  readonly placement_grace_days: number;
  readonly target_retention: number;
  readonly desired_retention_initial: number;
  readonly desired_retention_mature: number;
  readonly retention_initial_weeks: number;
  readonly retention_calibration_tolerance: number;
  readonly latency_min_obs: number;
  readonly lab_fallback_cap_min: number;
  readonly planning_new_skills_per_week: readonly [number, number];
  readonly reliance_gap_threshold: number;
  readonly reliance_min_attempts: number;
  readonly reliance_checkpoints: number;
  readonly target_success: number;
  readonly slack_fraction: number;
  readonly max_review_share: number;
  readonly max_new_skills: Readonly<Record<SessionType, number>>;
  readonly practice_fill_max_per_skill: number;
  readonly applied_gap_max: Readonly<Record<SessionType, number>>;
  readonly max_node_share: number;
  readonly checkpoint_interval_days: number;
  readonly checkpoint_reserve_after_days: number;
  readonly module_checkpoint_fraction: number;
  readonly interleave_stage2_acc: number;
  readonly interleave_stage3_acc: number;
  readonly interleave_regress_acc: number;
  readonly placement_grace_max_tier: Tier;
  readonly stuck_consecutive_fails: number;
  readonly stuck_reveals_in_last4: number;
  readonly trace_max_depth: number;
  readonly frontier_w_project: number;
  readonly frontier_w_unlocks: number;
  readonly frontier_w_soft_unmet: number;
  readonly frontier_w_balance: number;
  readonly frontier_w_cost: number;
}

export const DEFAULT_PARAMS: SchedulerParams = {
  elo_scale: 400,
  elo_init_default: 1300,
  k0: 48,
  k_min: 16,
  k_half_n: 10,
  k_item0: 24,
  k_item_min: 4,
  k_item_half_n: 20,
  w_hint2: 0.5,
  w_hint3: 0.25,
  w_hint4: 0.5,
  w_scaffold: 0.5,
  w_rapid_guess: 0.5,
  w_hiconf_wrong: 1.25,
  rapid_guess_ratio: 0.15,
  rapid_guess_floor_ms: 3000,
  correct_threshold: 0.8,
  fail_threshold: 0.5,
  latency_slow_ratio: 2,
  latency_fast_ratio: 0.6,
  easy_min_confidence: 4,
  easy_min_reps: 2,
  mastery_min_correct: 3,
  mastery_min_days: 2,
  mastery_min_variants: 2,
  mastery_min_span_days: 2,
  mastery_min_templates: 2,
  decay_threshold_r: 0.7,
  prereq_r_threshold: 0.8,
  continue_r_threshold: 0.7,
  placement_grace_days: 14,
  target_retention: 0.85,
  desired_retention_initial: 0.85,
  desired_retention_mature: 0.9,
  retention_initial_weeks: 8,
  retention_calibration_tolerance: 0.07,
  latency_min_obs: 20,
  lab_fallback_cap_min: 120,
  planning_new_skills_per_week: [5, 7],
  reliance_gap_threshold: 0.15,
  reliance_min_attempts: 10,
  reliance_checkpoints: 2,
  target_success: 0.8,
  slack_fraction: 0.1,
  max_review_share: 0.7,
  max_new_skills: { micro: 1, focus: 3, lab: 0 },
  practice_fill_max_per_skill: 2,
  applied_gap_max: { micro: 1, focus: 3, lab: 0 },
  max_node_share: 0.6,
  checkpoint_interval_days: 14,
  checkpoint_reserve_after_days: 12,
  module_checkpoint_fraction: 0.8,
  interleave_stage2_acc: 0.6,
  interleave_stage3_acc: 0.7,
  interleave_regress_acc: 0.4,
  placement_grace_max_tier: "L1",
  stuck_consecutive_fails: 3,
  stuck_reveals_in_last4: 2,
  trace_max_depth: 3,
  frontier_w_project: 3,
  frontier_w_unlocks: 1,
  frontier_w_soft_unmet: 2,
  frontier_w_balance: 2,
  frontier_w_cost: 0.25,
};

/** Merge overrides over the defaults; the result is a new object. */
export function resolveParams(overrides?: Partial<SchedulerParams>): SchedulerParams {
  return overrides === undefined ? DEFAULT_PARAMS : { ...DEFAULT_PARAMS, ...overrides };
}

/** Estimated minutes per task kind (06 section 8; 00a G7 for diagnostic items). */
export const TASK_MINUTES: Readonly<Record<string, number>> = {
  retrieval: 1.5,
  worked_example: 4,
  faded_problem: 5,
  problem: 10,
  problem_short: 4,
  perceptual_drill: 2,
  explain_back: 4,
  debug_case: 12,
  diagnostic: 2.5,
  checkpoint: 2.5,
};
