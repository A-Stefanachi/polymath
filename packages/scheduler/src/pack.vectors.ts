// Vector handlers for BL-0037. Mirrors run_vector in the reference; inputs come from JSON, so they are cast once here.
import { checkpointStatus, hintReliance, interleaveStage, isStuck, packSession, traceBack } from "./pack.ts";
import type { PackInput, PackStateMap, RecentAttempt } from "./pack.ts";
import type { StateMap } from "./frontier.ts";
import type { VectorHandlers } from "./vector-registry.ts";

export const vectorHandlers: VectorHandlers = {
  interleave_stage: (i, ctx) => ({
    stage: interleaveStage(i["eligible"] as number, i["sets"] as number[], i["current"] as number, ctx.params),
  }),
  pack_session: (i, ctx) =>
    packSession({ ...(i as unknown as Omit<PackInput, "graph" | "states">), graph: ctx.graph, states: i["states"] as PackStateMap }, ctx.params),
  checkpoint_status: (i, ctx) =>
    checkpointStatus(
      (i["days_since_last"] ?? null) as number | null,
      (i["module_fraction_ready"] ?? {}) as Record<string, number>,
      (i["days_since_module"] ?? {}) as Record<string, number | null>,
      ctx.params,
    ),
  is_stuck: (i, ctx) => isStuck(i["recent"] as RecentAttempt[], ctx.params),
  trace_back: (i, ctx) =>
    traceBack(
      ctx.graph,
      i["states"] as StateMap,
      i["skill_key"] as string,
      (i["probe_results"] ?? {}) as Record<string, number>,
      0,
      ctx.params,
    ),
  hint_reliance: (i) => hintReliance(i["recent"] as RecentAttempt[]),
};
