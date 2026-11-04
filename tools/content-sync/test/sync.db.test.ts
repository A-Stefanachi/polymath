// BL-0018 acceptance tests against a throwaway database (see helpers/db.ts). The tests are one
// scenario on one database, in file order: each step starts from the state the one before left,
// because "the second run changes nothing" and "an edit changes one row" are statements about runs
// in sequence. Edited and deleted templates are copies in a temporary content directory.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONTENT_ROOT } from "../src/config.ts";
import { createTestDb, REQUIRE_DB, runCli, serverReachable, type TestDb } from "./helpers/db.ts";

const reachable = await serverReachable();
if (REQUIRE_DB && !reachable) throw new Error("REQUIRE_DB=1 but no database server is reachable at POLYMATH_TEST_DB_URL");

const TEMPLATE = "tpl.math.units-kilo";
const OTHER = "tpl.math.units-mega";

describe.skipIf(!reachable)("content:sync against a throwaway database", () => {
  let db: TestDb;
  let content: string;

  const sync = (...extra: string[]) => runCli(["--content-root", content, "--database-url", db.url, ...extra]);
  const count = async (table: string): Promise<number> => {
    const rows = await db.sql.unsafe<{ n: string }[]>(`select count(*)::text as n from public.${table}`);
    return Number(rows[0]?.n);
  };
  const templatePath = (key: string): string => path.join(content, "templates", key.split(".")[1] ?? "", `${key}.yaml`);

  beforeAll(async () => {
    db = await createTestDb();
    content = mkdtempSync(path.join(tmpdir(), "pm_content_"));
    for (const entry of ["mvp-skill-graph.yaml", "templates", "REVIEW-LOG.md", "prompts"]) {
      cpSync(path.join(CONTENT_ROOT, entry), path.join(content, entry), { recursive: true });
    }
  });
  afterAll(async () => {
    rmSync(content, { recursive: true, force: true });
    await db.drop();
  });

  it("a dry run on an empty database reports what it would create and writes nothing", async () => {
    const r = sync("--dry-run");
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/templates\s+created=30 updated=0 unchanged=0/);
    expect(r.stdout).toContain("would enqueue 1 content_postprocess job");
    expect([await count("skills"), await count("item_templates"), await count("content_sync_runs"), await count("jobs")]).toEqual([0, 0, 0, 0]);
  });

  it("the first run loads the graph: skills equal the count printed by validate_graph.py, edges equal its edge count", async () => {
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    const graph = spawnSync("python3", ["-B", path.join(CONTENT_ROOT, "..", "reference", "validate_graph.py")], { encoding: "utf8" });
    const m = /skills: (\d+) real \+ (\d+) stubs; edges: (\d+)/.exec(graph.stdout);
    expect(m, graph.stdout.slice(0, 300)).not.toBeNull();
    expect(await count("skills")).toBe(Number(m?.[1]) + Number(m?.[2]));
    expect(await count("skill_edges")).toBe(Number(m?.[3]));
    expect(await count("item_templates")).toBe(30);
  });

  it("BL-0049 AC: stub skills are loaded but carry nothing schedulable, and no real skill depends on one", async () => {
    // getFrontier does not exist yet (packages/scheduler is empty); this asserts the data facts it relies on:
    // every stub has est_minutes 0 and no task kinds or graders, and no hard or soft edge leads from a stub
    // to a real skill, so no stub can open or be offered by a frontier built from non-stub skills.
    const stubs = await db.sql<{ n: string; schedulable: string }[]>`
      select count(*)::text as n,
             count(*) filter (where est_minutes <> 0 or task_kinds <> '{}' or grader_types <> '{}' or phone_suitable)::text as schedulable
      from public.skills where status = 'stub'`;
    expect(Number(stubs[0]?.n)).toBeGreaterThan(0);
    expect(stubs[0]?.schedulable).toBe("0");
    const leaks = await db.sql<{ n: string }[]>`
      select count(*)::text as n from public.skill_edges e
      join public.skills f on f.key = e.from_skill_key join public.skills t on t.key = e.to_skill_key
      where f.status = 'stub' and t.status <> 'stub'`;
    expect(leaks[0]?.n).toBe("0");
  });

  it("BL-0049 AC: module elec.opamp has no project step and the project validator passes (00a E2 exemption)", () => {
    const r = spawnSync("python3", ["-B", path.join(CONTENT_ROOT, "..", "reference", "validate_projects.py"), "--quiet"], { encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const ladder = readFileSync(path.join(CONTENT_ROOT, "project-ladder.yaml"), "utf8");
    expect(ladder).not.toMatch(/elec\.opamp\./);
  });

  it("the first run enqueues one content_postprocess job with an id-only payload and records the run", async () => {
    const jobs = await db.sql<{ kind: string; payload: Record<string, unknown>; status: string }[]>`select kind, payload, status::text as status from public.jobs`;
    const runs = await db.sql<{ id: string; status: string; git_sha: string; stats: { templates: { added: number } } }[]>`
      select id, status::text as status, git_sha, stats from public.content_sync_runs`;
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("succeeded");
    expect(runs[0]?.stats.templates.added).toBe(30);
    expect(jobs).toEqual([{ kind: "content_postprocess", payload: { sync_run_id: runs[0]?.id }, status: "queued" }]);
    // No template is verified by the sync alone (no fuzz result, no G3 sign-off yet).
    const statuses = await db.sql<{ status: string }[]>`select distinct status::text as status from public.item_templates`;
    expect(statuses).toEqual([{ status: "needs_human_review" }]);
  });

  it("AC: a second run on the same database prints created=0 updated=0 unchanged=30 and enqueues nothing", async () => {
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/templates\s+created=0 updated=0 unchanged=30 retired=0/);
    expect(r.stdout).toMatch(/skills\s+created=0 updated=0 unchanged=393 retired=0/);
    expect(await count("jobs")).toBe(1);
    expect(await count("content_sync_runs")).toBe(2);
  });

  it("AC: editing one template changes only that row and enqueues one content_postprocess job", async () => {
    const before = await db.sql<{ key: string; content_hash: string }[]>`select key, content_hash from public.item_templates order by key`;
    const file = templatePath(TEMPLATE);
    writeFileSync(file, readFileSync(file, "utf8").replace("title: Kilo-ohms to ohms", "title: Kilo-ohms to ohms, edited"));
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/templates\s+created=0 updated=1 unchanged=29 retired=0/);
    const after = await db.sql<{ key: string; content_hash: string }[]>`select key, content_hash from public.item_templates order by key`;
    const changed = after.filter((row, i) => row.content_hash !== before[i]?.content_hash).map((row) => row.key);
    expect(changed).toEqual([TEMPLATE]);
    const jobs = await db.sql<{ id: string }[]>`select id from public.jobs where kind = 'content_postprocess' order by created_at`;
    expect(jobs).toHaveLength(2);
    const row = await db.sql<{ job: string; title: string }[]>`
      select body->'_sync'->>'fuzz_job_id' as job, body->>'title' as title from public.item_templates where key = ${TEMPLATE}`;
    expect(row[0]).toEqual({ job: jobs[1]?.id, title: "Kilo-ohms to ohms, edited" });
  });

  it("AC: deleting a template file marks the row retired and keeps it, with no verification job", async () => {
    unlinkSync(templatePath(OTHER));
    const jobsBefore = await count("jobs");
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/templates\s+created=0 updated=0 unchanged=29 retired=1/);
    const row = await db.sql<{ status: string; retired: boolean; reason: string }[]>`
      select status::text as status, retired_at is not null as retired, retired_reason as reason from public.item_templates where key = ${OTHER}`;
    expect(row).toEqual([{ status: "retired", retired: true, reason: "content file removed" }]);
    expect(await count("item_templates")).toBe(30);
    expect(await count("jobs")).toBe(jobsBefore);
  });

  it("AC: a template without the license field exits 1 and writes nothing", async () => {
    const file = templatePath("tpl.math.ratios-split");
    writeFileSync(file, readFileSync(file, "utf8").replace(/^license: .*\n/m, ""));
    // The same run would also have changed another template; none of it may be written.
    const other = templatePath("tpl.math.linear-slope");
    writeFileSync(other, readFileSync(other, "utf8").replace(/^title: .*$/m, "title: changed in the same run"));
    const state = async () => [await count("item_templates"), await count("jobs"), await count("content_sync_runs")];
    const before = await state();
    const hashBefore = await db.sql`select key, content_hash from public.item_templates order by key`;
    const r = sync();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("tpl.math.ratios-split.yaml");
    expect(r.stderr).toContain("license");
    expect(await state()).toEqual(before);
    expect(await db.sql`select key, content_hash from public.item_templates order by key`).toEqual(hashBefore);
  });
});
