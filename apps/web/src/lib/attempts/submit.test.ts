// BL-0026 acceptance: submitAttempt for numeric and multiple-choice items against the local database
// (ST-API-03, -06, -07, -08; FR-061). Sessions and session_tasks have no creation route until
// BL-0044, so the fixtures insert them directly with the test connection.
// Skipped without a database unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createAttemptStore } from "@/server/privileged/attempt-store";
import { createServeStore } from "@/server/privileged/item-store";
import { submitAttempt } from "./submit.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;
const stores = { serve: createServeStore(sql), attempts: createAttemptStore(sql) };

const deps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => ({ claim: async () => ({ kind: "new" as const }), complete: async () => undefined, release: async () => undefined }),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
const route = (userId: string) => defineRoute("submitAttempt", (ctx) => submitAttempt(ctx, stores), deps(userId));

const tag = randomUUID().slice(0, 8);
const moduleName = `bl26${tag}`;
const skillKey = `math.${moduleName}.s1`;
const tplNum = `tpl.math.bl26n-${tag}`;
const tplMc = `tpl.math.bl26m-${tag}`;
const REFERENCE = 7.3125; // distinctive: must never appear in a response

let learner = "";
let other = "";
const itemIds: string[] = [];
const fx: Record<string, string> = {};
let seed = 1;

async function addTemplate(key: string, grader: string): Promise<void> {
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, pool)
    values (${key}, ${skillKey}, 'retrieval', ${grader}, 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0026-test', 'practice')`;
}

async function addItem(name: string, template: string, answerKey: object, status = "verified"): Promise<string> {
  const row = (
    await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, params, rendered, verification_report, status)
      values (${template}, 1, ${seed++}, ${sql.json({})}, ${sql.json({ stem_md: "q", options: ["o1", "o2", "o3"].map((id) => ({ id, text_md: id })) })}, ${sql.json({ verifier: "x", agreed: true })}, ${status}) returning id`
  )[0];
  const id = row?.id ?? "";
  await sql`insert into public.item_secrets (item_id, answer_key) values (${id}, ${sql.json(answerKey as Parameters<typeof sql.json>[0])})`;
  itemIds.push(id);
  fx[name] = id;
  return id;
}

async function addTask(userId: string, itemId: string): Promise<{ sessionId: string; taskId: string }> {
  const session = (
    await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
      values (${userId}, 'micro', 'desktop', 10, 10) returning id`
  )[0];
  const task = (
    await sql<{ id: string }[]>`insert into public.session_tasks (session_id, position, task_kind, skill_key, item_id, user_id)
      values (${session?.id ?? ""}, 1, 'retrieval', ${skillKey}, ${itemId}, ${userId}) returning id`
  )[0];
  return { sessionId: session?.id ?? "", taskId: task?.id ?? "" };
}

const numericKey = {
  grader_type: "exact_numeric",
  answer_spec: { kind: "numeric", unit: "V", tolerance: { rel: 0.01 } },
  reference: REFERENCE,
};
const mcKey = { grader_type: "multiple_choice", reference: { correct_option: "o2", option_ids: ["o1", "o2", "o3"] } };

