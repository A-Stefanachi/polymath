// Vector handlers for BL-0036 (doc 06 section 6). Inputs come from JSON, so they are cast once here.
import { computeAvailable, computeFrontier, frontierScores, prereqSatisfied, projectPull } from "./frontier.ts";
import { resolveParams, type SchedulerParams } from "./params.ts";
import type { GraphEdge, SkillStateSnapshot } from "./types.ts";
import type { VectorHandlers } from "./vector-registry.ts";

type States = Record<string, SkillStateSnapshot>;

export const vectorHandlers: VectorHandlers = {
  prereq_satisfied: (i) =>
    prereqSatisfied(
      i["state"] as SkillStateSnapshot,
      i["edge"] as GraphEdge,
      (i["hysteresis"] ?? false) as boolean,
      resolveParams(i["params"] as Partial<SchedulerParams> | undefined),
    ),
  compute_frontier: (i, ctx) => {
    const states = i["states"] as States;
    return {
      available: computeAvailable(ctx.graph, states, [], ctx.params),
      frontier: computeFrontier(ctx.graph, states, ctx.params),
    };
  },
  frontier_scores: (i, ctx) => {
    const states = i["states"] as States;
    return frontierScores(
      ctx.graph,
      states,
      computeFrontier(ctx.graph, states, ctx.params),
      (i["project_pull"] ?? {}) as Record<string, number>,
      (i["node_minutes"] ?? {}) as Record<string, number>,
      ctx.params,
    );
  },
  project_pull: (i, ctx) => projectPull(ctx.graph, i["step_skill_keys"] as string[]),
};
