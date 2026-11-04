// BL-0202 acceptance (00a K8, FR-030, FR-072): TaskDetail.lesson on getTask, against the local database.
// Skipped without a database unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { checkEvent } from "@/lib/events/emit";
import { logger } from "@/lib/logger";
import { createServeStore } from "@/server/privileged/item-store";
import { createLessonStore } from "@/server/privileged/lesson-store";
import { readTask } from "./serve.ts";

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

type Lesson = { skill_key: string; version: number; variant: string; screens: unknown[]; misconception: { tag: string }; recap_md: string };
type Body = { item: { rendered: Record<string, unknown> }; lesson?: Lesson };
const tag = randomUUID().slice(0, 8);
const moduleName = `bl202${tag}`;
const skillKey = `math.${moduleName}.s1`;
const bareSkill = `math.${moduleName}.s2`;
const tplMain = `tpl.math.bl202a-${tag}`;
const tplBare = `tpl.math.bl202b-${tag}`;
const tplAssess = `tpl.math.bl202c-${tag}`;
const itemIds: string[] = [];
let learner = "";
let other = "";
let seed = 1;

const lessonBody = (marker: string) => ({
  schema_version: 1,
  skill_key: skillKey,
  version: 1,
  authoring_status: "ready",
  license: "original",
  source: "bl0202-test",
  provenance: { authors: ["secret-author"], created: "2026-11-04", llm_assistance: { used: false } },
  est_seconds: 60,
  screens: [{ id: "why", title: `Why ${marker}`, body_md: "Because.", figure: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>', alt: "A small empty drawing" } }],
  misconception: { tag: "mc.bl202", wrong_idea_md: "Wrong.", why_tempting_md: "Tempting.", correct_idea_md: "Right." },
  checks: [{ id: "c1", stem_md: "Pick.", options: [{ id: "a", text_md: "A", correct: true, feedback_md: "Yes." }, { id: "b", text_md: "B", correct: false, feedback_md: "No." }] }],
  recap_md: `Recap ${marker}.`,
});
async function addLesson(version: number, status: "needs_human_review" | "verified", marker: string, forSkill = skillKey): Promise<void> {
  await sql`insert into public.skill_lessons (skill_key, version, status, body, content_hash, license, source, reviewed_by, reviewed_at)
    values (${forSkill}, ${version}, ${status}::public.content_status, ${sql.json(lessonBody(marker))}, ${`h-${tag}-${String(version)}`}, 'original', 'bl0202-test',
            ${status === "verified" ? learner : null}, ${status === "verified" ? new Date() : null})`;
}
async function addTemplate(key: string, forSkill: string, pool = "practice"): Promise<void> {
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, pool)
    values (${key}, ${forSkill}, 'retrieval', 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0202-test', ${pool})`;
}
async function addItem(template: string): Promise<string> {
  const id = (
    await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, params, rendered, verification_report, status)
      values (${template}, 1, ${seed++}, ${sql.json({})}, ${sql.json({ stem_md: "Q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified') returning id`
  )[0]?.id ?? "";
  await sql`insert into public.item_secrets (item_id, answer_key, solution) values (${id}, ${sql.json({ v: 1 })}, ${sql.json({ steps: [{ id: "s1", text_md: "one" }, { id: "s2", text_md: "two" }] })})`;
  itemIds.push(id);
  return id;
}
async function newTask(userId: string, kind: string, template: string, forSkill = skillKey, assessment: string | null = null): Promise<string> {
  const session = (
    await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
      values (${userId}, 'micro', 'desktop', 10, 10) returning id`
  )[0]?.id ?? "";
  const item = await addItem(template);
  return (
    await sql<{ id: string }[]>`insert into public.session_tasks (session_id, position, task_kind, skill_key, item_id, user_id, assessment_kind)
      values (${session}, 1, ${kind}, ${forSkill}, ${item}, ${userId}, ${assessment}) returning id`
  )[0]?.id ?? "";
}
async function body(userId: string, taskId: string): Promise<Body> {
  const res = await fetchTask(userId, taskId);
  expect(res.status).toBe(200);
  return (await res.json()) as Body;
}
async function recordAttempt(userId: string, status: "graded" | "invalid_input"): Promise<void> {
  const item = itemIds[0] ?? "";
  const grade = status === "graded" ? { status: "graded", score: 0, correct: false, graders: [] } : { status: "invalid_input", score: null, correct: null, graders: [] };
  await sql`insert into public.attempts (user_id, item_id, started_at, submitted_at, response, grade, grade_status, client_attempt_id)
    values (${userId}, ${item}, now() - interval '1 min', now(), ${sql.json({})}, ${sql.json(grade)}, ${status}, ${randomUUID()})`;
}
const clearState = async () => {
  await sql`delete from public.attempts where user_id in (${learner}, ${other})`;
  await sql`delete from public.skill_lessons where skill_key in (${skillKey}, ${bareSkill})`;
};

describe.skipIf(!reachable)("TaskDetail.lesson on getTask (database)", () => {
  beforeAll(async () => {
    learner = await createTestUser(sql);
    other = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0202 test', 0)`;
    for (const k of [skillKey, bareSkill])
      await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
        values (${k}, 'math', ${moduleName}, 'BL-0202 test', 'L1', 0, 'CC0-1.0', 'bl0202-test', 'stub')`;
    await addTemplate(tplMain, skillKey);
    await addTemplate(tplBare, bareSkill);
    await addTemplate(tplAssess, skillKey, "assessment");
  });
  afterAll(async () => {
    await clearState();
    await sql`delete from public.events where user_id in (${learner}, ${other})`;
    await sql`delete from public.sessions where user_id in (${learner}, ${other})`;
    await sql`delete from public.items where id in ${sql(itemIds)}`;
    await sql`delete from public.item_templates where key in (${tplMain}, ${tplBare}, ${tplAssess})`;
    await sql`delete from public.skills where key in (${skillKey}, ${bareSkill})`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const id of [learner, other]) await deleteTestUser(sql, id);
    await sql.end();
  });

  it("AC: a first worked example of a skill with a verified lesson returns variant full; after one graded attempt on the skill the next returns recap", async () => {
    await clearState();
    await addLesson(1, "verified", "one");
    const first = await body(learner, await newTask(learner, "worked_example", tplMain));
    expect(first.lesson).toMatchObject({ skill_key: skillKey, version: 1, variant: "full", recap_md: "Recap one." });
    await recordAttempt(learner, "graded");
    const second = await body(learner, await newTask(learner, "worked_example", tplMain));
    expect(second.lesson).toMatchObject({ version: 1, variant: "recap" });
  });

  it("only a graded attempt of the caller on that skill makes the variant recap", async () => {
    await clearState();
    await addLesson(1, "verified", "one");
    await recordAttempt(other, "graded"); // another learner's attempt
    await recordAttempt(learner, "invalid_input"); // never counted as an attempt
    expect((await body(learner, await newTask(learner, "worked_example", tplMain))).lesson?.variant).toBe("full");
  });

  it("AC: a skill without a verified lesson returns no lesson", async () => {
    await clearState();
    await addLesson(1, "needs_human_review", "unreviewed");
    expect(await body(learner, await newTask(learner, "worked_example", tplMain))).not.toHaveProperty("lesson");
    expect(await body(learner, await newTask(learner, "worked_example", tplBare, bareSkill))).not.toHaveProperty("lesson");
  });

  it("the newest verified version is served, and a retired newest one gives way to the older verified version", async () => {
    await clearState();
    await addLesson(1, "verified", "one");
    await addLesson(2, "needs_human_review", "two");
    await addLesson(3, "verified", "three");
    const task = await newTask(learner, "worked_example", tplMain);
    expect((await body(learner, task)).lesson?.version).toBe(3);
    await sql`update public.skill_lessons set status = 'retired', retired_at = now() where skill_key = ${skillKey} and version = 3`;
    expect((await body(learner, task)).lesson?.version).toBe(1);
  });

  it("the lesson is on worked_example tasks only, never on other kinds or assessment items", async () => {
    await clearState();
    await addLesson(1, "verified", "one");
    for (const kind of ["faded_problem", "retrieval", "problem", "checkpoint"]) {
      expect(await body(learner, await newTask(learner, kind, tplMain)), kind).not.toHaveProperty("lesson");
    }
    expect(await body(learner, await newTask(learner, "worked_example", tplAssess, skillKey, "periodic"))).not.toHaveProperty("lesson");
  });

  it("the payload is an allow-list: file-only fields never leave the server", async () => {
    await clearState();
    await addLesson(1, "verified", "one");
    const text = JSON.stringify(await body(learner, await newTask(learner, "worked_example", tplMain)));
    for (const hidden of ["secret-author", "provenance", "authoring_status", "bl0202-test", "schema_version"]) expect(text).not.toContain(hidden);
    expect(text).toContain("A small empty drawing");
  });

  it("serving a lesson writes no attempt, skill_state or review_log row", async () => {
    await clearState();
    await addLesson(1, "verified", "one");
    const counts = async () =>
      (
        await sql<{ n: number }[]>`
          select (select count(*) from public.attempts where user_id = ${learner})::int
               + (select count(*) from public.skill_state where user_id = ${learner})::int
               + (select count(*) from public.review_log where user_id = ${learner})::int as n`
      )[0]?.n;
    const before = await counts();
    await body(learner, await newTask(learner, "worked_example", tplMain));
    expect(await counts()).toBe(before);
  });
});

describe("lesson events (doc 11 section 9, 00a K10)", () => {
  it("lesson_viewed and lesson_check_answered accept their catalogue props, and nothing else", () => {
    const viewed = { skill_key: skillKey, lesson_version: 1, variant: "full", screens_seen: 3, skipped: true, dwell_ms: 4000 };
    expect(checkEvent("lesson_viewed", viewed)).toMatchObject(viewed);
    const answered = { skill_key: skillKey, lesson_version: 1, check_id: "c1", correct: false };
    expect(checkEvent("lesson_check_answered", answered)).toMatchObject(answered);
    expect(() => checkEvent("lesson_check_answered", { ...answered, answer: "free text" })).toThrow();
  });
});
