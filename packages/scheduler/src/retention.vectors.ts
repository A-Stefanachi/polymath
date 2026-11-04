// Vector handler for desired_retention (BL-0187). Mirrors run_vector in the reference.
import { resolveParams, type SchedulerParams } from "./params.ts";
import { desiredRetention } from "./retention.ts";
import type { VectorHandlers } from "./vector-registry.ts";

export const vectorHandlers: VectorHandlers = {
  desired_retention: (i) =>
    desiredRetention(
      i["weeks_since_start"] as number,
      (i["observed_minus_predicted"] ?? null) as number | null,
      resolveParams(i["params"] as Partial<SchedulerParams> | undefined),
    ),
};
