// BL-0046 acceptance (integration, local database; skipped without one unless REQUIRE_DB=1): the daily new-skill
// cap, the review backlog flag, the session-length break suggestion, and the packer inputs fed from the database
// (needs_applied, doc 06 section 7.1). AC-1 cap across sessions; AC-2 break_suggested over 120 minutes;
// AC-3 backlog lets reviews fill the whole budget; AC-4 applied gap (BL-0184 integration item).
import { randomUUID } from "node:crypto";
import { createFsrsAdapter, DEFAULT_PARAMS } from "@polymath/scheduler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createIdempotencyStore } from "@/server/privileged/idempotency-store";
import { ensurePoolStock } from "@/server/privileged/pool-store";
import { createSessionStore } from "@/server/privileged/session-store";
import { createStateStore } from "@/server/privileged/state-store";
import { buildPackSetup, planSession } from "./builder.ts";
import { appliedGapSkills } from "./pack-inputs.ts";
import { buildSession, completeSession, getSession, startSession, type SessionDeps } from "./sessions.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;

let clock = new Date();
const baseDeps: SessionDeps = {
  store: createSessionStore(sql),
  state: async () => ({ store: createStateStore(sql), fsrs: await createFsrsAdapter(), params: DEFAULT_PARAMS }),
  pool: (userId, keys, now) => ensurePoolStock(sql, userId, keys, now),
  now: () => clock,
};
const apiDeps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => createIdempotencyStore(sql),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
const routes = (userId: string, deps: SessionDeps = baseDeps) => ({
  build: defineRoute("buildSession", (c) => buildSession(c, deps), apiDeps(userId)),
  get: defineRoute("getSession", (c) => getSession(c, deps), apiDeps(userId)),
  start: defineRoute("startSession", (c) => startSession(c, deps), apiDeps(userId)),
  complete: defineRoute("completeSession", (c) => completeSession(c, deps), apiDeps(userId)),
});

const tag = randomUUID().slice(0, 8);
const moduleName = `bl46${tag}`;
const [a1, a2, a3] = ["a1", "a2", "a3"].map((n) => `math.${moduleName}.${n}`) as [string, string, string];
const KINDS = ["retrieval", "worked_example", "faded_problem", "problem"];
const tpl = (skill: string, kind: string) => `tpl.math.bl46-${skill.slice(-2)}-${kind.replaceAll("_", "")}-${tag}`;
const tplAlt = `tpl.math.bl46-a1-retrievalalt-${tag}`;
const templates: string[] = [tplAlt];
let seed = 1;
const users: Record<"cap" | "backlog" | "gap" | "brk", string> = { cap: "", backlog: "", gap: "", brk: "" };

type Json = Record<string, unknown>;
type Task = { task_kind: string; skill_key: string; reason: string; item_id: string; id: string };
const call = (r: (req: Request, c?: { params: Promise<Record<string, string>> }) => Promise<Response>, path: string, body?: unknown, id?: string, method = "POST") =>
  r(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", "idempotency-key": `bl46-${randomUUID()}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), {
    params: Promise.resolve(id ? { session_id: id } : {}),
  });

