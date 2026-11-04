// BL-0200 acceptance tests for the lessons half of content:sync (00a K9; doc 07 section 15), against a
// throwaway database. One scenario in file order, as in sync.db.test.ts: each step starts from the state the
// one before left. Edited files are copies in a temporary content directory.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONTENT_ROOT } from "../src/config.ts";
import { createTestDb, REQUIRE_DB, runCli, serverReachable, type TestDb } from "./helpers/db.ts";

const reachable = await serverReachable();
if (REQUIRE_DB && !reachable) throw new Error("REQUIRE_DB=1 but no database server is reachable at POLYMATH_TEST_DB_URL");

const OHM = "elec.dc.ohms-law";
const DRAFTED = "math.alg.quadratics";
const REVIEWER = "0000b200-0000-4000-8000-000000000001";

describe.skipIf(!reachable)("content:sync lessons against a throwaway database", () => {
  let db: TestDb;
  let content: string;

  const sync = (...extra: string[]) => runCli(["--content-root", content, "--database-url", db.url, ...extra]);
  const lessonPath = (key: string): string => path.join(content, "lessons", `${key}.yaml`);
  const edit = (key: string, from: string | RegExp, to: string): void => {
    const text = readFileSync(lessonPath(key), "utf8");
    const next = text.replace(from, to);
    if (next === text) throw new Error(`edit of ${key} changed nothing`);
    writeFileSync(lessonPath(key), next);
  };
  const versions = (key: string) =>
    db.sql<{ version: number; status: string; reviewed_by: string | null; retired: boolean }[]>`
      select version, status::text as status, reviewed_by, retired_at is not null as retired
        from public.skill_lessons where skill_key = ${key} order by version`;
  const total = async (): Promise<number> => Number((await db.sql<{ n: string }[]>`select count(*)::text as n from public.skill_lessons`)[0]?.n);

  beforeAll(async () => {
    db = await createTestDb();
    content = mkdtempSync(path.join(tmpdir(), "pm_content_"));
    for (const entry of ["mvp-skill-graph.yaml", "templates", "REVIEW-LOG.md", "prompts", "lessons"]) {
      cpSync(path.join(CONTENT_ROOT, entry), path.join(content, entry), { recursive: true });
    }
    edit(DRAFTED, /^authoring_status: ready$/m, "authoring_status: draft");
  });
  afterAll(async () => {
    rmSync(content, { recursive: true, force: true });
    await db.drop();
  });

  it("AC: a dry run reports the new lesson versions and writes nothing", () => {
    const r = runCli(["--content-root", content, "--database-url", db.url, "--dry-run"]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/lessons\s+created=18 updated=0 unchanged=0 retired=0/);
    expect(r.stdout).toContain(`lesson ${OHM} version 1: new, needs_human_review`);
  });

  it("the first run stores every ready file as needs_human_review, skips the draft and never sets verified", async () => {
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(await total()).toBe(18);
    const statuses = await db.sql<{ status: string; reviewers: string }[]>`
      select status::text as status, count(reviewed_by)::text as reviewers from public.skill_lessons group by status`;
    expect(statuses).toEqual([{ status: "needs_human_review", reviewers: "0" }]);
    expect(await db.sql`select 1 from public.skill_lessons where skill_key = ${DRAFTED}`).toHaveLength(0);
    const row = await db.sql<{ license: string; source: string; hash: string; title: string }[]>`
      select license, source, content_hash as hash, body->'screens'->0->>'title' as title from public.skill_lessons where skill_key = ${OHM}`;
    expect(row[0]?.license).toBe("original");
    expect(row[0]?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row[0]?.title).toBe("Why this matters");
  });

  it("AC: a second real sync is a no-op for lessons", async () => {
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/lessons\s+created=0 updated=0 unchanged=18 retired=0/);
    expect(await total()).toBe(18);
  });

  it("AC: editing a file makes version 2 needs_human_review while version 1 stays verified", async () => {
    await db.sql`insert into auth.users (id, email) values (${REVIEWER}, 'founder@example.test')`;
    await db.sql`update public.skill_lessons set status = 'verified', reviewed_by = ${REVIEWER}, reviewed_at = now() where skill_key = ${OHM}`;
    edit(OHM, "est_seconds: 100", "est_seconds: 110");
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/lessons\s+created=1 updated=0 unchanged=17 retired=0/);
    expect(await versions(OHM)).toEqual([
      { version: 1, status: "verified", reviewed_by: REVIEWER, retired: false },
      { version: 2, status: "needs_human_review", reviewed_by: null, retired: false },
    ]);
  });

  it("a draft file that becomes ready is synced as a new needs_human_review version", async () => {
    edit(DRAFTED, /^authoring_status: draft$/m, "authoring_status: ready");
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect((await versions(DRAFTED)).map((v) => v.status)).toEqual(["needs_human_review"]);
  });

  it("AC: a retired file retires every version of its skill and no other", async () => {
    edit(OHM, /^authoring_status: ready$/m, "authoring_status: retired");
    const r = sync();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/lessons\s+created=0 updated=0 unchanged=18 retired=2/);
    const rows = await versions(OHM);
    expect(rows.map((v) => [v.version, v.status, v.retired])).toEqual([[1, "retired", true], [2, "retired", true]]);
    const others = await db.sql<{ n: string }[]>`select count(*)::text as n from public.skill_lessons where skill_key <> ${OHM} and status = 'retired'`;
    expect(others[0]?.n).toBe("0");
    const again = sync();
    expect(again.stdout).toMatch(/lessons\s+created=0 updated=0 unchanged=18 retired=0/);
  });

  it("AC: a file that fails validation is rejected with its rule named and nothing is written", async () => {
    const before = await total();
    edit("math.alg.solve-linear", /^recap_md: >-$/m, `recap_md: >-\n  ${"word ".repeat(61)}`);
    const r = sync();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("lessons/math.alg.solve-linear.yaml [LG1-WORDS]");
    expect(await total()).toBe(before);
  });
});
