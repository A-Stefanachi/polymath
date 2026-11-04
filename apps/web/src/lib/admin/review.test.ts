// BL-0057 (FR-124, US-031, ADR-018): approveTemplate and retireFromConsole against the local database.
// Skipped without a database unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createReportStore } from "@/server/privileged/report-store";
import { createReviewStore } from "@/server/privileged/review-store";
import { approveTemplate, retireFromConsole } from "./review.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const stores = { review: createReviewStore(sql), reports: createReportStore(sql) };
const tag = randomUUID().slice(0, 8);
const moduleName = `bl57u${tag}`;
const skillKey = `math.${moduleName}.s1`;
const keys = { ok: `tpl.math.bl57u-ok-${tag}`, nofuzz: `tpl.math.bl57u-nofuzz-${tag}`, draft: `tpl.math.bl57u-draft-${tag}` };
const HASH = "a".repeat(64);
const NOW = new Date("2026-11-04T10:00:00Z");
let admin = "";
let learner = "";
let jobId = "";
let itemId = "";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const approveForm = (key: string, extra: Record<string, string> = {}) => form({ template_key: key, version: "1", hand_solve: "on", ...extra });
const state = async (key: string) =>
  (await sql<{ status: string; review: Record<string, unknown> | null }[]>`select status::text as status, body->'_review' as review from public.item_templates where key = ${key}`)[0];

describe.skipIf(!reachable)("review console domain (database)", () => {
  beforeAll(async () => {
    admin = await createTestUser(sql);
    learner = await createTestUser(sql);
    await sql`insert into public.admin_users (user_id) values (${admin})`;
    jobId = (
      await sql<{ id: string }[]>`insert into public.jobs (kind, payload, status, result)
        values ('content_postprocess', '{}', 'succeeded', ${sql.json({ passed: true })}) returning id`
    )[0]?.id ?? "";
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0057 unit', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, 'BL-0057 unit', 'L1', 0, 'CC0-1.0', 'bl0057-test', 'stub')`;
    const insert = (key: string, status: string, body: unknown) =>
      sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source)
        values (${key}, ${skillKey}, 'retrieval', 'exact_numeric', ${status}, ${sql.json(body as Record<string, never>)}, 'CC0-1.0', 'bl0057-test')`;
    await insert(keys.ok, "needs_human_review", { _sync: { sha256: HASH, fuzz_job_id: jobId } });
    await insert(keys.nofuzz, "needs_human_review", { _sync: { sha256: HASH, fuzz_job_id: null } });
    await insert(keys.draft, "draft", { _sync: { sha256: HASH, fuzz_job_id: jobId } });
    itemId = (
      await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, rendered, verification_report, status)
        values (${keys.ok}, 1, 1, ${sql.json({ stem_md: "x" })}, ${sql.json({})}, 'needs_human_review') returning id`
    )[0]?.id ?? "";
  });

  afterAll(async () => {
    await sql`delete from public.events where user_id = ${admin}`;
    await sql`delete from public.items where template_key = any(${Object.values(keys)})`;
    await sql`delete from public.item_templates where key = any(${Object.values(keys)})`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await sql`delete from public.jobs where id = ${jobId}`;
    await deleteTestUser(sql, admin);
    await deleteTestUser(sql, learner);
    await sql.end();
  });

  it("the queue lists a template waiting for review with its hash, G2 result and item count", async () => {
    const q = (await stores.review.queue()).find((t) => t.key === keys.ok);
    expect(q).toMatchObject({ version: 1, sha256: HASH, fuzz_passed: true, item_count: 1 });
    expect((await stores.review.queue()).find((t) => t.key === keys.nofuzz)?.fuzz_passed).toBe(false);
  });

  it("a non-admin cannot approve or retire (ADR-018)", async () => {
    expect(await approveTemplate(stores, learner, approveForm(keys.ok), NOW)).toBe("forbidden");
    expect(await retireFromConsole(stores, learner, form({ item_id: itemId, reason: "not allowed here" }))).toBe("forbidden");
    expect((await state(keys.ok))?.status).toBe("needs_human_review");
  });

  it("approval without the hand-solve box, with a bad key, or with notes over 2000 characters writes nothing", async () => {
    expect(await approveTemplate(stores, admin, form({ template_key: keys.ok, version: "1" }), NOW)).toBe("needs_hand_solve");
    expect(await approveTemplate(stores, admin, approveForm("not-a-key"), NOW)).toBe("invalid");
    expect(await approveTemplate(stores, admin, approveForm(keys.ok, { version: "0" }), NOW)).toBe("invalid");
    expect(await approveTemplate(stores, admin, approveForm(keys.ok, { notes: "n".repeat(2001) }), NOW)).toBe("invalid");
    expect((await state(keys.ok))?.status).toBe("needs_human_review");
  });

  it("a template whose G2 has not passed, a draft and an unknown version cannot be approved", async () => {
    expect(await approveTemplate(stores, admin, approveForm(keys.nofuzz), NOW)).toBe("fuzz_not_passed");
    expect(await approveTemplate(stores, admin, approveForm(keys.draft), NOW)).toBe("not_reviewable");
    expect(await approveTemplate(stores, admin, approveForm(keys.ok, { version: "9" }), NOW)).toBe("not_found");
    expect((await state(keys.nofuzz))?.status).toBe("needs_human_review");
    expect((await state(keys.draft))?.status).toBe("draft");
  });

  it("approval stores the hash with the reviewer and notes, and a repeat leaves the record as it was", async () => {
    expect(await approveTemplate(stores, admin, approveForm(keys.ok, { notes: " solved items 1 and 2 " }), NOW)).toBe("approved");
    expect(await state(keys.ok)).toEqual({
      status: "verified",
      review: {
        reviewer: admin,
        date: NOW.toISOString(),
        template_sha256: HASH,
        checklist_version: "g3_checklist_v1",
        hand_solve: "done",
        disagreements: 0,
        notes: "solved items 1 and 2",
        source: "console",
      },
    });
    expect(await approveTemplate(stores, admin, approveForm(keys.ok, { notes: "second" }), new Date("2027-01-01T00:00:00Z"))).toBe("approved");
    expect((await state(keys.ok))?.review?.["date"]).toBe(NOW.toISOString());
  });

  it("retire needs a reason of at least 5 characters and retires the item", async () => {
    expect(await retireFromConsole(stores, admin, form({ item_id: itemId, reason: "four" }))).toBe("invalid");
    expect(await retireFromConsole(stores, admin, form({ item_id: "nope", reason: "long enough" }))).toBe("invalid");
    expect(await retireFromConsole(stores, admin, form({ item_id: randomUUID(), reason: "long enough" }))).toBe("not_found");
    expect(await retireFromConsole(stores, admin, form({ item_id: itemId, reason: "five!" }))).toBe("retired");
    expect((await sql<{ status: string }[]>`select status::text as status from public.items where id = ${itemId}`)[0]?.status).toBe("retired");
  });
});
