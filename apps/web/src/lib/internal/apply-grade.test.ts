// BL-0196: the worker's apply-grade callback and the getAttempt poll for a queued symbolic grade (doc 03 7.2).
// Integration on the local database (skipped without one unless REQUIRE_DB=1). Fixture rows are namespaced
// bl196<tag> and removed at the end. Time is injected.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import type { ApiContext } from "@/lib/api/route";
import { ERROR_COPY, getAttempt } from "@/lib/attempts/get-attempt";
import { applyGradeCallback, signApplyRequest, type ApplyGradeDeps } from "@/lib/internal/apply-grade";
import { DEFAULT_PARAMS } from "@polymath/scheduler";
import { sharedFsrsPort, type StateDeps } from "@/lib/state/apply-attempt.ts";
import { createAttemptStore } from "@/server/privileged/attempt-store";
import { createStateStore } from "@/server/privileged/state-store";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const SECRET = "local-dummy-internal-secret";
const NOW_S = 1_800_000_000;
const tag = randomUUID().slice(0, 8);
const moduleName = `bl196${tag}`;
const skillKey = `math.${moduleName}.s1`;
const templateKey = `tpl.math.bl196-${tag}`;
const users: string[] = [];
let itemId = "";
let state: StateDeps;
let deps: ApplyGradeDeps;

const signed = (body: string, over: { secret?: string; ts?: number } = {}): Request => {
  const ts = String(over.ts ?? NOW_S);
  return new Request("http://localhost/api/internal/apply-grade", {
    method: "POST",
    body,
    headers: { "x-polymath-timestamp": ts, "x-polymath-signature": signApplyRequest(over.secret ?? SECRET, ts, body) },
  });
};

async function addAttempt(user: string, status: "graded" | "pending" | "error"): Promise<string> {
  const grade =
    status === "graded"
      ? { status, score: 1, correct: true, graders: [], mastery_eligible: true, misconception_tags: [] }
      : null;
  const row = (
    await sql<{ id: string }[]>`
      insert into public.attempts (user_id, item_id, started_at, submitted_at, response, grade, grade_status, graded_at, client_attempt_id)
      values (${user}, ${itemId}, now() - interval '1 min', now(), ${sql.json({ kind: "symbolic", expression: "x" })},
              ${grade ? sql.json(grade) : null}, ${status}, ${status === "pending" ? null : sql`now()`}, ${randomUUID()})
      returning id`
  )[0];
  return row?.id ?? "";
}
const skillRows = async (user: string) => sql<{ n_attempts: number }[]>`select n_attempts from public.skill_state where user_id = ${user}`;
const ctxFor = (user: string, id: string): ApiContext =>
  ({ caller: { userId: user }, params: { attempt_id: id }, request: new Request("http://localhost"), requestId: "r", body: undefined, limit: async () => undefined }) as ApiContext;
const poll = (user: string, id: string) =>
  getAttempt(ctxFor(user, id), { attempts: createAttemptStore(sql), state: async () => state, now: () => new Date(NOW_S * 1000) });

describe.skipIf(!reachable)("apply-grade callback and getAttempt (database)", () => {
  beforeAll(async () => {
    state = { store: createStateStore(sql), fsrs: await sharedFsrsPort(), params: DEFAULT_PARAMS };
    deps = { secret: SECRET, nowS: () => NOW_S, state: async () => state };
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0196 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, 'BL-0196 test', 'L0', 0, 'CC0-1.0', 'bl0196-test', 'stub')`;
    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source)
      values (${templateKey}, ${skillKey}, 'retrieval', 'symbolic_equivalence', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0196-test')`;
    itemId =
      (
        await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, rendered, verification_report, status)
          values (${templateKey}, 1, 1, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified') returning id`
      )[0]?.id ?? "";
  });

  afterAll(async () => {
    for (const t of ["events", "review_log", "attempts", "skill_state", "sessions"]) {
      await sql`delete from ${sql(`public.${t}`)} where user_id in ${sql(users)}`;
    }
    await sql`delete from public.items where id = ${itemId}`;
    await sql`delete from public.item_templates where key = ${templateKey}`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    for (const u of users) await deleteTestUser(sql, u);
    await sql.end();
  });

  const newUser = async () => {
    const u = await createTestUser(sql);
    users.push(u);
    return u;
  };

  it("AC-1: a signed callback applies a graded attempt once; a replay is a no-op", async () => {
    const user = await newUser();
    const body = JSON.stringify({ attempt_id: await addAttempt(user, "graded") });
    const first = await applyGradeCallback(signed(body), deps);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ applied: true });
    expect((await skillRows(user)).map((r) => r.n_attempts)).toEqual([1]);

    const replay = await applyGradeCallback(signed(body), deps);
    expect(await replay.json()).toEqual({ applied: false, reason: "already_applied" });
    expect((await skillRows(user)).map((r) => r.n_attempts)).toEqual([1]);
  });

  it("AC-2: a wrong signature, a stale or future timestamp, a missing secret: 401 and nothing changes", async () => {
    const user = await newUser();
    const body = JSON.stringify({ attempt_id: await addAttempt(user, "graded") });
    const refused = [
      await applyGradeCallback(signed(body, { secret: "some-other-secret" }), deps),
      await applyGradeCallback(signed(body, { ts: NOW_S - 61 }), deps),
      await applyGradeCallback(signed(body, { ts: NOW_S + 61 }), deps),
      await applyGradeCallback(signed(body), { ...deps, secret: undefined }),
      await applyGradeCallback(new Request("http://localhost/x", { method: "POST", body }), deps),
    ];
    expect(refused.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    expect(await skillRows(user)).toEqual([]);
    // The edge of the window is still accepted.
    expect((await applyGradeCallback(signed(body, { ts: NOW_S - 60 }), deps)).status).toBe(200);
  });

  it("a signed body that is not {attempt_id: uuid} is a 400", async () => {
    const res = await applyGradeCallback(signed(JSON.stringify({ attempt_id: "nope", extra: 1 })), deps);
    expect(res.status).toBe(400);
  });

  it("AC-1: getAttempt answers pending with Retry-After, then applies the graded attempt once for its owner", async () => {
    const user = await newUser();
    const pending = await poll(user, await addAttempt(user, "pending"));
    expect(pending.status).toBe(200);
    expect(pending.headers.get("Retry-After")).toBe("1");
    expect(await pending.json()).toMatchObject({ grade_status: "pending", grade: null });

    const id = await addAttempt(user, "graded");
    const graded = await (await poll(user, id)).json();
    expect(graded).toMatchObject({ grade_status: "graded", grade: { correct: true }, skill_update: { skill_key: skillKey } });
    await poll(user, id);
    expect((await skillRows(user)).map((r) => r.n_attempts)).toEqual([1]);
  });

  it("AC-4: an errored attempt shows calm copy and counts for nothing", async () => {
    const user = await newUser();
    const res = await (await poll(user, await addAttempt(user, "error"))).json();
    expect(res).toMatchObject({ grade_status: "error", grade: null, error: ERROR_COPY });
    expect(await skillRows(user)).toEqual([]);
  });

  it("getAttempt of another user's attempt, or a malformed id, is a 404", async () => {
    const owner = await newUser();
    const other = await newUser();
    const id = await addAttempt(owner, "pending");
    await expect(poll(other, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(poll(owner, "not-a-uuid")).rejects.toMatchObject({ code: "not_found" });
  });
});
