// BL-0201 (00a K9, FR-124): approving and retiring concept-primer versions in the review console, against the
// local database. Skipped without a database unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createLessonStore } from "@/server/privileged/lesson-store";
import { createReportStore } from "@/server/privileged/report-store";
import { approveLesson, retireLesson } from "./lessons.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const stores = { lessons: createLessonStore(sql), reports: createReportStore(sql) };
const tag = randomUUID().slice(0, 8);
const moduleName = `bl201${tag}`;
const skill = `math.${moduleName}.s1`;
const NOW = new Date("2026-11-04T10:00:00Z");
let admin = "";
let learner = "";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const target = (version: number, key = skill) => form({ skill_key: key, version: String(version) });
const insert = (version: number, status: string) =>
  sql`insert into public.skill_lessons (skill_key, version, status, body, content_hash, license, source)
      values (${skill}, ${version}, ${status}::public.content_status, ${sql.json({ marker: `v${String(version)}` })}, ${`hash${String(version)}`}, 'original', 'bl0201-test')`;
const rows = () =>
  sql<{ version: number; status: string; reviewed_by: string | null; reviewed_at: Date | null; retired: boolean }[]>`
    select version, status::text as status, reviewed_by, reviewed_at, retired_at is not null as retired
      from public.skill_lessons where skill_key = ${skill} order by version`;
const reset = async () => {
  await sql`delete from public.skill_lessons where skill_key = ${skill}`;
};

describe.skipIf(!reachable)("lesson review console domain (database)", () => {
  beforeAll(async () => {
    admin = await createTestUser(sql);
    learner = await createTestUser(sql);
    await sql`insert into public.admin_users (user_id) values (${admin})`;
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0201 unit', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skill}, 'math', ${moduleName}, 'BL-0201 unit', 'L1', 0, 'CC0-1.0', 'bl0201-test', 'stub')`;
  });
  afterAll(async () => {
    await reset();
    await sql`delete from public.skills where key = ${skill}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await deleteTestUser(sql, admin);
    await deleteTestUser(sql, learner);
    await sql.end();
  });

  it("the queue lists only versions waiting for review", async () => {
    await reset();
    await insert(1, "needs_human_review");
    await sql`update public.skill_lessons set status = 'verified', reviewed_by = ${admin}, reviewed_at = now() where skill_key = ${skill} and version = 1`;
    await insert(2, "needs_human_review");
    await insert(3, "retired");
    const queue = (await stores.lessons.queue()).filter((q) => q.skill_key === skill);
    expect(queue.map((q) => q.version)).toEqual([2]);
  });

  it("AC: approving a needs_human_review version makes it verified with reviewer and time, and a learner then receives it", async () => {
    await reset();
    await insert(1, "needs_human_review");
    expect(await stores.lessons.newestVerified(skill)).toBeNull();
    expect(await approveLesson(stores, admin, target(1), NOW)).toBe("lesson_approved");
    expect(await rows()).toEqual([{ version: 1, status: "verified", reviewed_by: admin, reviewed_at: NOW, retired: false }]);
    expect(await stores.lessons.newestVerified(skill)).toEqual({ version: 1, body: { marker: "v1" } });
    // A repeat is a no-op that reports the same outcome and keeps the first review time.
    expect(await approveLesson(stores, admin, target(1), new Date("2026-11-05T10:00:00Z"))).toBe("lesson_approved");
    expect((await rows())[0]?.reviewed_at).toEqual(NOW);
  });

  it("AC: a non-admin call is refused and changes nothing", async () => {
    await reset();
    await insert(1, "needs_human_review");
    expect(await approveLesson(stores, learner, target(1), NOW)).toBe("forbidden");
    expect(await retireLesson(stores, learner, target(1))).toBe("forbidden");
    expect((await rows())[0]).toMatchObject({ status: "needs_human_review", reviewed_by: null, reviewed_at: null, retired: false });
  });

  it("approval touches that version only: an older verified version and a newer waiting one are left as they are", async () => {
    await reset();
    await insert(1, "needs_human_review");
    await insert(2, "needs_human_review");
    await insert(3, "needs_human_review");
    expect(await approveLesson(stores, admin, target(2), NOW)).toBe("lesson_approved");
    expect((await rows()).map((r) => [r.version, r.status])).toEqual([[1, "needs_human_review"], [2, "verified"], [3, "needs_human_review"]]);
  });

  it("AC: retiring a version hides it from learners and an older verified version is served instead", async () => {
    await reset();
    await insert(1, "needs_human_review");
    await insert(2, "needs_human_review");
    await approveLesson(stores, admin, target(1), NOW);
    await approveLesson(stores, admin, target(2), NOW);
    expect((await stores.lessons.newestVerified(skill))?.version).toBe(2);
    expect(await retireLesson(stores, admin, target(2))).toBe("lesson_retired");
    const after = await rows();
    expect(after.map((r) => [r.version, r.status, r.retired])).toEqual([[1, "verified", false], [2, "retired", true]]);
    expect((await stores.lessons.newestVerified(skill))?.version).toBe(1);
  });

  it("a retired version cannot be approved; unknown versions and bad input are reported, not thrown", async () => {
    await reset();
    await insert(1, "retired");
    expect(await approveLesson(stores, admin, target(1), NOW)).toBe("not_reviewable");
    expect(await approveLesson(stores, admin, target(7), NOW)).toBe("not_found");
    expect(await retireLesson(stores, admin, target(7))).toBe("not_found");
    expect(await approveLesson(stores, admin, target(0), NOW)).toBe("invalid");
    expect(await approveLesson(stores, admin, target(1, "Not A Key"), NOW)).toBe("invalid");
    expect(await retireLesson(stores, admin, form({ skill_key: skill }))).toBe("invalid");
    expect((await rows())[0]?.status).toBe("retired");
  });
});
