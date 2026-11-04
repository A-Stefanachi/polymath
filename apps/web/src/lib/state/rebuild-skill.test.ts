// BL-0197 acceptance (integration, local database; skipped without one unless REQUIRE_DB=1):
// disputed attempts leave FSRS by rebuilding skill_state from review_log (00a J2; doc 07 section 8.2).
// Attempts are inserted as graded rows and applied through the live path; time is injected.
import { createHash, randomUUID } from "node:crypto";
import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { logger } from "@/lib/logger";
import { reportItem, resolveItemReport } from "@/lib/items/report.ts";
import { createReportStore } from "@/server/privileged/report-store";
import { createServeStore } from "@/server/privileged/item-store";
import { createStateStore } from "@/server/privileged/state-store";
import { DEFAULT_PARAMS } from "@polymath/scheduler";
import { applyGradedAttempt, sharedFsrsPort, type StateDeps } from "./apply-attempt.ts";
import { rebuildSkillState } from "./rebuild-skill.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const tag = randomUUID().slice(0, 8);
const moduleName = `bl97${tag}`;
const users: string[] = [];
const skills: string[] = [];
const templates: string[] = [];
const itemIds: string[] = [];
let deps: StateDeps;
let seed = 1;

const at = (day: number): Date => new Date(Date.UTC(2026, 10, day, 10, 0, 0));
// Mastery depends on retrievability at `now`, so the rebuild is dated just after the last live review.
const NOW = at(6);

type Fixture = { user: string; skill: string; item: string };

async function fixture(): Promise<Fixture> {
  const user = await createTestUser(sql);
  users.push(user);
  const n = skills.length;
  const skill = `math.${moduleName}.s${n}`;
  const tpl = `tpl.math.bl97-${tag}-${n}`;
  skills.push(skill);
  templates.push(tpl);
  await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
    values (${skill}, 'math', ${moduleName}, 'BL-0197 test', 'L0', 0, 'CC0-1.0', 'bl0197-test', 'stub')`;
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source)
    values (${tpl}, ${skill}, 'retrieval', 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0197-test')`;
  const row = (
    await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, rendered, verification_report, status)
      values (${tpl}, 1, ${seed++}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified') returning id`
  )[0];
  const item = row?.id ?? "";
  itemIds.push(item);
  return { user, skill, item };
}

async function addAttempt(f: Fixture, submitted: Date, score: number): Promise<string> {
  const grade = { status: "graded", score, correct: score >= 0.8, graders: [], mastery_eligible: true };
  const row = (
    await sql<{ id: string }[]>`
      insert into public.attempts (user_id, item_id, session_id, started_at, submitted_at, response, grade, grade_status, graded_at, client_attempt_id)
      values (${f.user}, ${f.item}, ${null}, ${new Date(submitted.getTime() - 30_000).toISOString()}, ${submitted.toISOString()},
              ${sql.json({ kind: "numeric", value: 1 })}, ${sql.json(grade)}, 'graded', ${submitted.toISOString()}, ${randomUUID()})
      returning id`
  )[0];
  return row?.id ?? "";
}

/** Applies one attempt per day on the live path (each its own review unit). */
async function live(f: Fixture, scores: readonly number[], skip: ReadonlySet<number> = new Set()): Promise<string[]> {
  const ids: string[] = [];
  for (const [i, s] of scores.entries()) {
    if (skip.has(i)) {
      ids.push("");
      continue;
    }
    const id = await addAttempt(f, at(i + 1), s);
    ids.push(id);
    const r = await applyGradedAttempt(id, new Date(at(i + 1).getTime() + 60_000), deps);
    expect(r.applied).toBe(true);
  }
  return ids;
}

const fsrsCols = async (f: Fixture) =>
  (
    await sql<Record<string, unknown>[]>`
      select stability, difficulty, due, last_review, reps, lapses, fsrs_state, elapsed_days, scheduled_days,
             learning_steps, fsrs_extra, mastery_state::text as mastery_state
      from public.skill_state where user_id = ${f.user} and skill_key = ${f.skill}`
  )[0];
const reviewHash = async (f: Fixture): Promise<string> => {
  const rows = await sql<{ t: string }[]>`select r::text as t from public.review_log r where user_id = ${f.user} and skill_key = ${f.skill} order by reviewed_at, id`;
  return createHash("sha256").update(rows.map((r) => r.t).join("\n")).digest("hex");
};
const dispute = (id: string, on: boolean) =>
  on
    ? sql`update public.attempts set grade = jsonb_set(grade, '{disputed}', 'true'::jsonb) where id = ${id}`
    : sql`update public.attempts set grade = grade - 'disputed' where id = ${id}`;
const rebuild = (f: Fixture) => rebuildSkillState(f.user, f.skill, NOW, deps);

