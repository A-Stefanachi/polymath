// Vector handler for tutor_overreliance (BL-0039 delivers the pure function; BL-0188 the integration).
import { tutorOverreliance, type RelianceCheckpoint } from "./overreliance.ts";
import type { SchedulerParams } from "./params.ts";
import type { VectorHandlers } from "./vector-registry.ts";

export const vectorHandlers: VectorHandlers = {
  tutor_overreliance: (i) =>
    tutorOverreliance(i["checkpoints"] as RelianceCheckpoint[], i["params"] as Partial<SchedulerParams> | undefined),
};
