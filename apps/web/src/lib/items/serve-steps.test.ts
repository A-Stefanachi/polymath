// BL-0198 acceptance (00a H1, K2, K3): worked steps on getTask only, against the local database.
// Skipped without a database unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createServeStore } from "@/server/privileged/item-store";
import { createLessonStore } from "@/server/privileged/lesson-store";
import { readItem, readTask } from "./serve.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;
const store = createServeStore(sql);
const deps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => ({ claim: async () => ({ kind: "new" as const }), complete: async () => undefined, release: async () => undefined }),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
const fetchTask = (userId: string, id: string) =>
  defineRoute("getTask", (ctx) => readTask(ctx, store, createLessonStore(sql)), deps(userId))(new Request(`http://localhost/api/v1/tasks/${id}`), {
    params: Promise.resolve({ task_id: id }),
  });
const fetchItem = (userId: string, id: string) =>
  defineRoute("getItem", (ctx) => readItem(ctx, store), deps(userId))(new Request(`http://localhost/api/v1/items/${id}`), {
    params: Promise.resolve({ item_id: id }),
  });

type Body = { item: { rendered: Record<string, unknown> } };
const tag = randomUUID().slice(0, 8);
const moduleName = `bl198${tag}`;
const skillKey = `math.${moduleName}.s1`;
const tpl2 = `tpl.math.bl198a-${tag}`;
const tpl5 = `tpl.math.bl198b-${tag}`;
const tplAssess = `tpl.math.bl198c-${tag}`;
const steps = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, text_md: `step ${i + 1}` }));
const itemIds: string[] = [];
let learner = "";
let other = "";
let seed = 1;

async function addTemplate(key: string, pool = "practice"): Promise<void> {
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, pool)
    values (${key}, ${skillKey}, 'retrieval', 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0198-test', ${pool})`;
}
async function addItem(template: string, n: number): Promise<string> {
  const id = (
    await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, params, rendered, verification_report, status)
      values (${template}, 1, ${seed++}, ${sql.json({})}, ${sql.json({ stem_md: "Q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified') returning id`
  )[0]?.id ?? "";
  await sql`insert into public.item_secrets (item_id, answer_key, solution)
    values (${id}, ${sql.json({ v: 1 })}, ${sql.json({ steps: steps(n), explanation_md: "Why it works." })})`;
  itemIds.push(id);
  return id;
}
async function newSession(userId: string): Promise<string> {
  return (
    await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
      values (${userId}, 'micro', 'desktop', 10, 10) returning id`
  )[0]?.id ?? "";
}
async function addTask(userId: string, session: string, position: number, kind: string, itemId: string, assessment: string | null = null): Promise<string> {
  return (
    await sql<{ id: string }[]>`insert into public.session_tasks (session_id, position, task_kind, skill_key, item_id, user_id, assessment_kind)
      values (${session}, ${position}, ${kind}, ${skillKey}, ${itemId}, ${userId}, ${assessment}) returning id`
  )[0]?.id ?? "";
}
async function rendered(userId: string, taskId: string): Promise<Record<string, unknown>> {
  const res = await fetchTask(userId, taskId);
  expect(res.status).toBe(200);
  return ((await res.json()) as Body).item.rendered;
}
const ids = (r: Record<string, unknown>) => (r["worked_steps"] as { id: string }[]).map((s) => s.id);

describe.skipIf(!reachable)("worked steps on getTask (database)", () => {
  beforeAll(async () => {
    learner = await createTestUser(sql);
    other = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0198 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, 'BL-0198 test', 'L1', 0, 'CC0-1.0', 'bl0198-test', 'stub')`;
    for (const t of [tpl2, tpl5]) await addTemplate(t);
    await addTemplate(tplAssess, "assessment");
  });
  afterAll(async () => {
    await sql`delete from public.events where user_id in (${learner}, ${other})`;
    await sql`delete from public.sessions where user_id in (${learner}, ${other})`;
    await sql`delete from public.items where id in ${sql(itemIds)}`;
    await sql`delete from public.item_templates where key in (${tpl2}, ${tpl5}, ${tplAssess})`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const id of [learner, other]) await deleteTestUser(sql, id);
    await sql.end();
  });

  it("AC-1: a worked_example returns every step, steps_total and explanation_md", async () => {
    const item = await addItem(tpl5, 5);
    const r = await rendered(learner, await addTask(learner, await newSession(learner), 1, "worked_example", item));
    expect(ids(r)).toEqual(["s1", "s2", "s3", "s4", "s5"]);
    expect(r).toMatchObject({ steps_total: 5, explanation_md: "Why it works." });
  });

  it("AC-1: a faded_problem on a 2-step template returns 1 step, never the last", async () => {
    const item = await addItem(tpl2, 2);
    const r = await rendered(learner, await addTask(learner, await newSession(learner), 1, "faded_problem", item));
    expect(ids(r)).toEqual(["s1"]);
    expect(r["steps_total"]).toBe(2);
    expect(r).not.toHaveProperty("explanation_md");
  });

  it("AC-2: on a 5-step template the first faded task of the skill in the session shows 2 steps, the second 1", async () => {
    const session = await newSession(learner);
    const a = await addTask(learner, session, 1, "faded_problem", await addItem(tpl5, 5));
    const b = await addTask(learner, session, 2, "faded_problem", await addItem(tpl5, 5));
    expect(ids(await rendered(learner, a))).toEqual(["s1", "s2"]);
    expect(ids(await rendered(learner, b))).toEqual(["s1"]);
  });

  it("AC-3: another user's task is 404", async () => {
    const task = await addTask(learner, await newSession(learner), 1, "worked_example", await addItem(tpl2, 2));
    expect((await fetchTask(other, task)).status).toBe(404);
  });

  it("AC-3: other task kinds, assessment-pool items and getItem carry no steps fields", async () => {
    const item = await addItem(tpl5, 5);
    const session = await newSession(learner);
    let position = 1;
    for (const kind of ["retrieval", "problem", "checkpoint", "diagnostic"]) {
      const r = await rendered(learner, await addTask(learner, session, position++, kind, item));
      for (const k of ["worked_steps", "steps_total", "explanation_md"]) expect(r).not.toHaveProperty(k);
    }
    const assessItem = await addItem(tplAssess, 5);
    for (const kind of ["worked_example", "faded_problem"]) {
      const r = await rendered(learner, await addTask(learner, session, position++, kind, assessItem, "periodic"));
      for (const k of ["worked_steps", "steps_total", "explanation_md"]) expect(r).not.toHaveProperty(k);
    }
    const body = (await (await fetchItem(learner, item)).json()) as Body;
    for (const k of ["worked_steps", "steps_total", "explanation_md"]) expect(body.item ?? body).not.toHaveProperty(k);
    expect(JSON.stringify(body)).not.toContain("step 1");
  });
});
