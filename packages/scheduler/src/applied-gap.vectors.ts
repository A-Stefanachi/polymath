// Vector handler for needs_applied (BL-0184). Mirrors run_vector in the reference.
import { needsApplied } from "./applied-gap.ts";
import type { MasteryAttempt, MasteryRuleOptions, MasteryStateName } from "./mastery.ts";
import { resolveParams, type SchedulerParams, type Tier } from "./params.ts";
import type { VectorHandlers } from "./vector-registry.ts";

export const vectorHandlers: VectorHandlers = {
  needs_applied: (i) => {
    const opts: MasteryRuleOptions = {
      ...(i["tz_offset_min"] === undefined ? {} : { tzOffsetMin: i["tz_offset_min"] as number }),
      ...(i["has_non_mc"] === undefined ? {} : { hasNonMc: i["has_non_mc"] as boolean }),
      ...(i["has_applied"] === undefined ? {} : { hasApplied: i["has_applied"] as boolean }),
      ...(i["n_verified_templates"] === undefined ? {} : { nVerifiedTemplates: i["n_verified_templates"] as number }),
      ...(i["project_credit_applied"] === undefined
        ? {}
        : { projectCreditApplied: i["project_credit_applied"] as boolean }),
      ...(i["params"] === undefined ? {} : { params: resolveParams(i["params"] as Partial<SchedulerParams>) }),
    };
    return needsApplied(
      (i["attempts"] ?? []) as MasteryAttempt[],
      i["tier"] as Tier,
      i["mastery_state"] as MasteryStateName,
      opts,
    );
  },
};
