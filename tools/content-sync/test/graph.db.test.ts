// BL-0193 acceptance tests: content:sync carries the corrected graph (G9) into a throwaway database.
// One scenario on one database, in file order (see helpers/db.ts). The graph is a copy in a temporary
// content directory, so edits never touch the repository content.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONTENT_ROOT } from "../src/config.ts";
import { loadContent } from "../src/load.ts";
import { createTestDb, REQUIRE_DB, runCli, serverReachable, type TestDb } from "./helpers/db.ts";

const reachable = await serverReachable();
if (REQUIRE_DB && !reachable) throw new Error("REQUIRE_DB=1 but no database server is reachable at POLYMATH_TEST_DB_URL");

// 00f section 8 item 9: the groups that must share one confusable_set tag (member skills, by key).
const SETS_00F: string[][] = [
  ["elec.dc.kirchhoff-laws", "elec.dc.nodal-analysis", "elec.dc.superposition", "elec.dc.thevenin-norton"],
  ["elec.opamp.inverting", "elec.opamp.noninverting", "elec.opamp.comparator"],
  ["elec.rc.rc-lowpass", "elec.rc.rc-highpass"],
  ["elec.semi.bjt-switch", "elec.semi.mosfet-switch"],
  ["math.calc.derivative-rules", "math.calc.derivative-functions", "math.calc.antiderivatives"],
];

const NEW_KEY = "sw.tools.bl0193-probe";
const NEW_SKILL = `
- key: ${NEW_KEY}
  title: Probe skill for the sync test
  description: A stub added by the sync test.
  node: sw
  module: tools
  status: stub
  tier_target: L1
  est_minutes: 0
  prerequisites:
  - skill: sw.tools.git-basics
    strength: hard
    min_tier: L1
  task_kinds: []
  grader_types: []
  phone_suitable: false
  license: original
  source: original, written by the sync test`;

