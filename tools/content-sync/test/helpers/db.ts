// Throwaway database per test run, on a database server given by POLYMATH_TEST_DB_URL (default: the
// local Supabase stack). Never connects to a remote host unless POLYMATH_TEST_DB_ALLOW_REMOTE=1, and
// never reads DATABASE_URL_PRIVILEGED. Skipped without a reachable server, except REQUIRE_DB=1
// (the CI database job) where that fails.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "../../../..");
export const CLI = path.resolve(here, "../../src/cli.ts");

export const ADMIN_URL = process.env["POLYMATH_TEST_DB_URL"] ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
export const REQUIRE_DB = process.env["REQUIRE_DB"] === "1";

const LOCAL = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const host = new URL(ADMIN_URL).hostname;
if (!LOCAL.has(host) && process.env["POLYMATH_TEST_DB_ALLOW_REMOTE"] !== "1") {
  throw new Error(`the test database host ${host} is not local; set POLYMATH_TEST_DB_ALLOW_REMOTE=1 to allow it`);
}

export async function serverReachable(): Promise<boolean> {
  const sql = postgres(ADMIN_URL, { max: 1, connect_timeout: 5, onnotice: () => undefined });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

function psqlFile(url: string, file: string): void {
  const run = spawnSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", url, "-f", file], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`psql ${path.basename(file)} failed: ${run.stderr.slice(0, 600)}`);
}

export type TestDb = { url: string; name: string; sql: postgres.Sql; drop: () => Promise<void> };

/** Creates database pm_cs_*, applies the Supabase stub and every migration in order. */
export async function createTestDb(): Promise<TestDb> {
  const name = `pm_cs_${String(process.pid)}_${randomBytes(3).toString("hex")}`;
  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => undefined });
  const work = mkdtempSync(path.join(tmpdir(), "pm_cs_"));
  try {
    const stubRun = spawnSync("python3", [path.join(here, "../fixtures/stub.py")], { encoding: "utf8" });
    if (stubRun.status !== 0) throw new Error(`stub.py failed: ${stubRun.stderr}`);
    const stub = JSON.parse(stubRun.stdout) as { roles: string[]; rest: string };
    for (const stmt of stub.roles) {
      const role = /create role (\w+)/i.exec(stmt)?.[1] ?? "";
      const found = await admin`select 1 from pg_roles where rolname = ${role}`;
      if (found.length === 0) await admin.unsafe(stmt).catch(() => undefined); // another run may have won the race
    }
    await admin.unsafe(`create database ${name}`);
    const url = new URL(ADMIN_URL);
    url.pathname = `/${name}`;
    const stubFile = path.join(work, "stub.sql");
    writeFileSync(stubFile, stub.rest);
    psqlFile(url.toString(), stubFile);
    const dir = path.join(REPO, "supabase", "migrations");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) psqlFile(url.toString(), path.join(dir, f));
    const sql = postgres(url.toString(), { max: 2, onnotice: () => undefined });
    return {
      url: url.toString(),
      name,
      sql,
      drop: async () => {
        await sql.end({ timeout: 2 });
        const a = postgres(ADMIN_URL, { max: 1, onnotice: () => undefined });
        try {
          await a.unsafe(`drop database if exists ${name} with (force)`);
        } finally {
          await a.end({ timeout: 2 });
        }
      },
    };
  } catch (error) {
    await admin.unsafe(`drop database if exists ${name} with (force)`).catch(() => undefined);
    throw error;
  } finally {
    rmSync(work, { recursive: true, force: true });
    await admin.end({ timeout: 2 });
  }
}

export type CliResult = { status: number | null; stdout: string; stderr: string };

/** Runs the CLI as a child process. DATABASE_URL_PRIVILEGED is removed from its environment. */
export function runCli(args: string[], env: Record<string, string> = {}): CliResult {
  const clean = { ...process.env };
  delete clean["DATABASE_URL_PRIVILEGED"];
  const run = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...clean, ...env }, timeout: 100_000 });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}
