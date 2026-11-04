// BL-0056 acceptance: reportItem, retireItem, listItemReports, resolveItemReport against the local database
// (FR-066, US-026, doc 07 section 8, ST-API-10). Skipped without a database unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createServeStore } from "@/server/privileged/item-store";
import { createReportStore } from "@/server/privileged/report-store";
import { createStateStore } from "@/server/privileged/state-store";
import { sharedFsrsPort } from "@/lib/state/apply-attempt.ts";
import { rebuildSkillState } from "@/lib/state/rebuild-skill.ts";
import { DEFAULT_PARAMS } from "@polymath/scheduler";
import { listItemReports, reportItem, resolveItemReport, retireItem } from "./report.ts";
import { readItem, readTask } from "./serve.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;
const serve = createServeStore(sql);
const stores = {
  reports: createReportStore(sql),
  serve,
  rebuild: async (t: { userId: string; skillKey: string }, now: Date) =>
    rebuildSkillState(t.userId, t.skillKey, now, { store: createStateStore(sql), fsrs: await sharedFsrsPort(), params: DEFAULT_PARAMS }),
};

const deps = (userId: string, wait = 0): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => ({ claim: async () => ({ kind: "new" as const }), complete: async () => undefined, release: async () => undefined }),
  rateLimit: () => ({ take: async () => wait }),
  logger: silent,
});
const jsonPost = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const report = (userId: string, itemId: string, body: unknown, wait = 0) =>
  defineRoute("reportItem", (ctx) => reportItem(ctx, stores), deps(userId, wait))(jsonPost(`http://localhost/api/v1/items/${itemId}/report`, body), {
    params: Promise.resolve({ item_id: itemId }),
  });
const retire = (userId: string, itemId: string, body: unknown) =>
  defineRoute("retireItem", (ctx) => retireItem(ctx, stores), deps(userId))(jsonPost(`http://localhost/api/v1/admin/items/${itemId}/retire`, body), {
    params: Promise.resolve({ item_id: itemId }),
  });
const list = (userId: string, query = "") =>
  defineRoute("listItemReports", (ctx) => listItemReports(ctx, stores), deps(userId))(new Request(`http://localhost/api/v1/admin/item-reports${query}`));
const resolve = (userId: string, reportId: string, body: unknown) =>
  defineRoute("resolveItemReport", (ctx) => resolveItemReport(ctx, stores), deps(userId))(
    jsonPost(`http://localhost/api/v1/admin/item-reports/${reportId}/resolve`, body),
    { params: Promise.resolve({ report_id: reportId }) },
  );
const fetchItem = (userId: string, id: string) =>
  defineRoute("getItem", (ctx) => readItem(ctx, serve), deps(userId))(new Request(`http://localhost/api/v1/items/${id}`), {
    params: Promise.resolve({ item_id: id }),
  });
const fetchTask = (userId: string, id: string) =>
  defineRoute("getTask", (ctx) => readTask(ctx, serve), deps(userId))(new Request(`http://localhost/api/v1/tasks/${id}`), {
    params: Promise.resolve({ task_id: id }),
  });

const tag = randomUUID().slice(0, 8);
const moduleName = `bl56${tag}`;
const skillKey = `math.${moduleName}.s1`;
const tplA = `tpl.math.bl56a-${tag}`;
const tplB = `tpl.math.bl56b-${tag}`;
const SECRET = `SECRET-${tag}`;
const users: string[] = [];
let learner = "";
let other = "";
let third = "";
let fourth = "";
let admin = "";
const itemIds: string[] = [];
let seed = 1;

