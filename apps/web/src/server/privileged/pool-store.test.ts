// BL-0043 acceptance (integration, local database; skipped without one unless REQUIRE_DB=1):
// below the threshold the builder's stock check enqueues a priority-100 pregenerate_items job.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { DEFAULT_POOL_CONFIG, ensurePoolStock, poolConfigFrom } from "./pool-store.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const tag = randomUUID().slice(0, 8);
const moduleName = `bl43${tag}`;
const skillKey = `math.${moduleName}.s1`;
const tplKey = `tpl.math.bl43-${tag}`;
const NOW = new Date("2026-11-04T10:15:00Z");
const config = { target: 4, threshold: 2 };
let user = "";
let seed = 1;

async function addItem(status: string, userId: string | null): Promise<void> {
  await sql`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
    values (${tplKey}, 1, ${seed++}, ${sql.json({ stem_md: "x" })}, ${sql.json({ verifier: "x", agreed: true })}, ${status}, ${userId})`;
}
const jobs = () =>
  sql<{ priority: number; dedupe_key: string; payload: Record<string, unknown> }[]>`
    select priority, dedupe_key, payload from public.jobs where kind = 'pregenerate_items' and user_id = ${user} order by priority desc`;

describe("pool config", () => {
  it("falls back to defaults for invalid values and caps the threshold at the target", () => {
    expect(poolConfigFrom({})).toEqual(DEFAULT_POOL_CONFIG);
    expect(poolConfigFrom({ POOL_STOCK_TARGET: "0" }).target).toBe(DEFAULT_POOL_CONFIG.target);
    expect(poolConfigFrom({ POOL_STOCK_TARGET: "2", POOL_STOCK_THRESHOLD: "9" })).toEqual({ target: 2, threshold: 2 });
  });
});

describe.skipIf(!reachable)("ensurePoolStock (database)", () => {
  beforeAll(async () => {
    user = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0043 test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
      values (${skillKey}, 'math', ${moduleName}, 'BL-0043 test', 'L1', 0, 'CC0-1.0', 'bl0043-test', 'stub')`;
    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source)
      values (${tplKey}, ${skillKey}, 'retrieval', 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0043-test')`;
  });

  afterAll(async () => {
    await sql`delete from public.jobs where user_id = ${user}`;
    await sql`delete from public.items where template_key = ${tplKey}`;
    await sql`delete from public.item_templates where key = ${tplKey}`;
    await sql`delete from public.skills where key = ${skillKey}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await deleteTestUser(sql, user);
    await sql.end();
  });

  it("enqueues one priority-100 job with an id-only payload when stock is under the threshold, once per hour", async () => {
    const first = await ensurePoolStock(sql, user, [skillKey], NOW, config);
    expect(first.enqueued).toBe("shortage");
    expect(first.shortSkills).toEqual([skillKey]);
    const again = await ensurePoolStock(sql, user, [skillKey], NOW, config);
    expect(again.enqueued).toBeNull();
    const rows = await jobs();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.priority).toBe(100);
    expect(rows[0]?.dedupe_key).toBe(`pregen:${user}:2026110410:short`);
    expect(rows[0]?.payload).toEqual({ user_id: user, skill_keys: [skillKey], want: 4 });
    await sql`delete from public.jobs where user_id = ${user}`;
  });

  it("does not count unverified or shared-pool items as stock", async () => {
    await addItem("needs_human_review", user);
    await addItem("draft", user);
    await addItem("verified", null); // shared pool item: not this user's stock
    const check = await ensurePoolStock(sql, user, [skillKey], NOW, config);
    expect(check.stock.get(skillKey)).toBe(0);
    await sql`delete from public.jobs where user_id = ${user}`;
  });

  it("enqueues a priority-10 refill between the threshold and the target, and nothing at the target", async () => {
    await addItem("verified", user);
    await addItem("verified", user); // stock 2 = threshold: not short, below target 4
    const refill = await ensurePoolStock(sql, user, [skillKey], NOW, config);
    expect(refill.enqueued).toBe("refill");
    expect((await jobs())[0]?.priority).toBe(10);
    await sql`delete from public.jobs where user_id = ${user}`;
    await addItem("verified", user);
    await addItem("verified", user);
    const full = await ensurePoolStock(sql, user, [skillKey], NOW, config);
    expect(full.enqueued).toBeNull();
    expect(await jobs()).toHaveLength(0);
  });
});
