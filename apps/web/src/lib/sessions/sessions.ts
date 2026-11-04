// buildSession, startSession, getSession, completeSession, listSessions (BL-0044; FR-020, FR-021, FR-023,
// FR-025; doc 06 sections 3.3 and 7, doc 03 5.1). The route handlers only call these.
//
// Learner state: skill_state and review_log are written by lib/state (commitSessionReviews) when a session
// closes, never here (CLAUDE.md rule 2.8). Items: only verified, unserved, user-owned pool items are
// assigned (rule 3); the builder asks the pool for more through ensurePoolStock (BL-0043).
import { computeFrontier } from "@polymath/scheduler";
import type { components } from "@polymath/shared-types";
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { commitSessionReviews, defaultStateDeps, type StateDeps } from "@/lib/state/apply-attempt.ts";
import { privilegedDb } from "@/server/privileged/db";
import { ensurePoolStock } from "@/server/privileged/pool-store";
import {
  createSessionStore,
  type SessionStore,
  type SessionWithTasks,
  type SummaryRow,
  type TaskRow,
} from "@/server/privileged/session-store";
import { assignItems, BuildInputError, buildPackSetup, plannedMinutes, planSession, sessionTypeFor } from "./builder.ts";

type BuildSessionRequest = components["schemas"]["BuildSessionRequest"];
type CompleteSessionRequest = components["schemas"]["CompleteSessionRequest"];
type Session = components["schemas"]["Session"];
type SessionTask = components["schemas"]["SessionTask"];
type SessionSummary = components["schemas"]["SessionSummary"];

export type SessionDeps = {
  store: SessionStore;
  state: () => Promise<StateDeps>;
  /** Pool stock check and shortage job (BL-0043). */
  pool: (userId: string, skillKeys: string[], now: Date) => Promise<unknown>;
  now: () => Date;
};

export const defaultSessionDeps = (): SessionDeps => {
  const sql = privilegedDb();
  return {
    store: createSessionStore(sql),
    state: defaultStateDeps,
    pool: (userId, keys, now) => ensurePoolStock(sql, userId, keys, now),
    now: () => new Date(),
  };
};

/** A planned session older than this is abandoned (api.openapi.yaml buildSession). */
export const PLANNED_MAX_AGE_MIN = 120;
/** Default `session_idle_timeout_min` (06 section 11). */
export const IDLE_TIMEOUT_MIN = 120;
const POOL_RETRY_S = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function userId(ctx: ApiContext): string {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  return ctx.caller.userId;
}

function sessionIdParam(ctx: ApiContext): string {
  const value = ctx.params["session_id"] ?? "";
  if (!UUID.test(value)) throw new ApiError("not_found");
  return value;
}

function bad(field: string, message: string): ApiError {
  return new ApiError("validation_failed", { errors: [{ field, message }] });
}

const iso = (d: Date | null): string | null => (d === null ? null : d.toISOString());

function toTask(t: TaskRow): SessionTask {
  return {
    id: t.id,
    position: t.position,
    task_kind: t.taskKind as SessionTask["task_kind"],
    skill_key: t.skillKey,
    project_step_key: t.projectStepKey,
    item_id: t.itemId,
    status: t.status as SessionTask["status"],
    est_seconds: t.estSeconds,
    reason: t.reason as NonNullable<SessionTask["reason"]> | null,
    assessment_kind: t.assessmentKind as NonNullable<SessionTask["assessment_kind"]> | null,
  };
}

/** Allow-list projection: only the API fields are copied. */
export function toSession(s: SessionWithTasks): Session {
  return {
    id: s.id,
    session_type: s.sessionType as Session["session_type"],
    context: s.context as Session["context"],
    status: s.status as Session["status"],
    available_minutes: s.availableMinutes,
    planned_min: s.plannedMin,
    actual_min: s.actualMin,
    started_at: iso(s.startedAt),
    ended_at: iso(s.endedAt),
    builder_version: s.builderVersion,
    graph_version: s.graphVersion,
    plan_slot_id: s.planSlotId,
    tasks: s.tasks.map(toTask),
  };
}

function toSummary(s: SummaryRow): SessionSummary {
  return {
    session_id: s.sessionId,
    status: s.status as SessionSummary["status"],
    actual_min: s.actualMin,
    tasks_done: s.tasksDone,
    tasks_skipped: s.tasksSkipped,
    attempts: s.attempts,
    correct: s.correct,
    skills_touched: s.skillsTouched,
    next_due_at: iso(s.nextDueAt),
  };
}

/** Closes stale sessions and commits the review units of the idle-closed ones (06 section 3.3). */
async function sweep(deps: SessionDeps, user: string, now: Date): Promise<void> {
  const idle = await deps.store.sweep(user, now, IDLE_TIMEOUT_MIN, PLANNED_MAX_AGE_MIN);
  for (const id of idle) await commitSessionReviews(user, id, now, await deps.state());
}