async function addTemplate(key: string): Promise<void> {
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, pool)
    values (${key}, ${skillKey}, 'retrieval', 'exact_numeric', 'verified', ${sql.json({ answer: SECRET })}, 'CC0-1.0', 'bl0056-test', 'practice')`;
}
async function addItem(template: string): Promise<string> {
  const id = (
    await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, params, rendered, verification_report, status)
      values (${template}, 1, ${seed++}, ${sql.json({})}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified') returning id`
  )[0]?.id;
  if (!id) throw new Error("item insert failed");
  await sql`insert into public.item_secrets (item_id, answer_key) values (${id}, ${sql.json({ v: SECRET })})`;
  itemIds.push(id);
  return id;
}
async function addAttempt(userId: string, itemId: string): Promise<string> {
  const at = new Date();
  const id = (
    await sql<{ id: string }[]>`insert into public.attempts (user_id, item_id, client_attempt_id, started_at, submitted_at, response, grade, grade_status, graded_at, unaided, max_hint_level)
      values (${userId}, ${itemId}, ${randomUUID()}, ${at}, ${at}, ${sql.json({ kind: "numeric", value: 1 })},
              ${sql.json({ status: "graded", score: 0, correct: false, graders: [] })}, 'graded', ${at}, true, 0) returning id`
  )[0]?.id;
  if (!id) throw new Error("attempt insert failed");
  return id;
}
async function addTask(userId: string, itemId: string): Promise<string> {
  const session = (
    await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
      values (${userId}, 'micro', 'desktop', 10, 10) returning id`
  )[0]?.id;
  const task = (
    await sql<{ id: string }[]>`insert into public.session_tasks (session_id, position, task_kind, skill_key, item_id, user_id)
      values (${session ?? ""}, 1, 'retrieval', ${skillKey}, ${itemId}, ${userId}) returning id`
  )[0]?.id;
  return task ?? "";
}
const itemStatus = async (id: string) => (await sql<{ status: string }[]>`select status::text as status from public.items where id = ${id}`)[0]?.status;

describe.skipIf(!reachable)("report a problem, quarantine and retire (database)", () => {
  beforeAll(async () => {
    for (let n = 0; n < 5; n += 1) users.push(await createTestUser(sql));
    [learner = "", other = "", third = "", fourth = "", admin = ""] = users;
    await sql`insert into public.admin_users (user_id) values (${admin})`;
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0056 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, 'BL-0056 test', 'L1', 0, 'CC0-1.0', 'bl0056-test', 'stub')`;
    await addTemplate(tplA);
    await addTemplate(tplB);
  });

  afterAll(async () => {
    await sql`delete from public.events where user_id in ${sql(users)}`;
    await sql`delete from public.attempts where user_id in ${sql(users)}`;
    await sql`delete from public.sessions where user_id in ${sql(users)}`;
    await sql`delete from public.item_reports where user_id in ${sql(users)}`;
    await sql`delete from public.items where id in ${sql(itemIds)}`;
    await sql`delete from public.items where template_key in (select key from public.item_templates where skill_key = ${skillKey})`;
    await sql`delete from public.item_templates where skill_key = ${skillKey}`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await sql`delete from public.admin_users where user_id = ${admin}`;
    for (const id of users) await deleteTestUser(sql, id);
    await sql.end();
  });

  it("AC-1/AC-2: a wrong_answer report quarantines the item and flags the attempt within 1 s; nobody is served it after", async () => {
    const item = await addItem(tplA);
    const attemptId = await addAttempt(learner, item);
    const taskId = await addTask(other, item);
    expect((await fetchItem(other, item)).status).toBe(200);

    const started = Date.now();
    const res = await report(learner, item, { reason: "wrong_answer", note: "key looks off", attempt_id: attemptId });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ recorded: true });
    expect(await itemStatus(item)).toBe("needs_human_review");
    const grade = (await sql<{ grade: { disputed?: boolean } }[]>`select grade from public.attempts where id = ${attemptId}`)[0]?.grade;
    expect(grade?.disputed).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);

    const ev = await sql`select props from public.events where user_id = ${learner} and name = 'item_reported'`;
    expect(ev).toHaveLength(1);
    expect(ev[0]?.["props"]).toMatchObject({ item_id: item, template_key: tplA, reason: "wrong_answer" });
    expect(JSON.stringify(ev[0]?.["props"])).not.toContain("key looks off");

    for (const viewer of [learner, other, third]) expect((await fetchItem(viewer, item)).status).toBe(404);
    expect((await fetchTask(other, taskId)).status).toBe(404);
  });

  it("flags only the reporter's attempt and leaves the response free of secret fields", async () => {
    const item = await addItem(tplA);
    const mine = await addAttempt(learner, item);
    const theirs = await addAttempt(other, item);
    const res = await report(learner, item, { reason: "wrong_answer" }); // no attempt_id: the latest graded one is used
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
    const disputed = async (id: string) => (await sql<{ d: string | null }[]>`select grade ->> 'disputed' as d from public.attempts where id = ${id}`)[0]?.d;
    expect(await disputed(mine)).toBe("true");
    expect(await disputed(theirs)).toBeNull();
  });

  it("a replayed report writes one row and one event", async () => {
    const item = await addItem(tplA);
    expect((await report(learner, item, { reason: "wrong_answer" })).status).toBe(202);
    expect((await report(learner, item, { reason: "wrong_answer" })).status).toBe(202);
    const rows = await sql`select 1 from public.item_reports where user_id = ${learner} and item_id = ${item}`;
    const events = await sql`select 1 from public.events where user_id = ${learner} and name = 'item_reported' and props->>'item_id' = ${item}`;
    expect(rows).toHaveLength(1);
    expect(events).toHaveLength(1);
  });

  it("rejects extra fields and unknown reasons with 400, and a rate-limited caller with 429", async () => {
    const item = await addItem(tplA);
    expect((await report(learner, item, { reason: "wrong_answer", is_admin: true })).status).toBe(400);
    expect((await report(learner, item, { reason: "answer_key_wrong" })).status).toBe(400);
    expect((await report(learner, item, { reason: "other", note: "x".repeat(2001) })).status).toBe(400);
    expect((await report(learner, item, { reason: "wrong_answer" }, 5)).status).toBe(429);
    expect(await itemStatus(item)).toBe("verified");
  });

  it("another user's attempt, an attempt of another item and an unservable item are 404", async () => {
    const item = await addItem(tplA);
    const otherItem = await addItem(tplA);
    const theirs = await addAttempt(other, item);
    const mineElsewhere = await addAttempt(learner, otherItem);
    expect((await report(learner, item, { reason: "wrong_answer", attempt_id: theirs })).status).toBe(404);
    expect((await report(learner, item, { reason: "wrong_answer", attempt_id: mineElsewhere })).status).toBe(404);
    expect((await report(learner, randomUUID(), { reason: "wrong_answer" })).status).toBe(404);
    await sql`update public.items set status = 'draft' where id = ${item}`;
    expect((await report(learner, item, { reason: "wrong_answer" })).status).toBe(404);
    expect(await itemStatus(otherItem)).toBe("verified");
  });

  it("other reasons quarantine only on the third distinct reporter, or at once for the admin", async () => {
    const item = await addItem(tplA);
    for (const who of [learner, other]) expect((await report(who, item, { reason: "ambiguous" })).status).toBe(202);
    expect(await itemStatus(item)).toBe("verified");
    expect((await report(third, item, { reason: "ambiguous" })).status).toBe(202);
    expect(await itemStatus(item)).toBe("needs_human_review");

    const adminItem = await addItem(tplA);
    expect((await report(admin, adminItem, { reason: "unsolvable" })).status).toBe(202);
    expect(await itemStatus(adminItem)).toBe("needs_human_review");
  });

  it("quarantine replaces a pending task with a fresh variant for the other learners", async () => {
    const item = await addItem(tplA);
    const spare = await addItem(tplA);
    const taskId = await addTask(other, item);
    expect((await report(learner, item, { reason: "wrong_answer" })).status).toBe(202);
    const task = (await sql<{ item_id: string }[]>`select item_id from public.session_tasks where id = ${taskId}`)[0];
    expect(task?.item_id).not.toBe(item);
    expect((await fetchTask(other, taskId)).status).toBe(200);
    expect(spare).toBeTruthy();
  });

  it("ST-API-10: retireItem needs admin (403), retires with a reason, replaces tasks and writes an admin event", async () => {
    const item = await addItem(tplB);
    const spare = await addItem(tplB);
    const taskId = await addTask(other, item);
    const body = { reason: "Expected value used R1 and R2 swapped" };
    expect((await retire(learner, item, body)).status).toBe(403);
    expect(await itemStatus(item)).toBe("verified");
    expect((await retire(admin, item, { reason: "no" })).status).toBe(400);
    expect((await retire(admin, item, { ...body, extra: 1 })).status).toBe(400);
    expect((await retire(admin, randomUUID(), body)).status).toBe(404);

    const res = await retire(admin, item, body);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ item_id: item, status: "retired", replaced_tasks: 1 });
    const row = (await sql<{ retired_reason: string; retired_at: Date | null }[]>`select retired_reason, retired_at from public.items where id = ${item}`)[0];
    expect(row?.retired_reason).toBe(body.reason);
    expect(row?.retired_at).not.toBeNull();
    const ev = await sql`select props from public.events where user_id = ${admin} and name = 'item_retired' and props->>'item_id' = ${item}`;
    expect(ev).toHaveLength(1);
    expect(ev[0]?.["props"]).toMatchObject({ template_key: tplB, reason: body.reason, confirmed_wrong: false });
    expect((await sql<{ item_id: string }[]>`select item_id from public.session_tasks where id = ${taskId}`)[0]?.item_id).toBe(spare);
    expect((await retire(admin, item, body)).status).toBe(200); // replay changes nothing
    expect(await sql`select 1 from public.events where user_id = ${admin} and name = 'item_retired' and props->>'item_id' = ${item}`).toHaveLength(1);
  });

  it("retire_template retires the template and its unserved pool items", async () => {
    const tpl = `tpl.math.bl56c-${tag}`;
    await addTemplate(tpl);
    const a = await addItem(tpl);
    const b = await addItem(tpl);
    const served = await addItem(tpl);
    await addAttempt(learner, served);
    const res = await retire(admin, a, { reason: "Confirmed wrong key", retire_template: true });
    expect(await res.json()).toMatchObject({ template_retired: true, pool_items_retired: 1 });
    expect(await itemStatus(b)).toBe("retired");
    expect(await itemStatus(served)).toBe("verified");
    expect((await sql<{ status: string }[]>`select status::text as status from public.item_templates where key = ${tpl}`)[0]?.status).toBe("retired");
    await sql`delete from public.attempts where item_id = ${served}`;
    await sql`delete from public.events where user_id = ${admin}`;
    await sql`delete from public.items where template_key = ${tpl}`;
    await sql`delete from public.item_templates where key = ${tpl}`;
  });

  it("the triage list and resolve are admin-only; dismissing clears the attempt flag", async () => {
    const item = await addItem(tplA);
    const attemptId = await addAttempt(fourth, item);
    expect((await report(fourth, item, { reason: "wrong_answer", attempt_id: attemptId })).status).toBe(202);
    expect((await list(fourth)).status).toBe(403);
    const page = (await (await list(admin, `?status=open&item_id=${item}`)).json()) as { items: { id: string; template_key: string; status: string }[]; next_cursor: unknown };
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ template_key: tplA, status: "open" });
    const reportId = page.items[0]?.id ?? "";
    expect((await resolve(fourth, reportId, { status: "dismissed" })).status).toBe(403);
    expect((await resolve(admin, reportId, { status: "bogus" })).status).toBe(400);
    expect((await resolve(admin, randomUUID(), { status: "dismissed" })).status).toBe(404);
    const done = await resolve(admin, reportId, { status: "dismissed" });
    expect(await done.json()).toMatchObject({ id: reportId, status: "dismissed" });
    const d = (await sql<{ d: string | null }[]>`select grade ->> 'disputed' as d from public.attempts where id = ${attemptId}`)[0]?.d;
    expect(d).toBeNull();
  });

  it("confirming with retire_item retires the item and marks the event confirmed_wrong", async () => {
    const item = await addItem(tplA);
    await report(learner, item, { reason: "wrong_answer" });
    const rid = (await sql<{ id: string }[]>`select id from public.item_reports where item_id = ${item}`)[0]?.id ?? "";
    expect((await resolve(admin, rid, { status: "confirmed", retire_item: true })).status).toBe(200);
    expect(await itemStatus(item)).toBe("retired");
    const ev = await sql`select props from public.events where user_id = ${admin} and name = 'item_retired' and props->>'item_id' = ${item}`;
    expect(ev[0]?.["props"]).toMatchObject({ confirmed_wrong: true });
  });
});
