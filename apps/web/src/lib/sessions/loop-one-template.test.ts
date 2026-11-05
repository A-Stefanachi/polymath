// 00a H1 regression (integration, local database; skipped without one unless REQUIRE_DB=1): real content has
// one template per skill, declared `problem`, which serves every loop stage. The learner state must follow the
// kind of the served session task, not the template's kind. Before the fix a faded problem was applied as a
// `problem`: loop_step stayed `faded_problem` (every later session served another faded problem and the skill
// never reached its retrieval), and the faded attempt was committed as an FSRS review.
import { randomUUID } from "node:crypto";
import { createFsrsAdapter, DEFAULT_PARAMS } from "@polymath/scheduler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { applyGradedAttempt, commitSessionReviews, sharedFsrsPort } from "@/lib/state/apply-attempt.ts";
import { completeTask } from "@/lib/tasks/complete.ts";
import { createIdempotencyStore } from "@/server/privileged/idempotency-store";
import { ensurePoolStock } from "@/server/privileged/pool-store";
import { createSessionStore } from "@/server/privileged/session-store";
import { createStateStore } from "@/server/privileged/state-store";
import { buildSession, type SessionDeps } from "./sessions.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;

let clock = new Date(Date.UTC(2026, 10, 2, 10, 0, 0));
const stateDeps = async () => ({ store: createStateStore(sql), fsrs: await createFsrsAdapter(), params: DEFAULT_PARAMS });
const sessionDeps: SessionDeps = {
  store: createSessionStore(sql),
  state: stateDeps,
  pool: (userId, keys, now) => ensurePoolStock(sql, userId, keys, now),
  now: () => clock,
};
const tag = randomUUID().slice(0, 8);
const moduleName = `h1${tag}`;
const skill = `math.${moduleName}.s1`;
const template = `tpl.math.h1-only-${tag}`;
let user = "";

type Task = { id: string; session_id?: string; task_kind: string; item_id: string; skill_key: string };
type Session = { id: string; tasks: Task[] };
const apiDeps = (): ApiDeps => ({
  authenticate: async () => ({ userId: user }),
  idempotency: () => createIdempotencyStore(sql),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});

async function build(): Promise<Session> {
  const route = defineRoute("buildSession", (c) => buildSession(c, sessionDeps), apiDeps());
  const res = await route(
    new Request("http://localhost/api/v1/sessions/build", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `h1-${randomUUID()}` },
      body: JSON.stringify({ available_minutes: 20, context: "desktop", session_type: "micro", skill_focus: skill }),
    }),
    { params: Promise.resolve({}) },
  );
  expect(res.status).toBe(201);
  const session = (await res.json()) as Session;
  await sql`update public.sessions set status = 'active', started_at = ${clock.toISOString()} where id = ${session.id}`;
  return session;
}

async function close(session: Session): Promise<void> {
  await sql`update public.sessions set status = 'completed', ended_at = ${clock.toISOString()} where id = ${session.id}`;
  await commitSessionReviews(user, session.id, clock, await stateDeps());
}

async function completeWorkedExample(task: Task): Promise<void> {
  const route = defineRoute("completeTask", (c) => completeTask(c, { state: stateDeps, now: () => clock }), apiDeps());
  const res = await route(
    new Request(`http://localhost/api/v1/tasks/${task.id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `h1-${randomUUID()}` },
      body: JSON.stringify({ outcome: "done" }),
    }),
    { params: Promise.resolve({ task_id: task.id }) },
  );
  expect(res.status).toBe(200);
}

async function answer(session: Session, task: Task, score = 1): Promise<void> {
  clock = new Date(clock.getTime() + 60_000);
  const grade = { status: "graded", score, correct: score >= 0.8, graders: [], mastery_eligible: true };
  const row = (
    await sql<{ id: string }[]>`
      insert into public.attempts (user_id, item_id, session_id, session_task_id, started_at, submitted_at, response, grade, grade_status, graded_at, client_attempt_id)
      values (${user}, ${task.item_id}, ${session.id}, ${task.id}, ${new Date(clock.getTime() - 30_000).toISOString()}, ${clock.toISOString()},
              ${sql.json({ kind: "numeric", value: 1 })}, ${sql.json(grade)}, 'graded', ${clock.toISOString()}, ${randomUUID()}) returning id`
  )[0];
  expect(row?.id).toBeTruthy();
  await applyGradedAttempt(row?.id ?? "", clock, { store: createStateStore(sql), fsrs: await sharedFsrsPort(), params: DEFAULT_PARAMS });
}

const loopStep = async (): Promise<string | null> =>
  ((await sql<{ loop_step: string | null }[]>`select loop_step from public.skill_state where user_id = ${user} and skill_key = ${skill}`)[0] ?? { loop_step: null }).loop_step;
const reviews = async (): Promise<number> =>
  (await sql<{ n: number }[]>`select count(*)::int as n from public.review_log where user_id = ${user} and skill_key = ${skill}`)[0]?.n ?? -1;

describe.skipIf(!reachable)("learning loop on one `problem` template (00a H1, database)", () => {
  beforeAll(async () => {
    user = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'H1 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
      values (${skill}, 'math', ${moduleName}, 'H1 test', 'L1', 10, 'CC0-1.0', 'h1-test', 'verified',
              ${sql.array(["worked_example", "faded_problem", "retrieval", "problem"])}::public.task_kind[], ${sql.array(["exact_numeric"])}::public.grader_type[], true)`;
    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
      values (${template}, ${skill}, 'problem', 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'h1-test', true)`;
    for (let seed = 1; seed <= 10; seed += 1) {
      await sql`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
        values (${template}, 1, ${seed}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified', ${user})`;
    }
  });

  afterAll(async () => {
    await sql`delete from public.jobs where user_id = ${user}`;
    await sql`delete from public.events where user_id = ${user}`;
    await sql`delete from public.attempts where user_id = ${user}`;
    await sql`delete from public.review_log where user_id = ${user}`;
    await sql`delete from public.sessions where user_id = ${user}`;
    await sql`delete from public.skill_state where user_id = ${user}`;
    await sql`delete from public.items where template_key = ${template}`;
    await sql`delete from public.item_templates where key = ${template}`;
    await sql`delete from public.skills where key = ${skill}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await deleteTestUser(sql, user);
    await sql.end();
  });

  it("follows the served task's kind: the faded problem advances to the retrieval and is not an FSRS review", async () => {
    const s1 = await build();
    expect(s1.tasks.map((t) => t.task_kind)).toEqual(["worked_example", "faded_problem"]);
    await completeWorkedExample(s1.tasks[0] as Task);
    expect(await loopStep()).toBe("faded_problem");
    await answer(s1, s1.tasks[1] as Task);
    expect(await loopStep()).toBe("retrieval_same_day");
    await close(s1);
    expect(await reviews()).toBe(0); // the card is created at the same-day retrieval (06 section 3.1), not here

    clock = new Date(clock.getTime() + 3 * 3600_000);
    const s2 = await build();
    expect(s2.tasks.map((t) => t.task_kind)).toEqual(["retrieval"]);
    await answer(s2, s2.tasks[0] as Task);
    expect(await loopStep()).toBe("practice");
    await close(s2);
    expect(await reviews()).toBe(1);

    const s3 = await build();
    expect(s3.tasks.map((t) => t.task_kind)).toEqual(["problem"]);
    await answer(s3, s3.tasks[0] as Task, 0.4);
    expect(await loopStep()).toBe("done");
  });
});
