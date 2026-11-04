// getAttempt (BL-0196; doc 03 sections 5.3 and 7.2): the poll for a queued grade. `pending` answers 200 with
// Retry-After; a graded attempt whose learner-state update the worker's callback has not yet made is applied
// here (idempotent, the `state_applied_at` compare-and-set), so a failed callback loses nothing.
// Another user's attempt, or an unknown id, is a 404 (ST-API-01).
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import type { ApiContext } from "@/lib/api/route";
import { applyGradedAttempt, defaultStateDeps, type SkillUpdate, type StateDeps } from "@/lib/state/apply-attempt.ts";
import { toResult } from "@/lib/attempts/submit";
import { createAttemptStore, type AttemptStore } from "@/server/privileged/attempt-store";
import { privilegedDb } from "@/server/privileged/db";

/** Shown for `grade_status = error`: calm, says nothing was counted and what to do next. */
export const ERROR_COPY = "We could not check that answer this time. Nothing was counted, so you can try the question again.";

type Deps = { attempts: AttemptStore; state: () => Promise<StateDeps>; now: () => Date };
const defaultDeps = (): Deps => ({ attempts: createAttemptStore(privilegedDb()), state: defaultStateDeps, now: () => new Date() });

export async function getAttempt(ctx: ApiContext, deps: Deps = defaultDeps()): Promise<Response> {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  const id = z.string().uuid().safeParse(ctx.params["attempt_id"]);
  if (!id.success) throw new ApiError("not_found");
  const row = await deps.attempts.findById(ctx.caller.userId, id.data);
  if (!row) throw new ApiError("not_found");

  let skillUpdate: SkillUpdate | undefined;
  if (row.grade_status === "graded") {
    const applied = await applyGradedAttempt(row.id, deps.now(), await deps.state());
    if (applied.applied) skillUpdate = applied.skillUpdate;
  }
  const body = { ...toResult(row, skillUpdate), ...(row.grade_status === "error" ? { error: ERROR_COPY } : {}) };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (row.grade_status === "pending") headers["Retry-After"] = "1";
  return new Response(JSON.stringify(body), { status: 200, headers });
}
