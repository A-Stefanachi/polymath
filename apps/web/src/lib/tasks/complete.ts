// completeTask (operationId; 00a J9, doc 06 sections 7.4 and 10, LS-008): closes a session task that has no
// graded attempt. `done` applies to `worked_example` tasks: it writes no attempt, grade, Elo, mastery or FSRS
// update; it only moves `loop_step` (worked_example -> faded_problem) and starts the skill (`unseen` -> `learning`).
// `skipped` with `not_now` closes the task; a skip is not an attempt. Learner state is written here, in the
// TypeScript domain code, in one transaction with the task row (CLAUDE.md rule 2.8).
import type { components } from "@polymath/shared-types";
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { defaultStateDeps, nextLoopStep, type StateDeps } from "@/lib/state/apply-attempt.ts";
import type { TaskLock } from "@/server/privileged/state-store";

type CompleteTaskRequest = components["schemas"]["CompleteTaskRequest"];
type SessionTask = components["schemas"]["SessionTask"];
type TaskCompletion = components["schemas"]["TaskCompletion"];

export type CompleteTaskDeps = { state: () => Promise<StateDeps>; now: () => Date };

export const defaultCompleteTaskDeps = (): CompleteTaskDeps => ({ state: defaultStateDeps, now: () => new Date() });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bad(field: string, message: string): ApiError {
  return new ApiError("validation_failed", { errors: [{ field, message }] });
}

const notCompletable = (): ApiError => new ApiError("task_not_completable");

function toTask(t: TaskLock, status: string): SessionTask {
  return {
    id: t.id,
    position: t.position,
    task_kind: t.taskKind as SessionTask["task_kind"],
    skill_key: t.skillKey,
    project_step_key: t.projectStepKey,
    item_id: t.itemId,
    status: status as SessionTask["status"],
    est_seconds: t.estSeconds,
    reason: t.reason as NonNullable<SessionTask["reason"]> | null,
    assessment_kind: t.assessmentKind as NonNullable<SessionTask["assessment_kind"]> | null,
  };
}

export async function completeTask(ctx: ApiContext, deps: CompleteTaskDeps = defaultCompleteTaskDeps()): Promise<Response> {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  const user = ctx.caller.userId;
  const taskId = ctx.params["task_id"] ?? "";
  if (!UUID.test(taskId)) throw new ApiError("not_found");
  const body = ctx.body as CompleteTaskRequest;

  // Cross-field rules of the request (the schema checks each field alone).
  if (body.outcome === "skipped" && body.skip_reason === undefined) throw bad("skip_reason", "is required when outcome is skipped");
  if (body.outcome === "done" && body.skip_reason !== undefined) throw bad("skip_reason", "is only allowed when outcome is skipped");
  if (body.outcome === "skipped" && body.self_explanation !== undefined) throw bad("self_explanation", "is only allowed when outcome is done");

  const now = deps.now();
  const state = await deps.state();
  const result = await state.store.run(async (tx): Promise<TaskCompletion> => {
    const task = await tx.lockTask(user, taskId);
    if (!task) throw new ApiError("not_found"); // another user's task looks the same as a missing one
    const wanted = body.outcome === "done" ? "done" : "skipped";
    const loopStepOf = async (): Promise<string | null> =>
      task.skillKey === null ? null : (await tx.lockSkill(user, task.skillKey, state.params.elo_init_default)).loopStep;

    // Repeating the same outcome returns the stored task; anything else on a closed task is a conflict.
    if (task.status === "done" || task.status === "skipped") {
      if (task.status !== wanted) throw notCompletable();
      if (wanted === "done" && task.taskKind !== "worked_example") throw notCompletable();
      return { task: toTask(task, task.status), loop_step: await loopStepOf() };
    }
    if (task.sessionStatus !== "active") throw notCompletable();

    const outcome: Record<string, unknown> = {
      outcome: body.outcome,
      ...(body.skip_reason === undefined ? {} : { skip_reason: body.skip_reason }),
      ...(body.self_explanation === undefined ? {} : { self_explanation: body.self_explanation }),
      at: now.toISOString(),
    };

    if (wanted === "done") {
      if (task.taskKind !== "worked_example") throw notCompletable(); // graded kinds close through submitAttempt
      let loopStep: string | null = null;
      if (task.skillKey !== null) {
        const skill = await tx.lockSkill(user, task.skillKey, state.params.elo_init_default);
        if (skill.masteryState === "unseen") skill.masteryState = "learning";
        skill.firstSeenAt ??= now;
        skill.loopStep = nextLoopStep(skill.loopStep, { kind: "worked_example", score: 1 }, skill.masteryState, null, state.params);
        await tx.writeSkill(user, task.skillKey, skill);
        loopStep = skill.loopStep;
      }
      await tx.closeTask(task.id, task.sessionId, "done", now, outcome);
      return { task: toTask(task, "done"), loop_step: loopStep };
    }

    // Skipped. Assessment tasks, project steps and "already know" (offered only after a cold-start estimate,
    // 06 section 5.6, not built yet) cannot be skipped this way.
    if (task.assessmentKind !== null || task.taskKind === "project_step" || body.skip_reason !== "not_now") throw notCompletable();
    await tx.closeTask(task.id, task.sessionId, "skipped", now, outcome);
    return { task: toTask(task, "skipped"), loop_step: await loopStepOf() };
  });
  return json(result);
}
