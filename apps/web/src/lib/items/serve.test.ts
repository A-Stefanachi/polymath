// BL-0025 acceptance: the serve gate of getItem / getTask (FR-060, AR-DM-4, ST-API-04, SM-06)
// against the local database. Skipped without a database unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { countUnverifiedServes, createServeStore } from "@/server/privileged/item-store";
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
const getItem = (userId: string) => defineRoute("getItem", (ctx) => readItem(ctx, store), deps(userId));
const getTask = (userId: string) => defineRoute("getTask", (ctx) => readTask(ctx, store), deps(userId));
const fetchItem = (userId: string, id: string) =>
  getItem(userId)(new Request(`http://localhost/api/v1/items/${id}`), { params: Promise.resolve({ item_id: id }) });
const fetchTask = (userId: string, id: string) =>
  getTask(userId)(new Request(`http://localhost/api/v1/tasks/${id}`), { params: Promise.resolve({ task_id: id }) });

const FORBIDDEN = ["params", "verification_report", "answer_key", "solution", "hidden_tests"];
function keysOf(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.push(k);
      keysOf(v, out);
    }
  }
  return out;
}

const tag = randomUUID().slice(0, 8);
const moduleName = `bl25${tag}`;
const skillKey = `math.${moduleName}.s1`;
const tplVerified = `tpl.math.bl25v-${tag}`;
const tplDraft = `tpl.math.bl25d-${tag}`;
const tplAssess = `tpl.math.bl25a-${tag}`;
const SECRET = `SECRET-${tag}`;

let learner = "";
let other = "";
let admin = "";
const items: Record<string, string> = {};

async function addTemplate(key: string, status: string, pool = "practice"): Promise<void> {
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, pool)
    values (${key}, ${skillKey}, 'retrieval', 'exact_numeric', ${status}, ${sql.json({ answer: SECRET })}, 'CC0-1.0', 'bl0025-test', ${pool})`;
}

let seed = 1;
async function addItem(name: string, template: string, status: string, userId: string | null = null): Promise<string> {
  const rendered = {
    stem_md: "What is $2+2$?",
    alt_text: "Two plus two",
    answer_prompt: "Answer in units of one.",
    params: { leak: SECRET },
    answer_key: SECRET,
    solution: SECRET,
    hidden_tests: SECRET,
    verification_report: { leak: SECRET },
    options: [{ id: "o1", text_md: "4", is_correct: true, solution: SECRET }],
    figures: [{ type: "svg", url: "/f.svg", params: SECRET }],
  };
  const report = { verifier: "x", agreed: true, leak: SECRET };
  const row = (
    await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, params, rendered, verification_report, status, user_id, retired_at)
      values (${template}, 1, ${seed++}, ${sql.json({ leak: SECRET })}, ${sql.json(rendered)}, ${sql.json(report)}, ${status},
              ${userId}, ${status === "retired" ? new Date() : null}) returning id`
  )[0];
  const id = row?.id ?? "";
  await sql`insert into public.item_secrets (item_id, answer_key, solution, hidden_tests)
    values (${id}, ${sql.json({ v: SECRET })}, ${sql.json({ v: SECRET })}, ${sql.json({ v: SECRET })})`;
  items[name] = id;
  return id;
}

