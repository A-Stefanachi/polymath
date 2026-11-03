// BL-0013 acceptance 2: the key regexes equal the check constraints on the key columns of the
// migrated database (read from pg_constraint). Needs a database: POLYMATH_TEST_DB_URL, else the
// local Supabase stack. Skipped when none is reachable, except with REQUIRE_DB=1 (the CI database
// job sets it), where an unreachable database fails the test.
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { MODULE_KEY, PROJECT_KEY, SKILL_KEY, STEP_KEY, TEMPLATE_KEY } from "./keys.ts";

const DB_URL = process.env["POLYMATH_TEST_DB_URL"] ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const REQUIRE_DB = process.env["REQUIRE_DB"] === "1";

function psql(sql: string): { ok: boolean; out: string } {
  const run = spawnSync("psql", ["-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql, DB_URL], {
    encoding: "utf8",
    timeout: 15_000,
  });
  return { ok: run.status === 0, out: run.stdout.trim() };
}

const reachable = psql("select 1").ok;
if (REQUIRE_DB && !reachable) throw new Error(`REQUIRE_DB=1 but no database at the configured URL`);

// The key column's regex check of each table, from the catalogue.
function dbKeyPattern(table: string): string | undefined {
  const { out } = psql(
    `select pg_get_constraintdef(c.oid) from pg_constraint c
       join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = '${table}' and c.contype = 'c'
        and pg_get_constraintdef(c.oid) like '%key ~ %'`,
  );
  const m = /key ~ '(.*)'::text/.exec(out);
  return m?.[1];
}

describe.skipIf(!reachable)("key regexes equal the database check constraints", () => {
  it.each([
    ["skills", SKILL_KEY],
    ["modules", MODULE_KEY],
    ["item_templates", TEMPLATE_KEY],
    ["projects", PROJECT_KEY],
    ["project_steps", STEP_KEY],
  ] as const)("acceptance 2: %s.key", (table, re) => {
    expect(dbKeyPattern(table)).toBe(re.source);
  });
});