type Overrides = Record<string, unknown>;
function bodyFor(itemId: string, response: unknown, o: Overrides = {}): Overrides {
  return {
    client_attempt_id: randomUUID(),
    item_id: itemId,
    started_at: "2026-11-01T07:31:00Z",
    submitted_at: "2026-11-01T07:31:42Z",
    response,
    ...o,
  };
}
const post = (userId: string, body: unknown) =>
  route(userId)(
    new Request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
const num = (value: number, unit = "V") => ({ kind: "numeric", value, unit });
const count = async (table: string, userId: string, clientId?: string) =>
  Number(
    (
      await sql.unsafe(
        `select count(*) as n from public.${table} where user_id = $1 ${clientId ? "and client_attempt_id = $2" : ""}`,
        clientId ? [userId, clientId] : [userId],
      )
    )[0]?.["n"],
  );

describe.skipIf(!reachable)("submitAttempt (database)", () => {
  beforeAll(async () => {
    learner = await createTestUser(sql);
    other = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0026 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, 'BL-0026 test', 'L1', 0, 'CC0-1.0', 'bl0026-test', 'stub')`;
    await addTemplate(tplNum, "exact_numeric");
    await addTemplate(tplMc, "multiple_choice");
    await addItem("num", tplNum, numericKey);
    await addItem("mc", tplMc, mcKey);
    await addItem("draft", tplNum, numericKey, "draft");
  });

  afterAll(async () => {
    await sql`delete from public.events where user_id in (${learner}, ${other})`;
    await sql`delete from public.attempts where user_id in (${learner}, ${other})`;
    await sql`delete from public.sessions where user_id in (${learner}, ${other})`;
    await sql`delete from public.items where id in ${sql(itemIds)}`;
    await sql`delete from public.item_templates where key in (${tplNum}, ${tplMc})`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await deleteTestUser(sql, learner);
    await deleteTestUser(sql, other);
    await sql.end();
  });

  it("grades a correct numeric answer: correct true, score 1, row graded, one event (FR-061)", async () => {
    const { sessionId, taskId } = await addTask(learner, fx["num"] ?? "");
    const body = bodyFor(fx["num"] ?? "", num(REFERENCE), { session_id: sessionId, session_task_id: taskId, confidence: 5 });
    const res = await post(learner, body);
    expect(res.status).toBe(200);
    const out = (await res.json()) as { grade: { score: number; correct: boolean; status: string }; grade_status: string; unaided: boolean; hints_used: number };
    expect(out.grade).toMatchObject({ status: "graded", score: 1, correct: true });
    expect(out).toMatchObject({ grade_status: "graded", hints_used: 0, unaided: true });
    const row = (await sql`select grade_status, grade, session_id, session_task_id, grader_version, max_hint_level, unaided
      from public.attempts where client_attempt_id = ${body["client_attempt_id"] as string}`)[0];
    expect(row).toMatchObject({ grade_status: "graded", session_id: sessionId, session_task_id: taskId, max_hint_level: 0, unaided: true });
    const ev = await sql`select props from public.events where user_id = ${learner} and name = 'attempt_submitted'`;
    expect(ev).toHaveLength(1);
    expect(ev[0]?.["props"]).toMatchObject({ correct: true, score: 1, hints_used: 0, unaided: true, skill_key: skillKey });
  });

  it("grades a wrong numeric answer score 0 and does not reveal the key (rules 2.3, 2.6)", async () => {
    const wrongBody = bodyFor(fx["num"] ?? "", num(REFERENCE * 2));
    const res = await post(learner, wrongBody);
    const text = await res.text();
    const out = JSON.parse(text) as { grade: { score: number; correct: boolean } };
    expect(res.status).toBe(200);
    expect(out.grade).toMatchObject({ score: 0, correct: false });
    expect(text).not.toContain(String(REFERENCE));
    expect(text).not.toContain("answer_spec");
    const stored = JSON.stringify((await sql`select grade from public.attempts where client_attempt_id = ${wrongBody["client_attempt_id"] as string}`).map((r) => r["grade"]));
    expect(stored).not.toContain(String(REFERENCE));
  });

  it("grades multiple choice right and wrong; a never-shown option is 400 and stores nothing", async () => {
    const right = await (await post(learner, bodyFor(fx["mc"] ?? "", { kind: "choice", choice_ids: ["o2"] }))).json();
    expect(right).toMatchObject({ grade: { score: 1, correct: true } });
    const wrong = await (await post(learner, bodyFor(fx["mc"] ?? "", { kind: "choice", choice_ids: ["o1"] }))).json();
    expect(wrong).toMatchObject({ grade: { score: 0, correct: false } });
    const before = await count("attempts", learner);
    const res = await post(learner, bodyFor(fx["mc"] ?? "", { kind: "choice", choice_ids: ["zz"] }));
    expect(res.status).toBe(400);
    expect(await count("attempts", learner)).toBe(before);
  });

  it("BL-0055: an option in the key but missing from the rendered options was not shown: 400, nothing stored", async () => {
    const id = await addItem("mcHidden", tplMc, mcKey);
    await sql`update public.items set rendered = ${sql.json({ stem_md: "q", options: [{ id: "o1", text_md: "a" }, { id: "o2", text_md: "b" }] })} where id = ${id}`;
    const before = await count("attempts", learner);
    const res = await post(learner, bodyFor(id, { kind: "choice", choice_ids: ["o3"] }));
    expect(res.status).toBe(400);
    expect(await count("attempts", learner)).toBe(before);
    expect((await post(learner, bodyFor(id, { kind: "choice", choice_ids: ["o2"] }))).status).toBe(200);
  });

  it("stores unparseable numeric input as invalid_input with null score, not as wrong (00a B4)", async () => {
    const res = await post(learner, bodyFor(fx["num"] ?? "", num(1, "kg")));
    const out = (await res.json()) as { grade_status: string; grade: { score: unknown; correct: unknown } };
    expect(res.status).toBe(200);
    expect(out.grade_status).toBe("invalid_input");
    expect(out.grade).toMatchObject({ score: null, correct: null });
  });

  it("ten replays of one client_attempt_id leave one row and one event, same response (ST-API-07)", async () => {
    const body = bodyFor(fx["num"] ?? "", num(REFERENCE));
    const clientId = body["client_attempt_id"] as string;
    const first = await (await post(learner, body)).text();
    for (let i = 0; i < 10; i++) expect(await (await post(learner, body)).text()).toBe(first);
    expect(await count("attempts", learner, clientId)).toBe(1);
    const events = await sql`select 1 from public.events where user_id = ${learner} and name = 'attempt_submitted' and props->>'attempt_id' = ${(JSON.parse(first) as { id: string }).id}`;
    expect(events).toHaveLength(1);
  });

  it("two concurrent submits make one row, one event and identical responses (ST-API-08)", async () => {
    const body = bodyFor(fx["num"] ?? "", num(REFERENCE));
    const clientId = body["client_attempt_id"] as string;
    const [a, b] = await Promise.all([post(learner, body), post(learner, body)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await a.text()).toBe(await b.text());
    expect(await count("attempts", learner, clientId)).toBe(1);
    const id = (await sql<{ id: string }[]>`select id from public.attempts where client_attempt_id = ${clientId}`)[0]?.id ?? "";
    expect(await sql`select 1 from public.events where props->>'attempt_id' = ${id}`).toHaveLength(1);
  });

  it("ignores a forged client_grade: the server grade wins and the forgery is kept for audit only (ST-API-06)", async () => {
    const body = bodyFor(fx["num"] ?? "", num(REFERENCE * 3), { offline: true, client_grade: { score: 1, correct: true } });
    const out = (await (await post(learner, body)).json()) as { grade: { score: number; correct: boolean } };
    expect(out.grade).toMatchObject({ score: 0, correct: false });
    const row = (await sql`select grade, client_grade, offline from public.attempts where client_attempt_id = ${body["client_attempt_id"] as string}`)[0];
    expect(row?.["grade"]).toMatchObject({ score: 0, correct: false });
    expect(row?.["client_grade"]).toEqual({ score: 1, correct: true });
    expect(row?.["offline"]).toBe(true);
  });

  it("rejects server-owned fields in the body (strict schema): grade, unaided, hints_used (ST-API-06)", async () => {
    const forged = { grade: { score: 1, correct: true }, unaided: true, hints_used: 0, grade_status: "graded" };
    for (const [k, v] of Object.entries(forged)) {
      const res = await post(learner, bodyFor(fx["num"] ?? "", num(1), { [k]: v }));
      expect(res.status).toBe(400);
    }
  });

  it("returns 404 for another user's session task (ST-API-03) and stores nothing", async () => {
    const { sessionId, taskId } = await addTask(other, fx["num"] ?? "");
    const before = await count("attempts", learner);
    const res = await post(learner, bodyFor(fx["num"] ?? "", num(REFERENCE), { session_id: sessionId, session_task_id: taskId }));
    expect(res.status).toBe(404);
    expect(await count("attempts", learner)).toBe(before);
    expect((await post(learner, bodyFor(fx["num"] ?? "", num(1), { session_id: sessionId }))).status).toBe(404);
  });

  it("returns 404 when the task belongs to a different item, and for an unverified item (serve gate)", async () => {
    const { taskId } = await addTask(learner, fx["mc"] ?? "");
    expect((await post(learner, bodyFor(fx["num"] ?? "", num(1), { session_task_id: taskId }))).status).toBe(404);
    expect((await post(learner, bodyFor(fx["draft"] ?? "", num(REFERENCE)))).status).toBe(404);
    expect((await post(learner, bodyFor(randomUUID(), num(1)))).status).toBe(404);
  });

  it("checks the time order and the confidence limits (1 and 5 accepted, 0 and 6 refused)", async () => {
    const item = fx["num"] ?? "";
    expect((await post(learner, bodyFor(item, num(1), { started_at: "2026-11-01T07:32:00Z" }))).status).toBe(400);
    expect((await post(learner, bodyFor(item, num(1), { confidence: 1 }))).status).toBe(200);
    expect((await post(learner, bodyFor(item, num(1), { confidence: 5 }))).status).toBe(200);
    expect((await post(learner, bodyFor(item, num(1), { confidence: 0 }))).status).toBe(400);
    expect((await post(learner, bodyFor(item, num(1), { confidence: 6 }))).status).toBe(400);
  });

  it("00a J9 (b): a graded attempt marks its session task done in the same transaction; invalid_input and a replay do not change it", async () => {
    const statusOf = async (id: string) => (await sql<{ status: string; completed_at: Date | null }[]>`select status::text as status, completed_at from public.session_tasks where id = ${id}`)[0];
    const invalid = await addTask(learner, fx["num"] ?? "");
    expect((await post(learner, bodyFor(fx["num"] ?? "", num(1, "kg"), { session_id: invalid.sessionId, session_task_id: invalid.taskId }))).status).toBe(200);
    expect((await statusOf(invalid.taskId))?.status).toBe("pending"); // not an attempt: the learner re-answers

    const { sessionId, taskId } = await addTask(learner, fx["num"] ?? "");
    const body = bodyFor(fx["num"] ?? "", num(REFERENCE * 2), { session_id: sessionId, session_task_id: taskId });
    expect((await post(learner, body)).status).toBe(200);
    const done = await statusOf(taskId);
    expect(done?.status).toBe("done"); // a wrong answer is still an answered task
    expect(done?.completed_at).not.toBeNull();
    expect((await post(learner, body)).status).toBe(200); // replay
    expect((await statusOf(taskId))?.status).toBe("done");
  });

  it("does not write skill_state or review_log (BL-0042 owns them)", async () => {
    expect(await count("skill_state", learner)).toBe(0);
    expect(await count("review_log", learner)).toBe(0);
  });
});
