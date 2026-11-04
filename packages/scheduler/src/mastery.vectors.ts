// Vector handlers for BL-0035 (doc 06 section 13). Inputs come from JSON, so they are cast once here.
import {
  aggregateAttempts,
  masteryRule,
  masteryState,
  tierAttained,
  type MasteryAttempt,
} from "./mastery.ts";
import { resolveParams, type SchedulerParams, type Tier } from "./params.ts";
import type { AttemptSnapshot } from "./types.ts";
import type { VectorHandlers } from "./vector-registry.ts";

type Input = Record<string, unknown>;

function params(i: Input): SchedulerParams | undefined {
  return i["params"] === undefined ? undefined : resolveParams(i["params"] as Partial<SchedulerParams>);
}

function attempts(v: unknown): MasteryAttempt[] {
  return (v ?? []) as MasteryAttempt[];
}

/** Drops optional flags the vector leaves out, so `exactOptionalPropertyTypes` stays satisfied. */
function flags(i: Input) {
  return {
    ...(i["has_non_mc"] === undefined ? {} : { hasNonMc: i["has_non_mc"] as boolean }),
    ...(i["has_applied"] === undefined ? {} : { hasApplied: i["has_applied"] as boolean }),
    ...(i["n_verified_templates"] === undefined ? {} : { nVerifiedTemplates: i["n_verified_templates"] as number }),
    ...(i["project_credit_applied"] === undefined
      ? {}
      : { projectCreditApplied: i["project_credit_applied"] as boolean }),
    ...(params(i) === undefined ? {} : { params: params(i) as SchedulerParams }),
  };
}

export const vectorHandlers: VectorHandlers = {
  aggregate_attempts: (i) => aggregateAttempts(i["attempts"] as AttemptSnapshot[]),
  mastery_rule: (i) =>
    masteryRule(attempts(i["attempts"]), i["tier"] as Tier, {
      ...flags(i),
      ...(i["tz_offset_min"] === undefined ? {} : { tzOffsetMin: i["tz_offset_min"] as number }),
    }),
  mastery_state: (i) => {
    const { projectCreditApplied: _unused, ...f } = flags(i);
    void _unused;
    return masteryState({
      ...f,
      attempts: attempts(i["attempts"]),
      tier: i["tier"] as Tier,
      retrievability: (i["retrievability"] ?? null) as number | null,
      everMastered: i["ever_mastered"] as boolean,
      lastRating: (i["last_rating"] ?? null) as number | null,
      ...(i["recent_lapses_60d"] === undefined ? {} : { recentLapses60d: i["recent_lapses_60d"] as number }),
      ...(i["post_decay_attempts"] === undefined ? {} : { postDecayAttempts: attempts(i["post_decay_attempts"]) }),
    });
  },
  // `tier_target` is a vector field the reference ignores, so it is ignored here too.
  tier_attained: (i) =>
    tierAttained({
      ...flags(i),
      attempts: attempts(i["attempts"]),
      checkpointOk: i["checkpoint_ok"] as boolean,
      spanDays: i["span_days"] as number,
    }),
};
