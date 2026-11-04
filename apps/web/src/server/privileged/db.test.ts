// The privileged pool behind a transaction-mode pooler (BL-0044 staging hang; doc 03 ER-3). Integration, local
// database; skipped without one unless REQUIRE_DB=1. The fake pooler (test-pooler.ts) behaves like Supavisor on 6543.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, dbReachable, deleteTestUser, TEST_DB_URL, testSql } from "@/lib/api/test-db";
import { startFakePooler, type FakePooler } from "@/lib/api/test-pooler";
import { connectPrivileged, STATEMENT_TIMEOUT_MS, type Sql } from "./db.ts";

const admin = testSql();
const reachable = await dbReachable(admin);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const within = <T>(p: Promise<T>, ms: number): Promise<T | "timeout"> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve("timeout"), ms);
    p.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e: unknown) => (clearTimeout(timer), reject(e)),
    );
  });

let pooler: FakePooler;
let sql: Sql;

describe.skipIf(!reachable)("privileged pool behind a transaction pooler", () => {
  beforeAll(async () => {
    pooler = await startFakePooler(TEST_DB_URL);
    sql = connectPrivileged(pooler.url);
  });

  afterAll(async () => {
    await sql.end({ timeout: 1 });
    await pooler.close();
    await admin.end();
  });

  it("answers more concurrent queries than connections, parameterless and parameterised mixed (staging hang)", async () => {
    const queries = Array.from({ length: 8 }, (_, i) =>
      i % 2 === 0 ? sql`select count(*)::int as n from public.skills` : sql`select ${i}::int as n`,
    );
    const result = await within(Promise.all(queries), 3000);
    expect(result).not.toBe("timeout");
  });

  it(`runs every transaction with statement and idle-in-transaction timeouts of ${STATEMENT_TIMEOUT_MS} ms, which the pooler does not take from the startup parameters (ER-3)`, async () => {
    const [outside] = await sql<{ st: string }[]>`select current_setting('statement_timeout') as st`;
    expect(outside?.st).toBe("0"); // the fake pooler, like Supavisor, ignores the startup setting
    const inside = await sql.begin(
      (tx) => tx<{ st: string; it: string }[]>`
        select current_setting('statement_timeout') as st, current_setting('idle_in_transaction_session_timeout') as it`,
    );
    expect(inside[0]).toEqual({ st: "5s", it: "5s" });
  });

  it("rolls back when the callback throws, and refuses to report a commit after a statement failed inside", async () => {
    let user = "";
    await expect(
      sql.begin(async (tx) => {
        user = await createTestUser(tx as unknown as Sql);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await admin`select 1 from auth.users where id = ${user}`).toHaveLength(0);

    await expect(
      sql.begin(async (tx) => {
        await tx`select 1 / ${0}::int`.catch(() => null); // the transaction is now aborted; COMMIT would roll back
      }),
    ).rejects.toThrow();
    const leftover = await sql`select ${1}::int as n`; // the connection is usable again
    expect(leftover[0]).toEqual({ n: 1 });
    if (user) await deleteTestUser(admin, user);
  });

  it("runs the statements of one transaction in order on one connection, concurrent ones included", async () => {
    const pids = await sql.begin(async (tx) =>
      Promise.all([tx`select pg_backend_pid() as p`, tx`select pg_backend_pid() as p, ${1}::int`, tx`select pg_backend_pid() as p`]),
    );
    expect(new Set(pids.map((r) => (r[0] as { p: number }).p)).size).toBe(1);
  });
});
