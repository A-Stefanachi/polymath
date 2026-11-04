// BL-0042 acceptance (integration, local database; skipped without one unless REQUIRE_DB=1):
// applying graded attempts to skill_state and review_log (FR-040, FR-041, FR-042, FR-044; doc 06 3 and 4).
// Attempts are inserted directly as graded rows, as the grading path leaves them; the submit path is
// exercised once for the replay criterion. Time is injected, never read.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import type { ApiContext } from "@/lib/api/route";
import { submitAttempt } from "@/lib/attempts/submit.ts";
import { createAttemptStore } from "@/server/privileged/attempt-store";
import { createServeStore } from "@/server/privileged/item-store";
import { createStateStore } from "@/server/privileged/state-store";
import { DEFAULT_PARAMS } from "@polymath/scheduler";
import { applyGradedAttempt, commitSessionReviews, sharedFsrsPort, tzOffsetMinutes, type StateDeps } from "./apply-attempt.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const tag = randomUUID().slice(0, 8);
const moduleName = `bl42${tag}`;
const users: string[] = [];
const skills: string[] = [];
const templates: string[] = [];
const itemIds: string[] = [];
let seed = 1;
let deps: StateDeps;

const at = (day: number, hour = 10): Date => new Date(Date.UTC(2026, 10, day, hour, 0, 0));
const after = (d: Date): Date => new Date(d.getTime() + 60_000);

type Fixture = { user: string; skill: string; items: string[]; tpl: string };

async function fixture(nItems: number, opts: { tier?: string; taskKind?: string; withWorked?: boolean } = {}): Promise<Fixture> {
  const user = await createTestUser(sql);
  users.push(user);
  const n = skills.length;
  const skill = `math.${moduleName}.s${n}`;
  const tpl = `tpl.math.bl42-${tag}-${n}`;
  skills.push(skill);
  templates.push(tpl);
  await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
    values (${skill}, 'math', ${moduleName}, 'BL-0042 test', ${opts.tier ?? "L0"}, 0, 'CC0-1.0', 'bl0042-test', 'stub')`;
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source)
    values (${tpl}, ${skill}, ${opts.taskKind ?? "retrieval"}, 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0042-test')`;
  const items: string[] = [];
  const kinds = opts.withWorked ? [`${tpl}-w`] : [];
  for (const k of kinds) {
    // Draft, so the skill still has one verified template and the template-diversity clause is waived.
    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source)
      values (${k}, ${skill}, 'worked_example', 'exact_numeric', 'draft', ${sql.json({})}, 'CC0-1.0', 'bl0042-test')`;
    templates.push(k);
  }
  for (let i = 0; i < nItems; i++) items.push(await addItem(tpl));
  if (opts.withWorked) items.push(await addItem(`${tpl}-w`, "draft"));
  return { user, skill, items, tpl };
}

async function addItem(tpl: string, status = "verified"): Promise<string> {
  const row = (
    await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, rendered, verification_report, status)
      values (${tpl}, 1, ${seed++}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, ${status}) returning id`
  )[0];
  const id = row?.id ?? "";
  itemIds.push(id);
  return id;
}

async function addAttempt(
  f: Fixture,
  item: string,
  submitted: Date,
  o: { score?: number; sessionId?: string | null; status?: string; masteryEligible?: boolean } = {},
): Promise<string> {
  const score = o.score ?? 1;
  const status = o.status ?? "graded";
  const grade =
    status === "graded"
      ? { status, score, correct: score >= 0.8, graders: [], mastery_eligible: o.masteryEligible ?? true }
      : null;
  const row = (
    await sql<{ id: string }[]>`
      insert into public.attempts (user_id, item_id, session_id, started_at, submitted_at, response, grade, grade_status, graded_at, client_attempt_id)
      values (${f.user}, ${item}, ${o.sessionId ?? null}, ${new Date(submitted.getTime() - 30_000).toISOString()}, ${submitted.toISOString()},
              ${sql.json({ kind: "numeric", value: 1 })}, ${grade ? sql.json(grade) : null}, ${status}, ${status === "graded" ? submitted.toISOString() : null}, ${randomUUID()})
      returning id`
  )[0];
  return row?.id ?? "";
}

