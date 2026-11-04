// 00a J9 (a) acceptance (integration, local database; skipped without one unless REQUIRE_DB=1):
// completeTask through defineRoute. Ownership 404, strict body, idempotency, the worked-example loop move.
import { randomUUID } from "node:crypto";
import { createFsrsAdapter, DEFAULT_PARAMS } from "@polymath/scheduler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { logger } from "@/lib/logger";
import { createIdempotencyStore } from "@/server/privileged/idempotency-store";
import { createStateStore } from "@/server/privileged/state-store";
import { completeTask } from "./complete.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;

const clock = new Date("2026-11-04T10:00:00Z");
const taskDeps = {
  state: async () => ({ store: createStateStore(sql), fsrs: await createFsrsAdapter(), params: DEFAULT_PARAMS }),
  now: () => clock,
};
const apiDeps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => createIdempotencyStore(sql),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
const route = (userId: string) => defineRoute("completeTask", (c) => completeTask(c, taskDeps), apiDeps(userId));

type Json = Record<string, unknown>;
const post = (userId: string, taskId: string, body: unknown, key: string = randomUUID()) =>
  route(userId)(
    new Request(`http://localhost/api/v1/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ task_id: taskId }) },
  );

const tag = randomUUID().slice(0, 8);
const moduleName = `j9${tag}`;
const skillKey = `math.${moduleName}.s1`;
let learner = "";
let other = "";
let sessionId = "";

async function addTask(session: string, userId: string, position: number, kind: string, assessmentKind: string | null = null): Promise<string> {
  const row = (
    await sql<{ id: string }[]>`insert into public.session_tasks (session_id, position, task_kind, skill_key, user_id, assessment_kind)
      values (${session}, ${position}, ${kind}::public.task_kind, ${skillKey}, ${userId}, ${assessmentKind}) returning id`
  )[0];
  return row?.id ?? "";
}
async function addSession(userId: string, status: string): Promise<string> {
  const row = (
    await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, available_minutes, status, started_at)
      values (${userId}, 'micro', 'desktop', 10, 10, ${status}::public.session_status, now()) returning id`
  )[0];
  return row?.id ?? "";
}
const count = async (table: string, userId: string): Promise<number> =>
  Number((await sql.unsafe(`select count(*) as n from public.${table} where user_id = $1`, [userId]))[0]?.["n"]);
const stateRow = async (userId: string) =>
  (await sql<{ mastery_state: string; loop_step: string | null; n_attempts: number }[]>`select mastery_state::text as mastery_state, loop_step, n_attempts
    from public.skill_state where user_id = ${userId} and skill_key = ${skillKey}`)[0];

