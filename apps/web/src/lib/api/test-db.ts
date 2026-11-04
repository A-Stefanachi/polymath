// Test support: a connection to the local database and throwaway users. Used only by *.test.ts.
// POLYMATH_TEST_DB_URL, else the local Supabase stack; a non-local host is refused so a stray
// environment variable can never aim a test at staging (CLAUDE.md rule 2.5).
import { randomUUID } from "node:crypto";
import postgres from "postgres";

export const TEST_DB_URL =
  process.env["POLYMATH_TEST_DB_URL"] ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (!["127.0.0.1", "localhost", "::1"].includes(new URL(TEST_DB_URL).hostname)) {
  throw new Error("API tests refuse a non-local database URL");
}

export function testSql(): postgres.Sql {
  return postgres(TEST_DB_URL, { max: 2, onnotice: () => undefined, connect_timeout: 3 });
}

export async function dbReachable(sql: postgres.Sql): Promise<boolean> {
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  }
}

/** Inserts an auth user (a trigger adds the profile) and returns its id. */
export async function createTestUser(sql: postgres.Sql): Promise<string> {
  const id = randomUUID();
  await sql`insert into auth.users (id, aud, role, email) values (${id}, 'authenticated', 'authenticated', ${`bl0022-${id}@example.invalid`})`;
  return id;
}

/** Removes the user and its rows (profile, idempotency keys cascade; rate limits are explicit). */
export async function deleteTestUser(sql: postgres.Sql, id: string): Promise<void> {
  await sql`delete from app_private.rate_limits where user_id = ${id}`;
  await sql`delete from auth.users where id = ${id}`;
}
