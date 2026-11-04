// BL-0048 acceptance (integration, local database; skipped without one unless REQUIRE_DB=1):
// listSkills, getSkill, getGraph, getFrontier, getReviewQueue through defineRoute.
// AC-1 response shapes carry the contract's required fields and no secret columns; AC-2 locked skills
// carry their unmet prerequisite keys (FR-013); AC-3 the review queue is ordered by due, then lowest
// retrievability; AC-4 a stub skill is never in the frontier (BL-0049); AC-5 only the caller's own state
// is read and invalid queries are rejected (ST-API-01).
import { randomUUID } from "node:crypto";
import { createFsrsAdapter, DEFAULT_PARAMS } from "@polymath/scheduler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createGraphStore } from "@/server/privileged/graph-store";
import { frontierView, getFrontier, getGraph, getReviewQueue, getSkill, listSkills, type GraphDeps } from "./graph.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;

const now = new Date();
const at = (hours: number): Date => new Date(now.getTime() + hours * 3_600_000);
const deps: GraphDeps = {
  store: createGraphStore(sql),
  fsrs: () => createFsrsAdapter(),
  params: DEFAULT_PARAMS,
  now: () => now,
};
const apiDeps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => {
    throw new Error("read routes take no idempotency store");
  },
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
type Handler = (req: Request, c?: { params: Promise<Record<string, string>> }) => Promise<Response>;
const routes = (u: string) => ({
  list: defineRoute("listSkills", (c) => listSkills(c, deps), apiDeps(u)) as Handler,
  skill: defineRoute("getSkill", (c) => getSkill(c, deps), apiDeps(u)) as Handler,
  graph: defineRoute("getGraph", (c) => getGraph(c, deps), apiDeps(u)) as Handler,
  frontier: defineRoute("getFrontier", (c) => getFrontier(c, deps), apiDeps(u)) as Handler,
  queue: defineRoute("getReviewQueue", (c) => getReviewQueue(c, deps), apiDeps(u)) as Handler,
});
const call = (h: Handler, path: string, params: Record<string, string> = {}) =>
  h(new Request(`http://localhost/api/v1${path}`), { params: Promise.resolve(params) });

// Parsed JSON responses are probed field by field (JSON.parse's own return type).
type Json = ReturnType<typeof JSON.parse>;

const tag = randomUUID().slice(0, 8).replaceAll(/[^a-f0-9]/g, "a");
const mod = `bl48${tag}`;
const key = (n: string) => `math.${mod}.${n}`;
const [A, B, C, D, E, F, G, S] = ["a", "b", "c", "d", "e", "f", "g", "stub"].map(key) as [string, string, string, string, string, string, string, string];
const ALL = [A, B, C, D, E, F, G, S];
let learner = "";
let other = "";

async function json(res: Response): Promise<Json> {
  expect(res.status).toBe(200);
  return (await res.json()) as Json;
}