export async function buildSession(ctx: ApiContext, deps: SessionDeps = defaultSessionDeps()): Promise<Response> {
  const user = userId(ctx);
  const body = ctx.body as BuildSessionRequest;
  if (body.dry_run === true) throw bad("dry_run", "previews are not available yet");
  const started = performance.now();
  const now = deps.now();
  await sweep(deps, user, now);
  if (body.plan_slot_id !== undefined && !(await deps.store.ownsPlanSlot(user, body.plan_slot_id))) throw new ApiError("not_found");
  if (await deps.store.hasOpenSession(user)) throw new ApiError("open_session_exists");

  const state = await deps.state();
  const snapshot = await deps.store.snapshot(user);
  let plan;
  let type;
  try {
    type = sessionTypeFor(body.available_minutes, body.session_type);
    const setup = buildPackSetup(snapshot, now, state.fsrs, body.skill_focus);
    if (body.skill_focus !== undefined && !computeFrontier(setup.graph, setup.states, state.params).includes(body.skill_focus)) {
      throw new BuildInputError("skill_focus", "the skill is not on the frontier or in progress");
    }
    plan = planSession(setup, type, body.context, body.available_minutes, state.params);
  } catch (error) {
    if (error instanceof BuildInputError) throw bad(error.field, error.message);
    throw error;
  }

  // Nothing useful is eligible: a clear empty result, not an error and not a stored row (06 section 7.4).
  if (plan.tasks.length === 0) {
    return json({
      dry_run: true,
      session_type: type,
      context: body.context,
      available_minutes: body.available_minutes,
      planned_min: 0,
      builder_version: "v1",
      graph_version: snapshot.graphVersion,
      plan_slot_id: body.plan_slot_id ?? null,
      tasks: [],
    });
  }

  await deps.pool(user, [...new Set(plan.tasks.flatMap((t) => (t.skill_key === null ? [] : [t.skill_key])))], now);
  const assigned = assignItems(plan.tasks, snapshot.candidates, body.context);
  if (assigned.tasks.length === 0) throw new ApiError("item_pool_empty", { retryAfterS: POOL_RETRY_S });

  // A lab slot without project steps is served as a focus session (00a G4).
  const sessionType = plan.served_as ?? type;
  const planned = plannedMinutes(sessionType, assigned.tasks, body.available_minutes);
  const id = await deps.store.create(
    user,
    {
      sessionType,
      context: body.context,
      availableMinutes: body.available_minutes,
      plannedMin: planned,
      graphVersion: snapshot.graphVersion,
      planSlotId: body.plan_slot_id ?? null,
      plan: { tasks: assigned.tasks.map((t) => ({ position: t.position, reason: t.reason })), fill: plan.fill, dropped_without_item: assigned.dropped },
      tasks: assigned.tasks,
      builderMs: Math.round(performance.now() - started),
      fill: plan.fill,
    },
    now,
  );
  if (id === null) throw new ApiError("open_session_exists");
  const session = await deps.store.find(user, id);
  if (!session) throw new Error("created session not found");
  return json(toSession(session), 201);
}

export async function getSession(ctx: ApiContext, deps: SessionDeps = defaultSessionDeps()): Promise<Response> {
  const user = userId(ctx);
  const id = sessionIdParam(ctx);
  await sweep(deps, user, deps.now());
  const session = await deps.store.find(user, id);
  if (!session) throw new ApiError("not_found");
  return json(toSession(session));
}

export async function startSession(ctx: ApiContext, deps: SessionDeps = defaultSessionDeps()): Promise<Response> {
  const user = userId(ctx);
  const id = sessionIdParam(ctx);
  const now = deps.now();
  await sweep(deps, user, now);
  const result = await deps.store.start(user, id, now);
  if (result === "not_found") throw new ApiError("not_found");
  if (result === "not_startable") throw new ApiError("session_not_startable");
  const session = await deps.store.find(user, id);
  if (!session) throw new ApiError("not_found");
  return json(toSession(session));
}

export async function completeSession(ctx: ApiContext, deps: SessionDeps = defaultSessionDeps()): Promise<Response> {
  const user = userId(ctx);
  const id = sessionIdParam(ctx);
  const body = (ctx.body ?? {}) as CompleteSessionRequest;
  const now = deps.now();
  await sweep(deps, user, now); // an idle session is closed as abandoned before it can be completed
  const closed = await deps.store.close(user, id, {
    status: body.abandon === true ? "abandoned" : "completed",
    endedAt: now,
    reason: body.abandon === true ? "abandoned" : "completed",
    perceivedDifficulty: body.perceived_difficulty,
  });
  if (closed === "not_found") throw new ApiError("not_found");
  // Also on a replay: the commit is idempotent, so a crash between close and commit heals here.
  await commitSessionReviews(user, id, now, await deps.state());
  const summary = await deps.store.summary(user, id);
  if (!summary) throw new ApiError("not_found");
  return json(toSummary(summary));
}

const encodeCursor = (s: SessionWithTasks): string =>
  Buffer.from(JSON.stringify({ c: s.createdAt.toISOString(), i: s.id })).toString("base64url");

function decodeCursor(raw: string): { createdAt: Date; id: string } {
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { c?: unknown; i?: unknown };
    const createdAt = new Date(String(v.c));
    if (typeof v.i === "string" && UUID.test(v.i) && !Number.isNaN(createdAt.getTime())) return { createdAt, id: v.i };
  } catch {
    // falls through to the validation error
  }
  throw bad("cursor", "is not a valid cursor");
}

const STATUSES = ["planned", "active", "completed", "abandoned"];

export async function listSessions(ctx: ApiContext, deps: SessionDeps = defaultSessionDeps()): Promise<Response> {
  const user = userId(ctx);
  const q = new URL(ctx.request.url).searchParams;
  const limitRaw = q.get("limit");
  const limit = limitRaw === null ? 25 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw bad("limit", "must be an integer from 1 to 100");
  const status = q.get("status") ?? undefined;
  if (status !== undefined && !STATUSES.includes(status)) throw bad("status", "is not a session status");
  const cursor = q.get("cursor");
  await sweep(deps, user, deps.now());
  const rows = await deps.store.list(user, {
    status,
    limit: limit + 1,
    before: cursor === null ? undefined : decodeCursor(cursor),
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return json({ items: page.map(toSession), next_cursor: rows.length > limit && last ? encodeCursor(last) : null });
}