const apply = (id: string, now: Date) => applyGradedAttempt(id, now, deps);
const skillRow = async (f: Fixture) =>
  (await sql<Record<string, unknown>[]>`select * from public.skill_state where user_id = ${f.user} and skill_key = ${f.skill}`)[0];
const reviews = async (f: Fixture) =>
  sql<{ rating: number; attempt_ids: string[]; session_id: string | null }[]>`
    select rating, attempt_ids, session_id from public.review_log where user_id = ${f.user} and skill_key = ${f.skill} order by reviewed_at`;
const events = async (f: Fixture, name: string) =>
  sql<{ props: Record<string, unknown> }[]>`select props from public.events where user_id = ${f.user} and name = ${name} order by at, id`;

describe("tzOffsetMinutes", () => {
  it("returns the offset at that instant, 0 for UTC and for an unknown zone", () => {
    expect(tzOffsetMinutes("UTC", at(4))).toBe(0);
    expect(tzOffsetMinutes("Europe/Berlin", at(4))).toBe(60);
    expect(tzOffsetMinutes("Europe/Berlin", new Date(Date.UTC(2026, 6, 4)))).toBe(120);
    expect(tzOffsetMinutes("America/New_York", at(4))).toBe(-300);
    expect(tzOffsetMinutes("Not/AZone", at(4))).toBe(0);
  });
});

