// The web app's one privileged Postgres connection (CLAUDE.md rule 2.6; doc 03 section 9.1).
// DATABASE_URL_PRIVILEGED is a server-only secret: it is never logged or put in an error message.
import postgres from "postgres";

export type Sql = postgres.Sql;

/** ER-3 (doc 03 section 12): DB statement timeout 5 s. */
export const STATEMENT_TIMEOUT_MS = 5000;

let shared: Sql | undefined;

/**
 * Opens a connection that works behind a transaction-mode pooler (Supavisor on port 6543, as on staging):
 * - `prepare: false`: the pooler does not keep named statements between transactions.
 * - `max_pipeline: 0`: one query in flight per connection. The pooler hands the server connection back at the first
 *   ReadyForQuery, so the reply to a query pipelined behind it is lost and both sides wait forever; this hung every
 *   POST /sessions/build on staging and then every request on the same instance (BL-0044).
 * - transactions run on a reserved connection (see `transaction`), because postgres.js's own `begin` does not work
 *   with `max_pipeline: 0` (its connection hook runs only on a connection that may pipeline).
 * The startup `statement_timeout` holds on a direct connection only; the pooler ignores startup parameters (both
 * `statement_timeout` and `options=-c ...`), so each transaction also sets its timeouts with SET LOCAL semantics.
 */
export function connectPrivileged(url: string): Sql {
  // A named object: postgres.js 3.4.9 reads `max_pipeline` (src/index.js) but its type definitions omit it.
  const options = {
    max: 3,
    prepare: false,
    max_pipeline: 0,
    connect_timeout: 5,
    idle_timeout: 20,
    onnotice: () => undefined,
    connection: { application_name: "polymath-web", statement_timeout: STATEMENT_TIMEOUT_MS },
  };
  const sql = postgres(url, options);
  const begin = (fn: (tx: postgres.TransactionSql) => unknown) => transaction(sql, fn);
  return Object.assign(sql, { begin: begin as unknown as Sql["begin"] });
}

/**
 * BEGIN, the ER-3 timeouts for this transaction only (`set_config(..., true)` is SET LOCAL, so it survives a
 * transaction pooler and never leaks to the next client of the server connection), the callback, COMMIT.
 * Rolls back when the callback throws. A COMMIT that Postgres answers with ROLLBACK (a statement failed and its
 * error was caught) is an error, as in postgres.js's `begin`.
 */
async function transaction(sql: Sql, fn: (tx: postgres.TransactionSql) => unknown): Promise<unknown> {
  const tx = await sql.reserve();
  try {
    await tx`begin`;
    const ms = String(STATEMENT_TIMEOUT_MS);
    await tx`select set_config('statement_timeout', ${ms}, true), set_config('idle_in_transaction_session_timeout', ${ms}, true)`;
    const run = fn(tx as unknown as postgres.TransactionSql);
    const result: unknown = await (Array.isArray(run) ? Promise.all(run) : run);
    const done = await tx`commit`;
    if (done.command !== "COMMIT") throw new Error("the transaction was rolled back");
    return result;
  } catch (error) {
    await tx`rollback`.catch(() => undefined);
    throw error;
  } finally {
    tx.release();
  }
}

/** Lazy process-wide connection from the environment. */
export function privilegedDb(env: Record<string, string | undefined> = process.env): Sql {
  if (shared) return shared;
  const url = env.DATABASE_URL_PRIVILEGED;
  if (!url) throw new Error("DATABASE_URL_PRIVILEGED must be set");
  shared = connectPrivileged(url);
  return shared;
}
