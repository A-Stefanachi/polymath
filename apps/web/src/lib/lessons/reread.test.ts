// 00a M3 (founder request of 6 Nov 2026, "I want to be able to open and read lessons again"): getSkillLesson
// serves the newest verified primer of a skill the caller has started, read-only. Against the local database;
// skipped without one unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { logger } from "@/lib/logger";
import { createLessonStore } from "@/server/privileged/lesson-store";
import { getSkillLesson } from "./reread.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;
const deps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => ({ claim: async () => ({ kind: "new" as const }), complete: async () => undefined, release: async () => undefined }),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
const get = (userId: string, key: string, query = "") =>
  defineRoute("getSkillLesson", (ctx) => getSkillLesson(ctx, createLessonStore(sql)), deps(userId))(
    new Request(`http://localhost/api/v1/skills/${key}/lesson${query}`),
    { params: Promise.resolve({ skill_key: key }) },
  );

const tag = randomUUID().slice(0, 8);
const moduleName = `m3${tag}`;
const started = `math.${moduleName}.s1`;
const unseen = `math.${moduleName}.s2`;
const bare = `math.${moduleName}.s3`;
let learner = "";
let other = "";

const lessonBody = (key: string, marker: string) => ({
  schema_version: 1,
  skill_key: key,
  version: 1,
  authoring_status: "ready",
  license: "original",
  source: "m3-test",
  provenance: { authors: ["secret-author"], created: "2026-11-06", llm_assistance: { used: false } },
  est_seconds: 60,
  screens: [{ id: "why", title: `Why ${marker}`, body_md: "Because." }],
  misconception: { tag: "mc.m3", wrong_idea_md: "Wrong.", why_tempting_md: "Tempting.", correct_idea_md: "Right." },
  checks: [{ id: "c1", stem_md: "Pick.", options: [{ id: "a", text_md: "A", correct: true, feedback_md: "Yes." }, { id: "b", text_md: "B", correct: false, feedback_md: "No." }] }],
  recap_md: `Recap ${marker}.`,
});
async function addLesson(key: string, version: number, status: "needs_human_review" | "verified", marker: string): Promise<void> {
  await sql`insert into public.skill_lessons (skill_key, version, status, body, content_hash, license, source, reviewed_by, reviewed_at)
    values (${key}, ${version}, ${status}::public.content_status, ${sql.json(lessonBody(key, marker))}, ${`h-${tag}-${key}-${String(version)}`}, 'original', 'm3-test',
            ${status === "verified" ? learner : null}, ${status === "verified" ? new Date() : null})`;
}
async function setState(userId: string, key: string, state: string): Promise<void> {
  await sql`insert into public.skill_state (user_id, skill_key, mastery_state) values (${userId}, ${key}, ${state}::public.mastery_state)
    on conflict (user_id, skill_key) do update set mastery_state = excluded.mastery_state`;
}
const writes = async (userId: string) =>
  (
    await sql<{ n: number }[]>`select (select count(*) from public.events where user_id = ${userId})::int
      + (select count(*) from public.attempts where user_id = ${userId})::int
      + (select count(*) from public.sessions where user_id = ${userId})::int as n`
  )[0]?.n ?? -1;

describe.skipIf(!reachable)("getSkillLesson (database)", () => {
  beforeAll(async () => {
    learner = await createTestUser(sql);
    other = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'M3 test', 0)`;
    for (const k of [started, unseen, bare])
      await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
        values (${k}, 'math', ${moduleName}, 'M3 test', 'L1', 0, 'CC0-1.0', 'm3-test', 'stub')`;
    await addLesson(started, 1, "verified", "one");
    await addLesson(started, 2, "needs_human_review", "two-unreviewed");
    await addLesson(unseen, 1, "verified", "unseen");
    await setState(learner, started, "mastered");
    await setState(learner, unseen, "unseen");
    await setState(learner, bare, "learning");
  });
  afterAll(async () => {
    await sql`delete from public.skill_state where user_id in (${learner}, ${other})`;
    await sql`delete from public.skill_lessons where skill_key in (${started}, ${unseen}, ${bare})`;
    await sql`delete from public.skills where key in (${started}, ${unseen}, ${bare})`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const id of [learner, other]) await deleteTestUser(sql, id);
    await sql.end();
  });

  it("serves the newest verified version of a started skill as variant full, without file-only fields", async () => {
    const res = await get(learner, started);
    expect(res.status).toBe(200);
    const lesson = (await res.json()) as Record<string, unknown>;
    expect(lesson).toMatchObject({ skill_key: started, version: 1, variant: "full", recap_md: "Recap one." });
    expect(JSON.stringify(lesson)).not.toContain("secret-author");
    expect(lesson).not.toHaveProperty("provenance");
  });

  it("writes nothing: no event, attempt or session (no lesson_viewed, 00a K10)", async () => {
    const before = await writes(learner);
    expect((await get(learner, started)).status).toBe(200);
    expect(await writes(learner)).toBe(before);
  });

  it("is 404 for a skill the caller has not started, for another user, without a verified lesson, and for a bad key", async () => {
    expect((await get(learner, unseen)).status).toBe(404); // state row is unseen
    expect((await get(other, started)).status).toBe(404); // another learner has no state on it
    expect((await get(learner, bare)).status).toBe(404); // started, but no lesson
    expect((await get(learner, "not a key")).status).toBe(404);
  });

  it("rejects an unknown query parameter", async () => {
    expect((await get(learner, started, "?variant=recap")).status).toBe(400);
  });
});