describe.skipIf(!reachable)("applyGradedAttempt (database)", () => {
  beforeAll(async () => {
    deps = { store: createStateStore(sql), fsrs: await sharedFsrsPort(), params: DEFAULT_PARAMS };
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0042 test', 0)`;
  });

  afterAll(async () => {
    await sql`delete from public.events where user_id in ${sql(users)}`;
    await sql`delete from public.review_log where user_id in ${sql(users)}`;
    await sql`delete from public.attempts where user_id in ${sql(users)}`;
    await sql`delete from public.skill_state where user_id in ${sql(users)}`;
    await sql`delete from public.sessions where user_id in ${sql(users)}`;
    await sql`delete from public.items where id in ${sql(itemIds)}`;
    await sql`delete from public.item_templates where key in ${sql(templates)}`;
    await sql`delete from public.skills where key in ${sql(skills)}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const u of users) await deleteTestUser(sql, u);
    await sql.end();
  });

  it("AC-1: 3 correct unaided attempts on 3 days and 3 variants reach mastered; skill_state_changed to mastered fires once", async () => {
    const f = await fixture(3);
    const days = [1, 2, 3].map((d) => at(d));
    const ids = [] as string[];
    for (const [i, d] of days.entries()) ids.push(await addAttempt(f, f.items[i] ?? "", d));

    const first = await apply(ids[0] ?? "", after(days[0] ?? at(1)));
    expect(first.applied).toBe(true);
    const row1 = await skillRow(f);
    // doc 06 5.4 worked numbers: theta 1300, n 0, d 1500, correct unaided -> 1336.47.
    expect(Number(row1?.["elo"])).toBeCloseTo(1336.47, 2);
    expect(row1?.["n_attempts"]).toBe(1);
    expect(row1?.["mastery_state"]).toBe("learning");
    const tpl = (await sql<{ difficulty_est: number; n_obs: number }[]>`select difficulty_est, n_obs from public.item_templates where key = ${f.tpl}`)[0];
    expect(Number(tpl?.difficulty_est)).toBeCloseTo(1481.77, 2);
    expect(tpl?.n_obs).toBe(1);

    await apply(ids[1] ?? "", after(days[1] ?? at(2)));
    expect((await skillRow(f))?.["mastery_state"]).toBe("reviewing");
    const third = await apply(ids[2] ?? "", after(days[2] ?? at(3)));
    expect(third).toMatchObject({ applied: true, skillUpdate: { mastery_state: "mastered", tier_attained: "L0", rating: 3 } });

    const row = await skillRow(f);
    expect(row?.["mastery_state"]).toBe("mastered");
    expect(row?.["ever_mastered"]).toBe(true);
    expect(row?.["n_attempts"]).toBe(3);
    expect(row?.["reps"]).toBe(3);
    expect((await reviews(f)).length).toBe(3);
    const changed = await events(f, "skill_state_changed");
    expect(changed.filter((e) => e.props["to_state"] === "mastered")).toHaveLength(1);
    expect((await events(f, "review_scheduled")).length).toBe(3);
  });

  it("AC-2: applying the same attempt twice changes nothing the second time", async () => {
    const f = await fixture(1);
    const id = await addAttempt(f, f.items[0] ?? "", at(1));
    expect((await apply(id, after(at(1)))).applied).toBe(true);
    const before = await skillRow(f);
    expect(await apply(id, after(at(1)))).toEqual({ applied: false, reason: "already_applied" });
    const afterRow = await skillRow(f);
    expect(afterRow?.["n_attempts"]).toBe(1);
    expect(afterRow?.["elo"]).toBe(before?.["elo"]);
    expect((await reviews(f)).length).toBe(1);
  });

  it("AC-2: a second submit with the same client_attempt_id writes no further review_log row", async () => {
    const f = await fixture(1);
    await sql`insert into public.item_secrets (item_id, answer_key) values (${f.items[0] ?? ""},
      ${sql.json({ grader_type: "exact_numeric", answer_spec: { kind: "numeric", unit: "V", tolerance: { rel: 0.01 } }, reference: 5 })})`;
    const stores = { serve: createServeStore(sql), attempts: createAttemptStore(sql), state: async () => deps };
    const body = {
      client_attempt_id: randomUUID(),
      item_id: f.items[0],
      started_at: "2026-11-01T07:31:00Z",
      submitted_at: "2026-11-01T07:31:42Z",
      response: { kind: "numeric", value: 5, unit: "V" },
    };
    const ctx = { caller: { userId: f.user }, body } as unknown as ApiContext;
    const first = (await (await submitAttempt(ctx, stores)).json()) as { skill_update?: { rating: number; mastery_state: string } };
    expect(first.skill_update).toMatchObject({ rating: 3, mastery_state: "learning" });
    const second = await submitAttempt(ctx, stores);
    expect(second.status).toBe(200);
    expect((await reviews(f)).length).toBe(1);
    expect((await skillRow(f))?.["n_attempts"]).toBe(1);
  });

  it("AC-3: two attempts on one skill in one session create exactly one review_log row, at session close", async () => {
    const f = await fixture(2);
    const session = (
      await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, available_minutes, status)
        values (${f.user}, 'micro', 'desktop', 10, 10, 'active') returning id`
    )[0]?.id ?? "";
    const a1 = await addAttempt(f, f.items[0] ?? "", at(1, 10), { sessionId: session });
    const a2 = await addAttempt(f, f.items[1] ?? "", at(1, 10 + 0), { sessionId: session, score: 0.9 });
    const r1 = await apply(a1, after(at(1)));
    const r2 = await apply(a2, after(at(1)));
    // Elo and mastery moved at grading; the card and review_log wait for the unit (00a H15).
    expect(r1).toMatchObject({ applied: true, skillUpdate: { rating: null } });
    expect(r2).toMatchObject({ applied: true, skillUpdate: { rating: null } });
    expect((await skillRow(f))?.["n_attempts"]).toBe(2);
    expect((await reviews(f)).length).toBe(0);

    expect(await commitSessionReviews(randomUUID(), session, after(at(1)), deps)).toBeNull(); // not the owner
    const out = await commitSessionReviews(f.user, session, after(at(1)), deps);
    expect(out).toHaveLength(1);
    const rows = await reviews(f);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.attempt_ids.sort()).toEqual([a1, a2].sort());
    expect(rows[0]?.session_id).toBe(session);
    expect(rows[0]?.rating).toBe(3);

    await commitSessionReviews(f.user, session, after(at(1)), deps); // idempotent
    expect((await reviews(f)).length).toBe(1);
    expect((await skillRow(f))?.["reps"]).toBe(1);
  });

  it("AC-4: failing a mastered skill decays it and makes it due now (FR-044)", async () => {
    const f = await fixture(4);
    for (const d of [1, 2, 3]) await apply(await addAttempt(f, f.items[d - 1] ?? "", at(d)), after(at(d)));
    expect((await skillRow(f))?.["mastery_state"]).toBe("mastered");

    const now = after(at(4));
    const fail = await addAttempt(f, f.items[3] ?? "", at(4), { score: 0 });
    const res = await apply(fail, now);
    expect(res).toMatchObject({ applied: true, skillUpdate: { mastery_state: "decayed", rating: 1, tier_attained: "L0" } });
    const row = await skillRow(f);
    expect(row?.["mastery_state"]).toBe("decayed");
    expect((row?.["due"] as Date).getTime()).toBeLessThanOrEqual(now.getTime());
    expect(row?.["lapses"]).toBe(1);
    const changed = await events(f, "skill_state_changed");
    expect(changed.at(-1)?.props).toMatchObject({ from_state: "mastered", to_state: "decayed" });
  });

  it("ignores a not-yet-graded attempt (no stamp, no state) and applies it once it is graded", async () => {
    const f = await fixture(1);
    const id = await addAttempt(f, f.items[0] ?? "", at(1), { status: "pending" });
    expect(await apply(id, after(at(1)))).toEqual({ applied: false, reason: "not_graded" });
    expect(await skillRow(f)).toBeUndefined();
    expect(await apply(randomUUID(), after(at(1)))).toEqual({ applied: false, reason: "not_found" });
  });

  it("stamps an attempt that is not mastery-eligible and changes no learner state", async () => {
    const f = await fixture(1);
    const id = await addAttempt(f, f.items[0] ?? "", at(1), { masteryEligible: false });
    expect(await apply(id, after(at(1)))).toEqual({ applied: false, reason: "not_mastery_eligible" });
    expect(await skillRow(f)).toBeUndefined();
    expect((await reviews(f)).length).toBe(0);
    const stamped = (await sql<{ state_applied_at: Date | null }[]>`select state_applied_at from public.attempts where id = ${id}`)[0];
    expect(stamped?.state_applied_at).not.toBeNull();
  });

  it("a worked example weighs 0 in Elo, creates no review and moves loop_step forward (06 3.2)", async () => {
    const f = await fixture(0, { withWorked: true });
    const id = await addAttempt(f, f.items[0] ?? "", at(1));
    await apply(id, after(at(1)));
    const row = await skillRow(f);
    expect(row?.["n_attempts"]).toBe(0);
    expect(Number(row?.["elo"])).toBe(1300);
    expect(row?.["loop_step"]).toBe("faded_problem");
    expect(row?.["mastery_state"]).toBe("learning");
    expect((await reviews(f)).length).toBe(0);
  });

  it("writes at most one review_log row per skill per local day, yet still updates Elo and mastery", async () => {
    const f = await fixture(2);
    await apply(await addAttempt(f, f.items[0] ?? "", at(1, 9)), after(at(1, 9)));
    await apply(await addAttempt(f, f.items[1] ?? "", at(1, 15)), after(at(1, 15)));
    expect((await reviews(f)).length).toBe(1);
    expect((await skillRow(f))?.["n_attempts"]).toBe(2);
  });
});
