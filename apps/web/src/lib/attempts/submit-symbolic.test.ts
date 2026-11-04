// BL-0054: submitAttempt for symbolic_equivalence items against the local database, with a fake worker client.
// 200 with the worker's grade; 202 pending plus a grade_attempt job when the worker cannot answer (doc 03 section 7.2).
// Skipped without a database unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createAttemptStore } from "@/server/privileged/attempt-store";
import { createServeStore } from "@/server/privileged/item-store";
import { submitAttempt } from "./submit.ts";
import type { SymbolicGrader, SymbolicRequest, SymbolicWorkerGrade } from "./symbolic-client.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;

const tag = randomUUID().slice(0, 8);
const moduleName = `bl54${tag}`;
const skillKey = `math.${moduleName}.s1`;
const templateKey = `tpl.math.bl54-${tag}`;
const REFERENCE = "7*x**3 + 1234"; // distinctive: must never appear in a response

const symbolicKey = {
  grader_type: "symbolic_equivalence",
  answer_spec: { variables: ["x"], sample_domain: { x: [0.3, 2.5] }, forbid_functions: ["diff"], reference: "d" },
  reference: REFERENCE,
};

let worker: SymbolicGrader = async () => null;
const seen: SymbolicRequest[] = [];
const stores = {
  serve: createServeStore(sql),
  attempts: createAttemptStore(sql),
  symbolic: (async (req) => {
    seen.push(req);
    return worker(req);
  }) as SymbolicGrader,
};
const deps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => ({ claim: async () => ({ kind: "new" as const }), complete: async () => undefined, release: async () => undefined }),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
const post = (userId: string, body: unknown) =>
  defineRoute("submitAttempt", (ctx) => submitAttempt(ctx, stores), deps(userId))(
    new Request("http://localhost/api/v1/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  );

const graded = (over: Partial<SymbolicWorkerGrade> = {}): SymbolicWorkerGrade => ({
  status: "graded",
  score: 1,
  correct: true,
  graders: [{ type: "symbolic_equivalence", score: 1, detail: { method: "symbolic", reference_echo: REFERENCE } }],
  feedback: "Correct.",
  misconception_tags: [],
  ...over,
});

let learner = "";
let itemId = "";
const body = (expression: string, clientId = randomUUID()) => ({
  client_attempt_id: clientId,
  item_id: itemId,
  started_at: "2026-11-01T07:31:00Z",
  submitted_at: "2026-11-01T07:31:42Z",
  response: { kind: "symbolic", expression },
});

describe.skipIf(!reachable)("submitAttempt symbolic (database)", () => {
  beforeAll(async () => {
    learner = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0054 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, 'BL-0054 test', 'L1', 0, 'CC0-1.0', 'bl0054-test', 'stub')`;
    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, pool)
      values (${templateKey}, ${skillKey}, 'retrieval', 'symbolic_equivalence', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0054-test', 'practice')`;
    const row = (
      await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, params, rendered, verification_report, status)
        values (${templateKey}, 1, 1, ${sql.json({})}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified') returning id`
    )[0];
    itemId = row?.id ?? "";
    await sql`insert into public.item_secrets (item_id, answer_key) values (${itemId}, ${sql.json(symbolicKey)})`;
  });

  afterAll(async () => {
    await sql`delete from public.jobs where user_id = ${learner}`;
    await sql`delete from public.events where user_id = ${learner}`;
    await sql`delete from public.attempts where user_id = ${learner}`;
    await sql`delete from public.items where id = ${itemId}`;
    await sql`delete from public.item_templates where key = ${templateKey}`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await deleteTestUser(sql, learner);
    await sql.end();
  });

  it("sends the answer key to the worker and returns its grade without the reference (FR-062)", async () => {
    worker = async () => graded();
    const res = await post(learner, body("1234 + 7x^3"));
    expect(res.status).toBe(200);
    const text = await res.text();
    const out = JSON.parse(text) as { grade_status: string; grade: { status: string; score: number; correct: boolean; graders: { detail: object }[] } };
    expect(out).toMatchObject({ grade_status: "graded", grade: { status: "graded", score: 1, correct: true } });
    expect(out.grade.graders[0]?.detail).toEqual({ method: "symbolic" });
    expect(text).not.toContain("1234");
    expect(seen.at(-1)).toMatchObject({ responseText: "1234 + 7x^3", reference: REFERENCE, spec: { variables: ["x"] } });
  });

  it("stores invalid_input with null score and correct, as 00a D2 says", async () => {
    worker = async () => graded({ status: "invalid_input", score: 0, correct: false, feedback: "Could not read your expression." });
    const res = await post(learner, body("__import__('os')"));
    expect(res.status).toBe(200);
    const out = (await res.json()) as { grade_status: string; grade: { score: null; correct: null; status: string } };
    expect(out.grade_status).toBe("invalid_input");
    expect(out.grade).toMatchObject({ status: "invalid_input", score: null, correct: null });
  });

  it("stores the attempt pending and enqueues one id-only grade_attempt job when the worker cannot answer (202)", async () => {
    worker = async () => null;
    const clientId = randomUUID();
    const res = await post(learner, body("7x^3 + 1234", clientId));
    expect(res.status).toBe(202);
    const out = (await res.json()) as { id: string; grade_status: string; grade: null };
    expect(out).toMatchObject({ grade_status: "pending", grade: null });
    expect(res.headers.get("Location")).toBe(`/api/v1/attempts/${out.id}`);
    expect(res.headers.get("Retry-After")).toBe("1");
    const jobs = await sql<{ payload: unknown; user_id: string }[]>`select payload, user_id from public.jobs where kind = 'grade_attempt' and dedupe_key = ${`grade:${out.id}`}`;
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.payload).toEqual({ attempt_id: out.id });
    expect(jobs[0]?.user_id).toBe(learner);

    // A replay returns the same pending attempt, creates no second job and does not ask the worker again.
    const before = seen.length;
    const again = await post(learner, body("something else", clientId));
    expect(again.status).toBe(202);
    expect(((await again.json()) as { id: string }).id).toBe(out.id);
    expect(seen.length).toBe(before);
    const n = await sql`select count(*)::int as n from public.jobs where kind = 'grade_attempt' and user_id = ${learner}`;
    expect(n[0]?.["n"]).toBe(1);
  });

  it("rejects a response of the wrong kind without storing an attempt", async () => {
    const clientId = randomUUID();
    const res = await post(learner, { ...body("x"), client_attempt_id: clientId, response: { kind: "numeric", value: 1 } });
    expect(res.status).toBe(400);
    const n = await sql`select count(*)::int as n from public.attempts where client_attempt_id = ${clientId}`;
    expect(n[0]?.["n"]).toBe(0);
  });
});