describe.skipIf(!reachable)("completeTask (database)", () => {
  beforeAll(async () => {
    learner = await createTestUser(sql);
    other = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, '00a J9 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, '00a J9 test', 'L1', 0, 'CC0-1.0', 'j9-test', 'stub')`;
    sessionId = await addSession(learner, "active");
  });

  afterAll(async () => {
    const users = [learner, other];
    await sql`delete from public.events where user_id in ${sql(users)}`;
    await sql`delete from public.sessions where user_id in ${sql(users)}`;
    await sql`delete from public.skill_state where skill_key = ${skillKey}`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const u of users) await deleteTestUser(sql, u);
    await sql.end();
  });

  it("done on a worked example closes the task, starts the skill and moves loop_step to faded_problem; no attempt, review or Elo write", async () => {
    const taskId = await addTask(sessionId, learner, 1, "worked_example");
    const res = await post(learner, taskId, { outcome: "done", self_explanation: "Same current flows through both resistors." });
    expect(res.status).toBe(200);
    const out = (await res.json()) as { task: Json; loop_step: string | null };
    expect(out.task).toMatchObject({ id: taskId, status: "done", task_kind: "worked_example", skill_key: skillKey });
    expect(out.loop_step).toBe("faded_problem");
    expect(await stateRow(learner)).toMatchObject({ mastery_state: "learning", loop_step: "faded_problem", n_attempts: 0 });
    expect(await count("attempts", learner)).toBe(0);
    expect(await count("review_log", learner)).toBe(0);
    const plan = (await sql<{ plan: { task_outcomes?: Record<string, Json> } }[]>`select plan from public.sessions where id = ${sessionId}`)[0]?.plan;
    expect(plan?.task_outcomes?.[taskId]).toMatchObject({ outcome: "done", self_explanation: "Same current flows through both resistors." });
    const stored = (await sql<{ status: string; completed_at: Date }[]>`select status::text as status, completed_at from public.session_tasks where id = ${taskId}`)[0];
    expect(stored).toMatchObject({ status: "done" });
    expect(stored?.completed_at.toISOString()).toBe(clock.toISOString());
  });

  it("replays: the same Idempotency-Key returns the stored response; the same outcome again returns the stored task; a different outcome is 409 task_not_completable", async () => {
    const taskId = await addTask(sessionId, learner, 2, "worked_example");
    const key = randomUUID();
    const first = await post(learner, taskId, { outcome: "done" }, key);
    const firstBody = (await first.json()) as Json;
    expect(first.status).toBe(200);
    const again = await post(learner, taskId, { outcome: "done" }, key);
    expect(again.status).toBe(200);
    expect((await again.json()) as Json).toEqual(firstBody); // the stored response (jsonb reorders keys)
    const fresh = await post(learner, taskId, { outcome: "done" });
    expect(fresh.status).toBe(200);
    expect(((await fresh.json()) as { task: Json }).task["status"]).toBe("done");
    const conflict = await post(learner, taskId, { outcome: "skipped", skip_reason: "not_now" });
    expect(conflict.status).toBe(409);
    expect(((await conflict.json()) as Json)["code"]).toBe("task_not_completable");
    expect((await post(learner, taskId, { outcome: "skipped", skip_reason: "not_now" }, key)).status).toBe(409); // key reused with another body
  });

  it("returns 404 for another user's task and a malformed id, and changes nothing", async () => {
    const otherSession = await addSession(other, "active");
    const theirs = await addTask(otherSession, other, 1, "worked_example");
    const res = await post(learner, theirs, { outcome: "done" });
    expect(res.status).toBe(404);
    expect((await sql`select status::text as status from public.session_tasks where id = ${theirs}`)[0]?.["status"]).toBe("pending");
    expect((await post(learner, randomUUID(), { outcome: "done" })).status).toBe(404);
    expect((await post(learner, "not-a-uuid", { outcome: "done" })).status).toBe(404);
  });

  it("rejects an unknown field, a missing or misplaced skip_reason, an empty or over-long self_explanation (400)", async () => {
    const taskId = await addTask(sessionId, learner, 3, "worked_example");
    const bodies: unknown[] = [
      { outcome: "done", grade: 1 },
      { outcome: "maybe" },
      { outcome: "skipped" },
      { outcome: "done", skip_reason: "not_now" },
      { outcome: "skipped", skip_reason: "not_now", self_explanation: "x" },
      { outcome: "done", self_explanation: "" },
      { outcome: "done", self_explanation: "x".repeat(2001) },
    ];
    for (const body of bodies) expect((await post(learner, taskId, body)).status).toBe(400);
    expect((await post(learner, taskId, { outcome: "done", self_explanation: "x".repeat(2000) })).status).toBe(200); // the limit itself
  });

  it("refuses done on a graded task kind and skips of assessment tasks or already_know (409 task_not_completable); not_now skips an ordinary task", async () => {
    const graded = await addTask(sessionId, learner, 4, "retrieval");
    const assessed = await addTask(sessionId, learner, 5, "retrieval", "periodic");
    const ordinary = await addTask(sessionId, learner, 6, "retrieval");
    for (const [task, body] of [
      [graded, { outcome: "done" }],
      [assessed, { outcome: "skipped", skip_reason: "not_now" }],
      [ordinary, { outcome: "skipped", skip_reason: "already_know" }],
    ] as const) {
      const res = await post(learner, task, body);
      expect(res.status).toBe(409);
      expect(((await res.json()) as Json)["code"]).toBe("task_not_completable");
    }
    const skipped = await post(learner, ordinary, { outcome: "skipped", skip_reason: "not_now" });
    expect(skipped.status).toBe(200);
    expect(((await skipped.json()) as { task: Json }).task["status"]).toBe("skipped");
  });

  it("refuses a task whose session is not active", async () => {
    const planned = await addSession(learner, "completed");
    const taskId = await addTask(planned, learner, 1, "worked_example");
    const res = await post(learner, taskId, { outcome: "done" });
    expect(res.status).toBe(409);
    expect(((await res.json()) as Json)["code"]).toBe("task_not_completable");
  });
});