async function addTask(userId: string, itemId: string, assessmentKind: string | null = null): Promise<string> {
  const session = (
    await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
      values (${userId}, 'micro', 'desktop', 10, 10) returning id`
  )[0];
  const task = (
    await sql<{ id: string }[]>`insert into public.session_tasks (session_id, position, task_kind, skill_key, item_id, user_id, assessment_kind)
      values (${session?.id ?? ""}, 1, 'retrieval', ${skillKey}, ${itemId}, ${userId}, ${assessmentKind}) returning id`
  )[0];
  return task?.id ?? "";
}

describe.skipIf(!reachable)("item serve gate (database)", () => {
  beforeAll(async () => {
    learner = await createTestUser(sql);
    other = await createTestUser(sql);
    admin = await createTestUser(sql);
    await sql`insert into public.admin_users (user_id) values (${admin})`;
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0025 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, 'BL-0025 test', 'L1', 0, 'CC0-1.0', 'bl0025-test', 'stub')`;
    await addTemplate(tplVerified, "verified");
    await addTemplate(tplDraft, "draft");
    await addTemplate(tplAssess, "verified", "assessment");
    await addItem("draft", tplVerified, "draft");
    await addItem("review", tplVerified, "needs_human_review");
    await addItem("verified", tplVerified, "verified");
    await addItem("retired", tplVerified, "retired");
    await addItem("draftTemplate", tplDraft, "verified");
    await addItem("assessment", tplAssess, "verified");
    await addItem("mine", tplVerified, "verified", learner);
    await addItem("theirs", tplVerified, "verified", other);
  });

  afterAll(async () => {
    const ids = Object.values(items);
    await sql`delete from public.events where user_id in (${learner}, ${other}, ${admin})`;
    await sql`delete from public.sessions where user_id in (${learner}, ${other}, ${admin})`;
    await sql`delete from public.items where id in ${sql(ids)}`;
    await sql`delete from public.item_templates where key in (${tplVerified}, ${tplDraft}, ${tplAssess})`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await sql`delete from public.admin_users where user_id = ${admin}`;
    for (const id of [learner, other, admin]) await deleteTestUser(sql, id);
    await sql.end();
  });

  // [item, learner status, admin status]
  it.each([
    ["draft", 404, 200],
    ["review", 404, 200],
    ["verified", 200, 200],
    ["retired", 404, 404],
    ["draftTemplate", 404, 404],
    ["assessment", 404, 200],
    ["mine", 200, 200],
    ["theirs", 404, 200],
  ] as const)("getItem %s: learner %i, admin %i", async (name, forLearner, forAdmin) => {
    const id = items[name] ?? "";
    expect((await fetchItem(learner, id)).status).toBe(forLearner);
    // "draftTemplate" is verified on a draft template: only the founder's review view may see it.
    const admin200 = name === "draftTemplate" ? 404 : forAdmin;
    expect((await fetchItem(admin, id)).status).toBe(admin200);
  });

  it("getItem answers 404 for an unknown id and for text that is not a uuid", async () => {
    expect((await fetchItem(learner, randomUUID())).status).toBe(404);
    expect((await fetchItem(learner, "not-a-uuid")).status).toBe(404);
  });

  it("ST-API-04: no response, for any viewer, contains a forbidden key or a secret value", async () => {
    const bodies: unknown[] = [];
    for (const name of ["draft", "review", "verified", "mine"]) {
      for (const viewer of [learner, admin]) {
        const res = await fetchItem(viewer, items[name] ?? "");
        if (res.status === 200) bodies.push(await res.json());
      }
    }
    const taskId = await addTask(learner, items["verified"] ?? "");
    const res = await fetchTask(learner, taskId);
    expect(res.status).toBe(200);
    bodies.push(await res.json());
    expect(bodies.length).toBeGreaterThan(5);
    for (const body of bodies) {
      expect(keysOf(body).filter((k) => FORBIDDEN.includes(k))).toEqual([]);
      expect(JSON.stringify(body)).not.toContain(SECRET);
      expect(keysOf(body)).not.toContain("is_correct");
    }
  });

  it("getItem returns the rendered fields mapped to the API shape", async () => {
    const body = (await (await fetchItem(learner, items["verified"] ?? "")).json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      id: items["verified"],
      template_key: tplVerified,
      skill_key: skillKey,
      grader_type: "exact_numeric",
      status: "verified",
      rendered: { prompt_md: "What is $2+2$?", alt_text: "Two plus two", options: [{ id: "o1", text_md: "4" }], response_schema: { type: "exact_numeric" } },
    });
  });

  it("getTask returns the task with its item and records one task_shown event", async () => {
    const taskId = await addTask(learner, items["verified"] ?? "");
    const res = await fetchTask(learner, taskId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { task: { id: string; item_id: string }; item: { id: string } };
    expect(body.task).toMatchObject({ id: taskId, item_id: items["verified"] });
    expect(body.item.id).toBe(items["verified"]);
    const events = await sql`select props from public.events where user_id = ${learner} and name = 'task_shown' and props->>'session_task_id' = ${taskId}`;
    expect(events).toHaveLength(1);
    expect(events[0]?.["props"]).toMatchObject({ item_id: items["verified"], template_key: tplVerified, offline: false });
  });

  it("getTask: another user's task is 404", async () => {
    const taskId = await addTask(learner, items["verified"] ?? "");
    expect((await fetchTask(other, taskId)).status).toBe(404);
    expect((await fetchTask(learner, "nope")).status).toBe(404);
  });

  it("getTask: an item downgraded after the task was built is no longer served, and no event is written", async () => {
    const id = await addItem("later", tplVerified, "verified");
    const taskId = await addTask(learner, id);
    await sql`update public.items set status = 'needs_human_review' where id = ${id}`;
    expect((await fetchTask(learner, taskId)).status).toBe(404);
    const events = await sql`select 1 from public.events where name = 'task_shown' and props->>'session_task_id' = ${taskId}`;
    expect(events).toHaveLength(0);
  });

  it("getTask: the founder can open an unreviewed item in their own session; an assessment task is served with its kind", async () => {
    const taskId = await addTask(admin, items["review"] ?? "");
    expect((await fetchTask(admin, taskId)).status).toBe(200);
    const assessTask = await addTask(learner, items["assessment"] ?? "", "periodic");
    expect((await fetchTask(learner, assessTask)).status).toBe(200);
  });

  it("SM-06: served items with status<>verified is 0, and the query does count a bad serve", async () => {
    expect(await countUnverifiedServes(sql)).toBe(0);
    // A task_shown event for a draft item by a non-admin is exactly what the metric must catch.
    await sql`insert into public.events (user_id, name, props) values (${learner}, 'task_shown', ${sql.json({ item_id: items["draft"] ?? "" })})`;
    expect(await countUnverifiedServes(sql)).toBe(1);
  });
});