describe.skipIf(!reachable)("rebuildSkillState (database)", () => {
  beforeAll(async () => {
    deps = { store: createStateStore(sql), fsrs: await sharedFsrsPort(), params: DEFAULT_PARAMS };
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0197 test', 0)`;
  });

  afterAll(async () => {
    await sql`delete from public.item_reports where user_id in ${sql(users)}`;
    await sql`delete from public.admin_users where user_id in ${sql(users)}`;
    await sql`delete from public.events where user_id in ${sql(users)}`;
    await sql`delete from public.review_log where user_id in ${sql(users)}`;
    await sql`delete from public.attempts where user_id in ${sql(users)}`;
    await sql`delete from public.skill_state where user_id in ${sql(users)}`;
    await sql`delete from public.items where id in ${sql(itemIds)}`;
    await sql`delete from public.item_templates where key in ${sql(templates)}`;
    await sql`delete from public.skills where key in ${sql(skills)}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const u of users) await deleteTestUser(sql, u);
    await sql.end();
  });

  it("AC-1: with the second of three reviews disputed, skill_state equals a replay of the first and third; learner_error restores the state before the report", async () => {
    const scores = [1, 0, 1];
    const a = await fixture();
    const ids = await live(a, scores);
    const before = await fsrsCols(a);
    expect(before?.["reps"]).toBe(3);

    await dispute(ids[1] ?? "", true);
    const out = await rebuild(a);
    expect(out).toEqual({ reviewsReplayed: 2, reviewsSkipped: 1 });
    const after = await fsrsCols(a);
    expect(after).not.toEqual(before);
    expect(after?.["reps"]).toBe(2);
    expect(after?.["lapses"]).toBe(0);
    expect(after?.["last_review"]).toEqual(at(3));

    await dispute(ids[1] ?? "", false);
    await rebuild(a);
    expect(await fsrsCols(a)).toEqual(before);
  });

  it("AC-3: no review_log row changes during a rebuild (hash before and after, disputed and cleared)", async () => {
    const f = await fixture();
    const ids = await live(f, [1, 1, 0]);
    const h = await reviewHash(f);
    await dispute(ids[1] ?? "", true);
    await rebuild(f);
    expect(await reviewHash(f)).toBe(h);
    await dispute(ids[1] ?? "", false);
    await rebuild(f);
    expect(await reviewHash(f)).toBe(h);
  });

  it("AC-2: replaying an undisputed skill reproduces the stored FSRS state exactly (generated score sequences)", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.constantFrom(0, 0.5, 1), { minLength: 1, maxLength: 5 }), async (scores) => {
        const f = await fixture();
        await live(f, scores);
        const stored = await fsrsCols(f);
        const out = await rebuild(f);
        expect(out.reviewsSkipped).toBe(0);
        expect(await fsrsCols(f)).toEqual(stored);
      }),
      { numRuns: 8, seed: 97 },
    );
  });

  it("AC-1: a wrong_answer report rebuilds through reportItem, and dismissing it rebuilds again through resolveItemReport", async () => {
    const f = await fixture();
    const ids = await live(f, [1, 1, 1]);
    const before = await fsrsCols(f);
    const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;
    const mk = (userId: string): ApiDeps => ({
      authenticate: async () => ({ userId }),
      idempotency: () => ({ claim: async () => ({ kind: "new" as const }), complete: async () => undefined, release: async () => undefined }),
      rateLimit: () => ({ take: async () => 0 }),
      logger: silent,
    });
    const stores = {
      reports: createReportStore(sql),
      serve: createServeStore(sql),
      // The routes pass the wall clock; the test pins it so the rebuilt state is comparable.
      rebuild: (t: { userId: string; skillKey: string }) => rebuildSkillState(t.userId, t.skillKey, NOW, deps),
    };
    const post = (url: string, body: unknown) =>
      new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

    const rep = await defineRoute("reportItem", (ctx) => reportItem(ctx, stores), mk(f.user))(
      post(`http://localhost/api/v1/items/${f.item}/report`, { reason: "wrong_answer", attempt_id: ids[1] }),
      { params: Promise.resolve({ item_id: f.item }) },
    );
    expect(rep.status).toBe(202);
    expect((await fsrsCols(f))?.["reps"]).toBe(2);

    // Quarantine moved the item out of 'verified' (an unverified attempt never counts for mastery); the
    // founder's triage returns it, which is a separate step from dismissing the report.
    await sql`update public.items set status = 'verified' where id = ${f.item}`;
    await sql`insert into public.admin_users (user_id) values (${f.user})`;
    const reportId = (await sql<{ id: string }[]>`select id from public.item_reports where user_id = ${f.user} and item_id = ${f.item}`)[0]?.id ?? "";
    const res = await defineRoute("resolveItemReport", (ctx) => resolveItemReport(ctx, stores), mk(f.user))(
      post(`http://localhost/api/v1/admin/item-reports/${reportId}/resolve`, { status: "dismissed" }),
      { params: Promise.resolve({ report_id: reportId }) },
    );
    expect(res.status).toBe(200);
    expect(await fsrsCols(f)).toEqual(before);
  });
});