async function addItem(userId: string, template: string): Promise<string> {
  const row = await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
    values (${template}, 1, ${seed++}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified', ${userId}) returning id`;
  return row[0]?.id ?? "";
}
async function addItems(userId: string, skill: string, perKind: number): Promise<void> {
  for (const kind of KINDS) for (let n = 0; n < perKind; n += 1) await addItem(userId, tpl(skill, kind));
}
async function attempt(userId: string, itemId: string, at: Date, extra: { sessionId?: string } = {}): Promise<void> {
  await sql`insert into public.attempts (user_id, item_id, session_id, client_attempt_id, started_at, submitted_at, response, grade, grade_status, graded_at,
              active_ms, unaided, max_hint_level, state_applied_at)
    values (${userId}, ${itemId}, ${extra.sessionId ?? null}, ${randomUUID()}, ${at}, ${at}, ${sql.json({ kind: "numeric", value: 1 })},
            ${sql.json({ status: "graded", score: 1, correct: true, graders: [] })}, 'graded', ${at}, 30000, true, 0, ${at})`;
}
/** Every other skill that has a verified practice template is already learned, so only this file's skills compete. */
async function quiesceOthers(userId: string): Promise<void> {
  // Skills made by other test files (source "...-test") are left alone: they delete their skills on teardown.
  const others = await sql<{ skill_key: string }[]>`select distinct t.skill_key from public.item_templates t join public.skills s on s.key = t.skill_key
    where t.status = 'verified' and t.pool = 'practice' and t.retired_at is null and s.source not like '%test%'`;
  for (const o of others) {
    await sql`insert into public.skill_state (user_id, skill_key, mastery_state, first_seen_at) values (${userId}, ${o.skill_key}, 'mastered', now() - interval '60 days')
      on conflict do nothing`;
  }
}
async function learned(userId: string, skill: string, due: string): Promise<void> {
  await sql`insert into public.skill_state (user_id, skill_key, mastery_state, due, last_review, stability, difficulty, reps, fsrs_state, tier_attained, first_seen_at)
    values (${userId}, ${skill}, 'mastered', ${sql.unsafe(due)}, now() - interval '6 days', 5, 5, 3, 2, 'L1', now() - interval '30 days')`;
}
async function build(userId: string, body: Json, deps: SessionDeps = baseDeps): Promise<Json> {
  const res = await call(routes(userId, deps).build, "/sessions/build", body);
  const out = (await res.json()) as Json;
  expect([200, 201], JSON.stringify(out)).toContain(res.status);
  return out;
}
const frontierSkills = async (userId: string): Promise<string[]> =>
  (await sql<{ skill_key: string }[]>`select distinct skill_key from public.session_tasks where user_id = ${userId} and reason = 'frontier' order by 1`).map((r) => r.skill_key);

describe.skipIf(!reachable)("caps and guards (database)", () => {
  beforeAll(async () => {
    for (const k of Object.keys(users) as (keyof typeof users)[]) users[k] = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0046 test', 0)`;
    for (const skill of [a1, a2, a3]) {
      await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
        values (${skill}, 'math', ${moduleName}, 'BL-0046 test', 'L1', 5, 'CC0-1.0', 'bl0046-test', 'draft',
                ${sql.array(KINDS)}::public.task_kind[], ${sql.array(["exact_numeric"])}::public.grader_type[], true)`;
      for (const kind of KINDS) {
        templates.push(tpl(skill, kind));
        await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
          values (${tpl(skill, kind)}, ${skill}, ${kind}, 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0046-test', ${kind !== "problem"})`;
      }
    }
    // est_minutes 5 (other test files use 10) ranks these skills first among new skills (frontier cost term, 06 section 6.3),
    // so skills left by tests running in parallel never take the new-skill slots. A second retrieval template: the mastery rule wants qualifying attempts on two templates.
    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
      values (${tplAlt}, ${a1}, 'retrieval', 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0046-test', true)`;
    for (const u of Object.values(users)) await quiesceOthers(u);

    await sql`update public.profiles set settings = jsonb_build_object('max_new_skills_per_day', 2) where id = ${users.cap}`;
    for (const s of [a1, a2, a3]) await addItems(users.cap, s, 4);

    for (const s of [a1, a2, a3]) {
      await learned(users.backlog, s, "now() - interval '1 day'");
      await addItems(users.backlog, s, 3);
    }

    // a1: reviewing with three qualifying retrievals on two templates over 5 days, no applied attempt. a3: reviewing, no evidence.
    await sql`insert into public.skill_state (user_id, skill_key, mastery_state, due, last_review, stability, difficulty, reps, fsrs_state, tier_attained, first_seen_at)
      select ${users.gap}, k, 'reviewing', now() + interval '10 days', now() - interval '1 day', 20, 5, 3, 2, 'L0', now() - interval '30 days' from unnest(${sql.array([a1, a3])}::text[]) k`;
    await addItems(users.gap, a1, 4);
    const day = 86_400_000;
    for (const [template, ago] of [[tpl(a1, "retrieval"), 6], [tplAlt, 4], [tpl(a1, "retrieval"), 1]] as const) {
      await attempt(users.gap, await addItem(users.gap, template), new Date(Date.now() - ago * day));
    }

    await addItems(users.brk, a1, 3);
  });

  afterAll(async () => {
    const all = Object.values(users);
    await sql`delete from public.jobs where user_id in ${sql(all)}`;
    await sql`delete from public.events where user_id in ${sql(all)}`;
    await sql`delete from public.attempts where user_id in ${sql(all)}`;
    await sql`delete from public.review_log where user_id in ${sql(all)}`;
    await sql`delete from public.sessions where user_id in ${sql(all)}`;
    await sql`delete from public.items where template_key in ${sql(templates)}`;
    await sql`delete from public.item_templates where key in ${sql(templates)}`;
    await sql`delete from public.skill_state where user_id in ${sql(all)}`;
    await sql`delete from public.skills where key in ${sql([a1, a2, a3])}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const u of all) await deleteTestUser(sql, u);
    await sql.end();
  });

  it("AC-1: with cap=2 and three new skills available, the builder adds at most 2 new skills in a day across sessions", async () => {
    const focus = { available_minutes: 120, context: "desktop", session_type: "focus" };
    const first = await build(users.cap, focus);
    expect(await frontierSkills(users.cap)).toHaveLength(2);
    const done = await call(routes(users.cap).complete, `/sessions/${String(first["id"])}/complete`, {}, String(first["id"]));
    expect(done.status).toBe(200);
    const second = await build(users.cap, focus);
    const secondTasks = (second["tasks"] as Task[] | undefined) ?? [];
    expect(secondTasks.filter((t) => t.reason === "frontier")).toHaveLength(0);
    expect(await frontierSkills(users.cap)).toHaveLength(2);
  });

  it("AC-3: the backlog flag lets reviews fill the whole budget instead of 70 percent, and is kept on the session", async () => {
    // 5 minutes: budget 4.5; without a backlog reviews stop at 3.15 (2 retrievals), with one at 4.5 (3 retrievals).
    const micro = { available_minutes: 5, context: "phone", session_type: "micro" };
    const reviews = (s: Json) => ((s["tasks"] as Task[]) ?? []).filter((t) => t.reason === "due_review").length;
    const plain = await build(users.backlog, micro);
    expect(reviews(plain)).toBe(2);
    expect((await sql<{ b: string | null }[]>`select plan ->> 'backlog' as b from public.sessions where id = ${String(plain["id"])}`)[0]?.b).toBe("false");
    await sql`update public.sessions set status = 'abandoned', ended_at = now() where user_id = ${users.backlog} and status = 'planned'`;
    const backlog = await build(users.backlog, micro, { ...baseDeps, backlogThresholdMin: 3 }); // 3 due x 1.5 = 4.5 > 3
    expect(reviews(backlog)).toBe(3);
    expect((await sql<{ b: string | null }[]>`select plan ->> 'backlog' as b from public.sessions where id = ${String(backlog["id"])}`)[0]?.b).toBe("true");
  });

  it("AC-4: a reviewing skill with only the applied attempt missing is planned with an applied_gap problem in a focus build", async () => {
    const state = await baseDeps.state();
    const snap = await baseDeps.store.snapshot(users.gap, clock);
    expect([...(await appliedGapSkills(users.gap, snap, state))]).toEqual([a1]); // a3 lacks more than the applied attempt
    const gap = await appliedGapSkills(users.gap, snap, state);
    const plan = planSession(buildPackSetup(snap, clock, state.fsrs, undefined, { appliedGap: gap, params: state.params }), "focus", "desktop", 60, state.params);
    expect(plan.tasks.find((t) => t.reason === "applied_gap")).toMatchObject({ skill_key: a1, task_kind: "problem" });
    // Through the API the reason is the enum value `continue` (api.openapi.yaml SessionTask.reason).
    const session = await build(users.gap, { available_minutes: 60, context: "desktop", session_type: "focus" });
    const mine = ((session["tasks"] as Task[]) ?? []).find((t) => t.skill_key === a1 && t.task_kind === "problem");
    expect(mine).toMatchObject({ reason: "continue" });
  });

  it("AC-2: a session running over 120 minutes gets one break_suggested event and keeps going; 120 exactly does not", async () => {
    const session = await build(users.brk, { available_minutes: 15, context: "phone", session_type: "micro" });
    const id = String(session["id"]);
    const r = routes(users.brk);
    expect((await call(r.start, `/sessions/${id}/start`, undefined, id)).status).toBe(200);
    const startedAt = (await sql<{ started_at: Date }[]>`select started_at from public.sessions where id = ${id}`)[0]?.started_at ?? new Date();
    const item = ((session["tasks"] as Task[])[0] as Task).item_id;
    await attempt(users.brk, item, new Date(startedAt.getTime() + 119 * 60_000), { sessionId: id }); // keeps the session from idling out
    const events = () => sql<{ props: Json }[]>`select props from public.events where user_id = ${users.brk} and name = 'break_suggested' and props ->> 'session_id' = ${id}`;
    try {
      clock = new Date(startedAt.getTime() + 120 * 60_000);
      await call(r.get, `/sessions/${id}`, undefined, id, "GET");
      expect(await events()).toHaveLength(0);
      clock = new Date(startedAt.getTime() + 121 * 60_000);
      const got = (await (await call(r.get, `/sessions/${id}`, undefined, id, "GET")).json()) as Json;
      await call(r.get, `/sessions/${id}`, undefined, id, "GET");
      expect(got["status"]).toBe("active");
      const written = await events();
      expect(written).toHaveLength(1);
      expect(written[0]?.props).toMatchObject({ minutes_in: 121 });
    } finally {
      clock = new Date();
    }
  });
});
