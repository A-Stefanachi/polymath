// BL-0045 acceptance (integration, local database; skipped without one unless REQUIRE_DB=1): a new skill passes
// through the learning loop in order over scripted sessions (FR-030, LS-006), and the retrieval is carried
// when its PRM-04 gap is not met. Attempts are inserted as graded rows and applied by applyGradedAttempt.
import { randomUUID } from "node:crypto";
import { createFsrsAdapter, DEFAULT_PARAMS } from "@polymath/scheduler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { applyGradedAttempt, sharedFsrsPort } from "@/lib/state/apply-attempt.ts";
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
const sessionDeps: SessionDeps = {
  store: createSessionStore(sql),
  state: async () => ({ store: createStateStore(sql), fsrs: await createFsrsAdapter(), params: DEFAULT_PARAMS }),
  pool: (userId, keys, now) => ensurePoolStock(sql, userId, keys, now),
  now: () => clock,
};
const tag = randomUUID().slice(0, 8);
const moduleName = `bl45${tag}`;
const skill = `math.${moduleName}.s1`;
const KINDS = ["worked_example", "faded_problem", "retrieval", "problem"];
const tpl = (k: string) => `tpl.math.bl45-${k.replaceAll("_", "")}-${tag}`;
let user = "";
let seed = 1;

type Task = { task_kind: string; item_id: string; skill_key: string };
const apiDeps = (): ApiDeps => ({
  authenticate: async () => ({ userId: user }),
  idempotency: () => createIdempotencyStore(sql),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});

async function build(): Promise<Task[]> {
  await sql`update public.sessions set status = 'abandoned', ended_at = now() where user_id = ${user} and status in ('planned', 'active')`;
  const route = defineRoute("buildSession", (c) => buildSession(c, sessionDeps), apiDeps());
  const res = await route(
    new Request("http://localhost/api/v1/sessions/build", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `bl45-${randomUUID()}` },
      body: JSON.stringify({ available_minutes: 20, context: "desktop", session_type: "micro", skill_focus: skill }),
    }),
    { params: Promise.resolve({}) },
  );
  expect(res.status).toBe(201);
  return ((await res.json()) as { tasks: Task[] }).tasks;
}

async function answer(task: Task, score = 1): Promise<void> {
  clock = new Date(clock.getTime() + 60_000);
  const grade = { status: "graded", score, correct: score >= 0.8, graders: [], mastery_eligible: true };
  const row = (
    await sql<{ id: string }[]>`
      insert into public.attempts (user_id, item_id, started_at, submitted_at, response, grade, grade_status, graded_at, client_attempt_id)
      values (${user}, ${task.item_id}, ${new Date(clock.getTime() - 30_000).toISOString()}, ${clock.toISOString()},
              ${sql.json({ kind: "numeric", value: 1 })}, ${sql.json(grade)}, 'graded', ${clock.toISOString()}, ${randomUUID()}) returning id`
  )[0];
  await applyGradedAttempt(row?.id ?? "", clock, { store: createStateStore(sql), fsrs: await sharedFsrsPort(), params: DEFAULT_PARAMS });
}

const loopStep = async (): Promise<string | null> =>
  ((await sql<{ loop_step: string | null }[]>`select loop_step from public.skill_state where user_id = ${user} and skill_key = ${skill}`)[0] ?? { loop_step: null }).loop_step;

describe.skipIf(!reachable)("new-skill learning loop (database)", () => {
  beforeAll(async () => {
    user = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0045 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
      values (${skill}, 'math', ${moduleName}, 'BL-0045 test', 'L1', 10, 'CC0-1.0', 'bl0045-test', 'draft',
              ${sql.array(KINDS)}::public.task_kind[], ${sql.array(["exact_numeric"])}::public.grader_type[], true)`;
    for (const kind of KINDS) {
      await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
        values (${tpl(kind)}, ${skill}, ${kind}, 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0045-test', true)`;
      for (let i = 0; i < 4; i += 1) {
        await sql`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
          values (${tpl(kind)}, 1, ${seed++}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified', ${user})`;
      }
    }
  });

  afterAll(async () => {
    await sql`delete from public.jobs where user_id = ${user}`;
    await sql`delete from public.events where user_id = ${user}`;
    await sql`delete from public.attempts where user_id = ${user}`;
    await sql`delete from public.review_log where user_id = ${user}`;
    await sql`delete from public.sessions where user_id = ${user}`;
    await sql`delete from public.skill_state where user_id = ${user}`;
    await sql`delete from public.items where template_key in ${sql(KINDS.map(tpl))}`;
    await sql`delete from public.item_templates where key in ${sql(KINDS.map(tpl))}`;
    await sql`delete from public.skills where key = ${skill}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await deleteTestUser(sql, user);
    await sql.end();
  });

  it("AC-1/AC-2: worked example, faded problem, then the carried retrieval, then practice, then done, in order", async () => {
    // Session 1: the chunk. Its same-day retrieval would follow the faded problem with 0 intervening tasks,
    // so it is carried rather than served (PRM-04).
    const s1 = await build();
    expect(s1.map((t) => t.task_kind)).toEqual(["worked_example", "faded_problem"]);
    expect(s1.every((t) => t.skill_key === skill)).toBe(true);
    await answer(s1[0] as Task);
    expect(await loopStep()).toBe("faded_problem");
    await answer(s1[1] as Task);
    expect(await loopStep()).toBe("retrieval_same_day");

    // Session 2 (same day, later): the retrieval alone, with no worked example in the session.
    clock = new Date(clock.getTime() + 3 * 3600_000);
    const s2 = await build();
    expect(s2.map((t) => t.task_kind)).toEqual(["retrieval"]);
    await answer(s2[0] as Task);
    expect(await loopStep()).toBe("practice");

    // Session 3: one problem; any score completes the loop.
    const s3 = await build();
    expect(s3.map((t) => t.task_kind)).toEqual(["problem"]);
    await answer(s3[0] as Task, 0.4);
    expect(await loopStep()).toBe("done");

    // Every item served over the whole loop is distinct.
    const ids = [...s1, ...s2, ...s3].map((t) => t.item_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("AC-3: reviews built after the loop never reuse an item or a (template, seed) already served", async () => {
    const served = await sql<{ template_key: string; seed: string }[]>`
      select i.template_key, i.seed::text as seed from public.attempts a join public.items i on i.id = a.item_id where a.user_id = ${user}`;
    const seen = new Set(served.map((r) => `${r.template_key}|${r.seed}`));
    expect(seen.size).toBe(4);
    clock = new Date(clock.getTime() + 20 * 86_400_000);
    const next = await build();
    for (const t of next) {
      const row = (await sql<{ template_key: string; seed: string }[]>`select template_key, seed::text as seed from public.items where id = ${t.item_id}`)[0];
      expect(seen.has(`${row?.template_key}|${row?.seed}`)).toBe(false);
    }
  });
});
