// Vector-runner plumbing (BL-0033). Each later scheduler task adds one `<name>.vectors.ts` file next to
// its implementation, exporting `vectorHandlers`; the runner discovers those files, so no shared file
// lists them. The only shared edits are removing the task's functions from SKIPPED_FUNCTIONS and, for a
// feature delivered by BL-0184 to BL-0187, removing vector ids from PENDING_VECTOR_IDS.
import { DEFAULT_PARAMS } from "./params.ts";
import { sampleGraph } from "./sample-graph.ts";
import type { SchedulerParams } from "./params.ts";
import type { SkillGraph } from "./types.ts";

/** Repo-relative location of the shared vectors (one constant; see the root CLAUDE.md path map). */
export const VECTORS_FILE_FROM_REPO_ROOT = "polymath-app-spec/reference/scheduler_test_vectors.json";

export interface VectorCase {
  readonly id: string;
  readonly fn: string;
  readonly input: Record<string, unknown>;
  readonly expected: unknown;
  readonly note?: string;
}

export interface VectorFile {
  readonly count: number;
  readonly params_version: string;
  readonly vectors: readonly VectorCase[];
}

/** What a handler receives besides the vector input: the sample graph and the default parameters. */
export interface VectorContext {
  readonly graph: SkillGraph;
  readonly params: SchedulerParams;
}

/** Returns the value that must equal the vector's `expected` (JSON-compatible). */
export type VectorHandler = (input: Record<string, unknown>, ctx: VectorContext) => unknown;
export type VectorHandlers = Readonly<Record<string, VectorHandler>>;

export function vectorContext(): VectorContext {
  return { graph: sampleGraph(), params: DEFAULT_PARAMS };
}

/**
 * Functions named by vectors whose implementation a later task delivers, with that task. The runner
 * reports them as todo (never passed). A function must leave this list in the task that implements it;
 * the runner fails if a function is both implemented and listed, or named by a vector and in neither.
 */
export const SKIPPED_FUNCTIONS: Readonly<Record<string, string>> = {
  expected_score: "BL-0034",
  k_factor: "BL-0034",
  update_elo: "BL-0034",
  diagnostic_init: "BL-0034",
  cold_start_theta: "BL-0034",
  target_item_difficulty: "BL-0034",
  map_rating: "BL-0034",
  aggregate_attempts: "BL-0035",
  mastery_rule: "BL-0035",
  mastery_state: "BL-0035",
  tier_attained: "BL-0035",
  needs_applied: "BL-0184",
  desired_retention: "BL-0187",
  tutor_overreliance: "BL-0188",
  prereq_satisfied: "BL-0036",
  compute_frontier: "BL-0036",
  frontier_scores: "BL-0036",
  project_pull: "BL-0036",
  interleave_stage: "BL-0037",
  pack_session: "BL-0037",
  checkpoint_status: "BL-0037",
  is_stuck: "BL-0037",
  trace_back: "BL-0037",
  hint_reliance: "BL-0037",
  weekly_plan_slots: "BL-0038",
  rebalance: "BL-0038",
};

/**
 * Vector ids of an implemented function whose expected value needs a feature that BL-0184 to BL-0187
 * deliver later. Reported as pending, never as passed. Must be empty at BL-0039 (the runner's final
 * gate test fails otherwise). Maps vector id to the delivering task.
 */
export const PENDING_VECTOR_IDS: Readonly<Record<string, string>> = {};
