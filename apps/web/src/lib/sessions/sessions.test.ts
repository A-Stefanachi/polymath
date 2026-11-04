// BL-0044 acceptance (integration, local database; skipped without one unless REQUIRE_DB=1):
// buildSession, startSession, getSession, completeSession, listSessions through defineRoute.
// AC-1 phone micro build fits the minutes and holds only phone-suitable tasks; AC-2 an empty result is
// not an error; AC-3 another user's session is a 404 (ST-API-01); AC-4 the summary equals SQL counts.
import { randomUUID } from "node:crypto";
import { createFsrsAdapter, DEFAULT_PARAMS, PHONE_KINDS } from "@polymath/scheduler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createIdempotencyStore } from "@/server/privileged/idempotency-store";
import { ensurePoolStock } from "@/server/privileged/pool-store";
import { createSessionStore } from "@/server/privileged/session-store";
import { createStateStore } from "@/server/privileged/state-store";
import { buildSession, completeSession, getSession, listSessions, startSession, type SessionDeps } from "./sessions.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;

let clock = new Date();
const sessionDeps: SessionDeps = {
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
const routes = (userId: string) => ({
  build: defineRoute("buildSession", (c) => buildSession(c, sessionDeps), apiDeps(userId)),
  list: defineRoute("listSessions", (c) => listSessions(c, sessionDeps), apiDeps(userId)),
  get: defineRoute("getSession", (c) => getSession(c, sessionDeps), apiDeps(userId)),
  start: defineRoute("startSession", (c) => startSession(c, sessionDeps), apiDeps(userId)),
  complete: defineRoute("completeSession", (c) => completeSession(c, sessionDeps), apiDeps(userId)),
});

const tag = randomUUID().slice(0, 8);
const moduleName = `bl44${tag}`;
const s1 = `math.${moduleName}.s1`;
const s2 = `math.${moduleName}.s2`;
const tpl = (skill: string, kind: string) => `tpl.math.bl44-${skill.endsWith("s1") ? "a" : "b"}-${kind.replaceAll("_", "")}-${tag}`;
const KINDS = ["retrieval", "worked_example", "faded_problem", "problem"];
const templates: string[] = [];
let seed = 1;
let learner = "";
let other = "";
let pooless = "";
let reviewee = "";

type Json = Record<string, unknown>;
const headers = (key?: string) => ({ "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) });
const post = (r: (req: Request, c?: { params: Promise<Record<string, string>> }) => Promise<Response>, path: string, body?: unknown, key?: string, id?: string) =>
  r(new Request(`http://localhost/api/v1${path}`, { method: "POST", headers: headers(key), ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), {
    params: Promise.resolve(id ? { session_id: id } : {}),
  });
const get = (r: (req: Request, c?: { params: Promise<Record<string, string>> }) => Promise<Response>, path: string, id?: string) =>
  r(new Request(`http://localhost/api/v1${path}`), { params: Promise.resolve(id ? { session_id: id } : {}) });
const MICRO = { available_minutes: 15, context: "phone", session_type: "micro", skill_focus: s1 };

async function addItems(userId: string, skill: string, perKind: number, status = "verified"): Promise<void> {
  for (const kind of KINDS) {
    for (let n = 0; n < perKind; n += 1) {
      await sql`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
        values (${tpl(skill, kind)}, 1, ${seed++}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, ${status}, ${userId})`;
    }
  }
}

async function clearOpen(userId: string): Promise<void> {
  await sql`update public.sessions set status = 'abandoned', ended_at = now() where user_id = ${userId} and status in ('planned', 'active')`;
}

async function buildOk(userId: string, body: Json = MICRO): Promise<Json> {
  const res = await post(routes(userId).build, "/sessions/build", body, `bl44-${randomUUID()}`);
  expect(res.status).toBe(201);
  return (await res.json()) as Json;
}

describe.skipIf(!reachable)("session builder API (database)", () => {
  beforeAll(async () => {
    [learner, other, pooless, reviewee] = [await createTestUser(sql), await createTestUser(sql), await createTestUser(sql), await createTestUser(sql)];
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0044 test', 0)`;
    for (const [skill, phone] of [[s1, true], [s2, true]] as const) {
      await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
        values (${skill}, 'math', ${moduleName}, 'BL-0044 test', 'L1', 10, 'CC0-1.0', 'bl0044-test', 'draft',
                ${sql.array(KINDS)}::public.task_kind[], ${sql.array(["exact_numeric"])}::public.grader_type[], ${phone})`;
      for (const kind of KINDS) {
        const key = tpl(skill, kind);
        templates.push(key);
        // The standard `problem` is not phone-suitable (06 section 7.3).
        await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
          values (${key}, ${skill}, ${kind}, 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0044-test', ${kind !== "problem"})`;
      }
    }
    await sql`insert into public.skill_state (user_id, skill_key, mastery_state, due, last_review, stability, difficulty, reps, fsrs_state, tier_attained, first_seen_at)
      values (${learner}, ${s2}, 'reviewing', now() - interval '1 day', now() - interval '6 days', 5, 5, 3, 2, 'L1', now() - interval '30 days')`;
    await addItems(learner, s1, 3);
    await addItems(learner, s2, 3);
    await addItems(other, s1, 3);
    await addItems(reviewee, s1, 6); // five builds in this file draw on it
    await addItems(pooless, s1, 2, "needs_human_review");
  });

  afterAll(async () => {
    const users = [learner, other, pooless, reviewee];
    await sql`delete from public.jobs where user_id in ${sql(users)}`;
    await sql`delete from public.events where user_id in ${sql(users)}`;
    await sql`delete from public.attempts where user_id in ${sql(users)}`;
    await sql`delete from public.review_log where user_id in ${sql(users)}`;
    await sql`delete from public.sessions where user_id in ${sql(users)}`;
    await sql`delete from public.items where template_key in ${sql(templates)}`;
    await sql`delete from public.item_templates where key in ${sql(templates)}`;
    await sql`delete from public.skill_state where skill_key in (${s1}, ${s2})`;
    await sql`delete from public.skills where key in (${s1}, ${s2})`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const u of users) await deleteTestUser(sql, u);
    await sql.end();
  });

  it("AC-1: a 15-minute phone micro build fits the minutes, is phone-suitable, and uses owned verified unserved items", async () => {
    const session = await buildOk(learner);
    const tasks = session["tasks"] as { task_kind: string; est_seconds: number; item_id: string; skill_key: string; status: string; reason: string }[];
    expect(session).toMatchObject({ session_type: "micro", context: "phone", status: "planned", available_minutes: 15 });
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    expect(tasks.reduce((s, t) => s + t.est_seconds, 0)).toBeLessThanOrEqual(15 * 60);
    expect(session["planned_min"]).toBeLessThanOrEqual(15);
    expect(tasks.every((t) => PHONE_KINDS.includes(t.task_kind) && t.status === "pending")).toBe(true);
    expect(tasks.map((t) => t.reason)).toContain("due_review");
    expect(tasks.map((t) => t.skill_key)).toContain(s2);
    const rows = await sql<{ owner: string; status: string; tstatus: string; phone: boolean }[]>`
      select i.user_id as owner, i.status::text as status, t.status::text as tstatus, t.phone_suitable as phone
        from public.items i join public.item_templates t on t.key = i.template_key and t.version = i.template_version
       where i.id in ${sql(tasks.map((t) => t.item_id))}`;
    expect(rows).toHaveLength(tasks.length);
    expect(rows.every((r) => r.owner === learner && r.status === "verified" && r.tstatus === "verified" && r.phone)).toBe(true);
    expect(new Set(tasks.map((t) => t.item_id)).size).toBe(tasks.length);
    const text = JSON.stringify(session);
    for (const secret of ["answer_key", "verification_report", "params", "rendered"]) expect(text).not.toContain(secret);
    const events = await sql`select props from public.events where user_id = ${learner} and name = 'session_built' and props ->> 'session_id' = ${String(session["id"])}`;
    expect(events).toHaveLength(1);
    await clearOpen(learner);
  });

  it("AC-2: an empty plan is a clear 200 with no tasks and writes no session", async () => {
    const before = await sql`select 1 from public.sessions where user_id = ${other}`;
    const res = await post(routes(other).build, "/sessions/build", { available_minutes: 15, context: "bench", session_type: "micro" }, `bl44-${randomUUID()}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tasks: [], planned_min: 0 });
    expect(await sql`select 1 from public.sessions where user_id = ${other}`).toHaveLength(before.length);
  });

  it("answers 503 item_pool_empty and enqueues a shortage job when only unverified items exist (rule 3)", async () => {
    const res = await post(routes(pooless).build, "/sessions/build", MICRO, `bl44-${randomUUID()}`);
    expect(res.status).toBe(503);
    expect(((await res.json()) as Json)["code"]).toBe("item_pool_empty");
    expect(await sql`select 1 from public.session_tasks where user_id = ${pooless}`).toHaveLength(0);
    expect(await sql`select 1 from public.jobs where user_id = ${pooless} and kind = 'pregenerate_items' and priority = 100`).toHaveLength(1);
  });

  it("rejects extra fields, bad ranges, dry_run and a focus skill off the frontier with 400", async () => {
    const r = routes(other).build;
    const bodies: Json[] = [
      { ...MICRO, surprise: 1 },
      { ...MICRO, available_minutes: 0 },
      { ...MICRO, available_minutes: 241 },
      { ...MICRO, dry_run: true },
      { ...MICRO, session_type: "focus" },
      { ...MICRO, skill_focus: "math.nothing.here" },
    ];
    for (const b of bodies) expect((await post(r, "/sessions/build", b, `bl44-${randomUUID()}`)).status).toBe(400);
    expect(await sql`select 1 from public.sessions where user_id = ${other}`).toHaveLength(0);
  });

  it("replays an Idempotency-Key without a second session, and refuses a second open session", async () => {
    const key = `bl44-replay-${tag}`;
    const first = await post(routes(other).build, "/sessions/build", MICRO, key);
    const again = await post(routes(other).build, "/sessions/build", MICRO, key);
    expect(first.status).toBe(201);
    expect(again.status).toBe(201);
    expect(again.headers.get("Idempotent-Replay")).toBe("true");
    const a = (await first.json()) as Json;
    expect(((await again.json()) as Json)["id"]).toBe(a["id"]);
    expect(await sql`select 1 from public.sessions where user_id = ${other}`).toHaveLength(1);
    const second = await post(routes(other).build, "/sessions/build", MICRO, `bl44-${randomUUID()}`);
    expect(second.status).toBe(409);
    expect(((await second.json()) as Json)["code"]).toBe("open_session_exists");
    await clearOpen(other);
  });

  it("AC-3: another user's session is 404 on get, start and complete (ST-API-01)", async () => {
    const mine = await buildOk(other);
    const id = String(mine["id"]);
    expect((await get(routes(learner).get, `/sessions/${id}`, id)).status).toBe(404);
    expect((await post(routes(learner).start, `/sessions/${id}/start`, undefined, undefined, id)).status).toBe(404);
    expect((await post(routes(learner).complete, `/sessions/${id}/complete`, {}, undefined, id)).status).toBe(404);
    expect((await get(routes(learner).get, "/sessions/not-a-uuid", "not-a-uuid")).status).toBe(404);
    expect((await get(routes(other).get, `/sessions/${id}`, id)).status).toBe(200);
    expect(((await (await get(routes(learner).list, "/sessions")).json()) as { items: Json[] }).items.every((s) => s["id"] !== id)).toBe(true);
    await clearOpen(other);
  });

  it("starts a planned session once, keeps an active one unchanged and refuses a closed one", async () => {
    const id = String((await buildOk(other))["id"]);
    const r = routes(other);
    const started = (await (await post(r.start, `/sessions/${id}/start`, undefined, undefined, id)).json()) as Json;
    expect(started["status"]).toBe("active");
    expect(typeof started["started_at"]).toBe("string");
    const again = (await (await post(r.start, `/sessions/${id}/start`, undefined, undefined, id)).json()) as Json;
    expect(again["started_at"]).toBe(started["started_at"]);
    expect(await sql`select 1 from public.events where user_id = ${other} and name = 'session_started' and props ->> 'session_id' = ${id}`).toHaveLength(1);
    expect((await post(r.complete, `/sessions/${id}/complete`, {}, undefined, id)).status).toBe(200);
    const closed = await post(r.start, `/sessions/${id}/start`, undefined, undefined, id);
    expect(closed.status).toBe(409);
    expect(((await closed.json()) as Json)["code"]).toBe("session_not_startable");
  });

  it("AC-4: the completion summary equals the SQL counts of the session's attempts and tasks", async () => {
    const session = await buildOk(reviewee);
    const id = String(session["id"]);
    const tasks = session["tasks"] as { id: string; item_id: string }[];
    const r = routes(reviewee);
    await post(r.start, `/sessions/${id}/start`, undefined, undefined, id);
    for (const [i, t] of tasks.slice(0, 2).entries()) {
      const ok = i === 0;
      await sql`insert into public.attempts (user_id, item_id, session_id, session_task_id, client_attempt_id, started_at, submitted_at, response,
                  grade, grade_status, graded_at, active_ms)
        values (${reviewee}, ${t.item_id}, ${id}, ${t.id}, ${randomUUID()}, now() - interval '1 minute', now(), ${sql.json({ kind: "numeric", value: 1 })},
                ${sql.json({ status: "graded", score: ok ? 1 : 0, correct: ok, graders: [] })}, 'graded', now(), 30000)`;
    }
    const key = `bl44-complete-${tag}`;
    const res = await post(r.complete, `/sessions/${id}/complete`, { perceived_difficulty: 3 }, key, id);
    expect(res.status).toBe(200);
    const summary = (await res.json()) as Json;
    const sqlCounts = (
      await sql<{ attempts: number; correct: number; done: number; skipped: number }[]>`
        select (select count(*)::int from public.attempts where session_id = ${id}) as attempts,
               (select count(*)::int from public.attempts where session_id = ${id} and grade ->> 'correct' = 'true') as correct,
               (select count(*)::int from public.session_tasks where session_id = ${id} and status = 'done') as done,
               (select count(*)::int from public.session_tasks where session_id = ${id} and status = 'skipped') as skipped`
    )[0];
    expect(summary).toMatchObject({ session_id: id, status: "completed", attempts: 2, correct: 1, tasks_done: 2, tasks_skipped: tasks.length - 2 });
    expect(summary).toMatchObject({ attempts: sqlCounts?.attempts, correct: sqlCounts?.correct, tasks_done: sqlCounts?.done, tasks_skipped: sqlCounts?.skipped });
    expect(summary["skills_touched"]).toEqual([s1]);
    const row = (await sql<{ ended_at: Date | null; actual_min: number; pd: string }[]>`select ended_at, actual_min, plan ->> 'perceived_difficulty' as pd from public.sessions where id = ${id}`)[0];
    expect(row?.ended_at).not.toBeNull();
    expect(row?.pd).toBe("3");
    const ended = await sql<{ props: Json }[]>`select props from public.events where user_id = ${reviewee} and name = 'session_ended' and props ->> 'session_id' = ${id}`;
    expect(ended).toHaveLength(1);
    expect(ended[0]?.props).toMatchObject({ tasks_done: 2, ended_reason: "completed" });
    // A second complete (new key and same key) returns the stored summary and writes no second event.
    const replay = (await (await post(r.complete, `/sessions/${id}/complete`, {}, undefined, id)).json()) as Json;
    expect(replay).toEqual(summary);
    expect(await sql`select 1 from public.events where user_id = ${reviewee} and name = 'session_ended' and props ->> 'session_id' = ${id}`).toHaveLength(1);
  });

  it("abandon ends the session as abandoned and marks open tasks skipped", async () => {
    const id = String((await buildOk(reviewee))["id"]);
    const out = (await (await post(routes(reviewee).complete, `/sessions/${id}/complete`, { abandon: true }, undefined, id)).json()) as Json;
    expect(out).toMatchObject({ status: "abandoned", tasks_done: 0, attempts: 0 });
    expect(await sql`select 1 from public.session_tasks where session_id = ${id} and status <> 'skipped'`).toHaveLength(0);
    expect((await post(routes(reviewee).complete, `/sessions/${id}/complete`, { abandon: false, surprise: 1 }, undefined, id)).status).toBe(400);
  });

  it("closes an active session past the idle timeout as abandoned at its last activity (06 section 3.3)", async () => {
    const id = String((await buildOk(reviewee))["id"]);
    await post(routes(reviewee).start, `/sessions/${id}/start`, undefined, undefined, id);
    const startedAt = (await sql<{ started_at: Date }[]>`select started_at from public.sessions where id = ${id}`)[0]?.started_at ?? new Date();
    clock = new Date(startedAt.getTime() + 10 * 3_600_000);
    try {
      const got = (await (await get(routes(reviewee).get, `/sessions/${id}`, id)).json()) as Json;
      expect(got["status"]).toBe("abandoned");
      expect(new Date(String(got["ended_at"])).getTime()).toBe(startedAt.getTime());
      const ended = await sql<{ props: Json }[]>`select props from public.events where user_id = ${reviewee} and name = 'session_ended' and props ->> 'session_id' = ${id}`;
      expect(ended[0]?.props).toMatchObject({ ended_reason: "idle_timeout" });
    } finally {
      clock = new Date();
    }
  });

  it("abandons a planned session older than 2 hours when the next build runs", async () => {
    const stale = String((await buildOk(reviewee))["id"]);
    await sql`update public.sessions set created_at = now() - interval '3 hours' where id = ${stale}`;
    const fresh = await buildOk(reviewee);
    expect(fresh["id"]).not.toBe(stale);
    expect((await sql<{ status: string }[]>`select status::text as status from public.sessions where id = ${stale}`)[0]?.status).toBe("abandoned");
    await clearOpen(reviewee);
  });

  it("lists the caller's sessions newest first with a cursor and a status filter", async () => {
    const r = routes(reviewee);
    const page1 = (await (await get(r.list, "/sessions?limit=1")).json()) as { items: Json[]; next_cursor: string | null };
    expect(page1.items).toHaveLength(1);
    expect(page1.next_cursor).not.toBeNull();
    const page2 = (await (await get(r.list, `/sessions?limit=1&cursor=${page1.next_cursor ?? ""}`)).json()) as { items: Json[] };
    expect(page2.items[0]?.["id"]).not.toBe(page1.items[0]?.["id"]);
    const all = (await (await get(r.list, "/sessions?limit=100&status=abandoned")).json()) as { items: Json[] };
    expect(all.items.length).toBeGreaterThanOrEqual(3);
    expect(all.items.every((s) => s["status"] === "abandoned")).toBe(true);
    for (const bad of ["limit=0", "limit=101", "status=weird", "cursor=%%%"]) expect((await get(r.list, `/sessions?${bad}`)).status).toBe(400);
  });
});