describe.skipIf(!reachable)("content:sync carries the corrected graph (BL-0193)", () => {
  let db: TestDb;
  let content: string;
  const graphFile = (): string => path.join(content, "mvp-skill-graph.yaml");

  const sync = (...extra: string[]) => runCli(["--content-root", content, "--database-url", db.url, ...extra]);
  const count = async (table: string): Promise<number> => {
    const rows = await db.sql.unsafe<{ n: string }[]>(`select count(*)::text as n from public.${table}`);
    return Number(rows[0]?.n);
  };

  beforeAll(async () => {
    db = await createTestDb();
    content = mkdtempSync(path.join(tmpdir(), "pm_graph_"));
    for (const entry of ["mvp-skill-graph.yaml", "templates", "REVIEW-LOG.md", "prompts"]) {
      cpSync(path.join(CONTENT_ROOT, entry), path.join(content, entry), { recursive: true });
    }
  });
  afterAll(async () => {
    rmSync(content, { recursive: true, force: true });
    await db.drop();
  });

  it("two runs on an empty database: the second prints created=0 updated=0 unchanged=N with N read from validate_graph.py", () => {
    const first = sync();
    expect(first.status, first.stderr).toBe(0);
    const graph = spawnSync("python3", ["-B", path.join(CONTENT_ROOT, "..", "reference", "validate_graph.py")], { encoding: "utf8" });
    const m = /skills: (\d+) real \+ (\d+) stubs; edges: (\d+)/.exec(graph.stdout);
    expect(m, graph.stdout.slice(0, 300)).not.toBeNull();
    const skills = Number(m?.[1]) + Number(m?.[2]);
    const edges = Number(m?.[3]);
    const second = sync();
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toContain(`skills     created=0 updated=0 unchanged=${String(skills)} retired=0`);
    expect(second.stdout).toContain(`edges      created=0 updated=0 unchanged=${String(edges)} retired=0`);
  });

  it("the run records the graph version of the file it loaded", async () => {
    const version = /^graph_version: (\S+)$/m.exec(readFileSync(graphFile(), "utf8"))?.[1];
    expect(version).toBeTruthy();
    const rows = await db.sql<{ v: string | null }[]>`select stats->>'graph_version' as v from public.content_sync_runs order by started_at`;
    expect(rows.map((r) => r.v)).toEqual([version, version]);
  });

  it("at least 8 skills carry a confusable_set and the 00f section 8 item 9 groups share one tag", async () => {
    const tagged = await count("skills where confusable_set is not null");
    expect(tagged).toBeGreaterThanOrEqual(8);
    const rows = await db.sql<{ key: string; confusable_set: string | null }[]>`select key, confusable_set from public.skills`;
    const tag = new Map(rows.map((r) => [r.key, r.confusable_set]));
    for (const group of SETS_00F) {
      const tags = new Set(group.map((k) => tag.get(k)));
      expect(tags.size, group.join(",")).toBe(1);
      expect([...tags][0]).toBeTruthy();
    }
  });

  it("no tag means no interleaving: the database holds a tag exactly where the file has one, and every tag names at least 2 skills", async () => {
    const loaded = loadContent(content);
    const expected = new Map((loaded.graph?.skills ?? []).map(({ doc }) => [String(doc["key"]), typeof doc["confusable_set"] === "string" ? doc["confusable_set"] : null]));
    const rows = await db.sql<{ key: string; confusable_set: string | null }[]>`select key, confusable_set from public.skills`;
    expect(rows.filter((r) => r.confusable_set !== expected.get(r.key))).toEqual([]);
    const sizes = await db.sql<{ n: string }[]>`select count(*)::text as n from public.skills where confusable_set is not null group by confusable_set`;
    expect(sizes.length).toBeGreaterThanOrEqual(8);
    for (const s of sizes) expect(Number(s.n)).toBeGreaterThanOrEqual(2);
  });

  it("a changed module order updates the module row and nothing else", async () => {
    writeFileSync(graphFile(), readFileSync(graphFile(), "utf8").replace(/(- key: math\.alg\n {2}node: math\n {2}module: alg\n {2}order: )\d+/, "$1500"));
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/modules\s+created=0 updated=1 /);
    expect(r.stdout).toMatch(/skills\s+created=0 updated=0 /);
    const row = await db.sql<{ order_index: number }[]>`select order_index from public.modules where key = 'math.alg'`;
    expect(row[0]?.order_index).toBe(500);
  });

  it("a new skill inserts one skill row and its edge; a repeat run is unchanged", async () => {
    const skillsBefore = await count("skills");
    const edgesBefore = await count("skill_edges");
    writeFileSync(graphFile(), readFileSync(graphFile(), "utf8") + NEW_SKILL + "\n");
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/skills\s+created=1 updated=0 /);
    expect(r.stdout).toMatch(/edges\s+created=1 updated=0 /);
    expect(await count("skills")).toBe(skillsBefore + 1);
    expect(await count("skill_edges")).toBe(edgesBefore + 1);
    const again = sync();
    expect(again.stdout).toMatch(/skills\s+created=0 updated=0 /);
  });

  it("removing a skill key that a learner holds skill_state for exits 3 with a clear message and writes nothing", async () => {
    const uid = "00000000-0000-4000-8000-0000000b10c3";
    await db.sql`insert into auth.users (id) values (${uid})`;
    // A trigger on auth.users creates the profile row.
    await db.sql`insert into public.skill_state (user_id, skill_key) values (${uid}, ${NEW_KEY})`;
    writeFileSync(graphFile(), readFileSync(graphFile(), "utf8").replace(NEW_SKILL + "\n", ""));
    const runsBefore = await count("content_sync_runs");
    for (const extra of [[], ["--dry-run"]]) {
      const r = sync(...extra);
      expect(r.status, r.stdout).toBe(3);
      expect(r.stderr).toContain(NEW_KEY);
      expect(r.stderr).toContain("skill_state");
    }
    const row = await db.sql<{ status: string }[]>`select status::text as status from public.skills where key = ${NEW_KEY}`;
    expect(row[0]?.status).toBe("stub");
    expect(await count("content_sync_runs")).toBe(runsBefore);
  });

  it("once no learner holds state for it, the removed key is retired and kept, never dropped", async () => {
    await db.sql`delete from public.skill_state where skill_key = ${NEW_KEY}`;
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/skills\s+created=0 updated=0 unchanged=\d+ retired=1/);
    const row = await db.sql<{ status: string; retired: boolean }[]>`select status::text as status, retired_at is not null as retired from public.skills where key = ${NEW_KEY}`;
    // A stub cannot take status 'retired' (skills_stub_shape); retired_at marks the retirement.
    expect(row).toEqual([{ status: "stub", retired: true }]);
    expect(sync().stdout).toMatch(/skills\s+created=0 updated=0 unchanged=\d+ retired=0/);
  });
});