describe.skipIf(!reachable)("graph read API (database)", () => {
  beforeAll(async () => {
    [learner, other] = [await createTestUser(sql), await createTestUser(sql)];
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${mod}`}, 'math', ${mod}, 'BL-0048 test', 0)`;
    for (const k of ALL) {
      const stub = k === S;
      await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
        values (${k}, 'math', ${mod}, 'BL-0048 test', 'L1', ${stub ? 0 : 10}, 'CC0-1.0', 'bl0048-test', ${stub ? "stub" : "draft"},
                ${sql.array(stub ? [] : ["worked_example", "retrieval"])}::public.task_kind[],
                ${sql.array(stub ? [] : ["exact_numeric"])}::public.grader_type[], false)`;
    }
    // A (mastered) -> B (hard) -> C (hard); A -> S (hard, a stub that must never be offered).
    for (const [from, to] of [[A, B], [B, C], [A, S]] as const) {
      await sql`insert into public.skill_edges (from_skill_key, to_skill_key, strength, min_tier) values (${from}, ${to}, 'hard', 'L0')`;
    }
    const state = (user: string, skill: string, ms: string, due: Date, stability: number, tier: string | null) =>
      sql`insert into public.skill_state (user_id, skill_key, mastery_state, due, last_review, stability, difficulty, reps, fsrs_state, tier_attained, first_seen_at)
        values (${user}, ${skill}, ${ms}, ${due}, ${at(-48)}, ${stability}, 5, 4, 2, ${tier}, ${at(-720)})`;
    await state(learner, A, "mastered", at(72), 30, "L1");
    await state(learner, D, "learning", at(-1), 3, null);
    await state(learner, E, "reviewing", at(-30), 1, "L0"); // overdue the most
    await state(learner, F, "reviewing", at(-2), 40, "L0"); // same due as G, stronger memory
    await state(learner, G, "reviewing", at(-2), 2, "L0"); // same due as F, weaker memory
    await state(other, B, "mastered", at(10), 30, "L1");
  });

  afterAll(async () => {
    await sql`delete from public.skill_state where skill_key in ${sql(ALL)}`;
    await sql`delete from public.skill_edges where from_skill_key in ${sql(ALL)}`;
    await sql`delete from public.skills where key in ${sql(ALL)}`;
    await sql`delete from public.modules where key = ${`math.${mod}`}`;
    for (const u of [learner, other]) await deleteTestUser(sql, u);
    await sql.end();
  });

  it("AC-1: listSkills pages by key, filters, merges only the caller's state and exposes no secret columns", async () => {
    const r = routes(learner);
    const page1 = await json(await call(r.list, `/skills?module=${mod}&limit=3`));
    expect(page1["items"].map((s: Json) => s["key"])).toEqual([A, B, C]);
    expect(typeof page1["next_cursor"]).toBe("string");
    const page2 = await json(await call(r.list, `/skills?module=${mod}&limit=3&cursor=${page1["next_cursor"]}`));
    expect(page2["items"].map((s: Json) => s["key"])).toEqual([D, E, F]);
    const rest = await json(await call(r.list, `/skills?module=${mod}&limit=3&cursor=${page2["next_cursor"]}`));
    expect(rest["items"].map((s: Json) => s["key"])).toEqual([G, S]);
    expect(rest["next_cursor"]).toBeNull();
    for (const s of page1["items"]) {
      for (const f of ["key", "node", "module", "title", "tier_target", "est_minutes", "status"]) expect(s).toHaveProperty(f);
    }
    expect(page1["items"][0].state).toMatchObject({ mastery_state: "mastered", tier_attained: "L1", reps: 4 });
    expect(page1["items"][1].state).toEqual({ mastery_state: "unseen" });
    const text = JSON.stringify(page1);
    for (const secret of ["answer_key", "verification_report", "params", "body", "item_secrets"]) expect(text).not.toContain(secret);
    const filtered = await json(await call(r.list, `/skills?module=${mod}&mastery_state=reviewing`));
    expect(filtered["items"].map((s: Json) => s["key"])).toEqual([E, F, G]);
    // Another learner's state is not visible: for `other`, A is unseen and B is mastered.
    const theirs = await json(await call(routes(other).list, `/skills?module=${mod}&node=math&limit=2`));
    expect(theirs["items"].map((s: Json) => [s["key"], s["state"]["mastery_state"]])).toEqual([[A, "unseen"], [B, "mastered"]]);
  });

  it("AC-5: bad queries are rejected with 400 (limit 100 is accepted, 101 and 0 are not)", async () => {
    const r = routes(learner);
    expect((await call(r.list, "/skills?limit=100")).status).toBe(200);
    for (const bad of ["limit=101", "limit=0", "limit=abc", "node=nope", "mastery_state=done", "cursor=%%%", "extra=1", `module=${"A B"}`]) {
      const res = await call(r.list, `/skills?${bad}`);
      expect(res.status, bad).toBe(400);
    }
    expect((await call(r.queue, "/review-queue?horizon_h=168")).status).toBe(200);
    for (const bad of ["horizon_h=169", "horizon_h=-1", "horizon_h=x", "nope=1"]) expect((await call(r.queue, `/review-queue?${bad}`)).status, bad).toBe(400);
    expect((await call(r.queue, "/review-queue?horizon_h=0")).status).toBe(200);
    expect((await call(r.graph, "/graph?nodes=math,bogus")).status).toBe(400);
    expect((await call(r.graph, "/graph?include_stubs=yes")).status).toBe(400);
    expect((await call(r.frontier, "/frontier?x=1")).status).toBe(400);
  });

  it("AC-2: getSkill carries prerequisites, dependants and the unmet prerequisite keys; unknown keys are 404", async () => {
    const r = routes(learner);
    const c = await json(await call(r.skill, `/skills/${C}`, { skill_key: C }));
    expect(c).toMatchObject({ key: C, available: false, blocked_by: [B] });
    expect(c["prerequisites"]).toEqual([{ from_skill_key: B, to_skill_key: C, strength: "hard", min_tier: "L0" }]);
    const b = await json(await call(r.skill, `/skills/${B}`, { skill_key: B }));
    expect(b).toMatchObject({ available: true, blocked_by: [] });
    expect(b["dependants"].map((e: Json) => e["to_skill_key"])).toEqual([C]);
    const s = await json(await call(r.skill, `/skills/${S}`, { skill_key: S }));
    expect(s["available"]).toBe(false);
    for (const missing of [`math.${mod}.zzz`, "Not_A_Key"]) {
      expect((await call(r.skill, `/skills/${missing}`, { skill_key: missing })).status).toBe(404);
    }
  });

  it("AC-1: getGraph returns nodes and edges, omits stubs by default and filters by node", async () => {
    const r = routes(learner);
    const g = await json(await call(r.graph, "/graph?nodes=math"));
    const keys = g["nodes"].map((n: Json) => n["key"]);
    expect(keys).toEqual(expect.arrayContaining([A, B, C]));
    expect(keys).not.toContain(S);
    expect(g["edges"].some((e: Json) => e["to_skill_key"] === S)).toBe(false);
    expect(g["edges"].some((e: Json) => e["from_skill_key"] === A && e["to_skill_key"] === B)).toBe(true);
    const withStubs = await json(await call(r.graph, "/graph?nodes=math&include_stubs=true"));
    expect(withStubs["nodes"].map((n: Json) => n["key"])).toContain(S);
    expect(withStubs["edges"].some((e: Json) => e["to_skill_key"] === S)).toBe(true);
    const none = await json(await call(r.graph, "/graph?nodes=elec"));
    expect(none["nodes"].every((n: Json) => n["node"] === "elec")).toBe(true);
  });

  it("AC-2: getFrontier offers B (A mastered), lists D in progress, keeps C locked and S out; locked data names B", async () => {
    const f = await json(await call(routes(learner).frontier, "/frontier"));
    const offered = f["available"].map((a: Json) => a["skill_key"]);
    expect(offered).toContain(B);
    expect(offered).not.toContain(C);
    expect(offered).not.toContain(S);
    expect(offered).not.toContain(D);
    expect(f["in_progress"]).toContain(D);
    expect(f["available"].find((a: Json) => a["skill_key"] === B).reason).toBe("all 1 hard prerequisite satisfied");
    expect(f).not.toHaveProperty("locked");
    const view = await frontierView(deps, learner);
    expect(view.locked).toContainEqual({ skill_key: C, blocked_by: [B] });
    expect(view.locked.map((l) => l.skill_key)).not.toContain(S);
  });

  it("AC-4: no stub skill is returned by getFrontier on synced content (BL-0049)", async () => {
    const fresh = await createTestUser(sql);
    try {
      const f = await json(await call(routes(fresh).frontier, "/frontier"));
      const stubs = new Set((await sql<{ key: string }[]>`select key from public.skills where status = 'stub'`).map((s) => s.key));
      expect(stubs.has(S)).toBe(true);
      const offered = [...f["available"].map((a: Json) => a["skill_key"]), ...f["in_progress"]];
      expect(offered.length).toBeGreaterThan(0);
      expect(offered.filter((k: string) => stubs.has(k))).toEqual([]);
    } finally {
      await deleteTestUser(sql, fresh);
    }
  });

  it("AC-3: getReviewQueue orders by due, then lowest retrievability, and counts due now and within the horizon", async () => {
    const q = await json(await call(routes(learner).queue, "/review-queue"));
    expect(q["now"]).toBe(now.toISOString());
    expect(q["items"].map((i: Json) => i["skill_key"])).toEqual([E, G, F, D]);
    expect(q["items"].every((i: Json) => typeof i["retrievability"] === "number")).toBe(true);
    const rs = q["items"].map((i: Json) => i["retrievability"]);
    expect(rs[1]).toBeLessThan(rs[2]); // same due: the weaker memory (G) first
    expect(q["due_now"]).toBe(4);
    expect(q["due_within_horizon"]).toBe(4);
    expect(q["estimated_minutes"]).toBe(8);
    // A is due in 72 h: out of the 24 h horizon, in the 168 h one, and not yet due now.
    const wide = await json(await call(routes(learner).queue, "/review-queue?horizon_h=168"));
    expect(wide["items"].map((i: Json) => i["skill_key"])).toContain(A);
    expect(wide["due_now"]).toBe(4);
    expect(wide["due_within_horizon"]).toBe(5);
    const none = await json(await call(routes(other).queue, "/review-queue?horizon_h=0"));
    expect(none["items"].map((i: Json) => i["skill_key"])).not.toContain(E);
  });
});
