// The web app's one privileged Postgres connection (CLAUDE.md rule 2.6; doc 03 section 9.1).
// DATABASE_URL_PRIVILEGED is a server-only secret: it is never logged or put in an error message.
import postgres from "postgres";

export type Sql = postgres.Sql;

let shared: Sql | undefined;

/** Opens a connection. `prepare: false` keeps it usable behind a transaction-mode pooler. */
export function connectPrivileged(url: string): Sql {
  return postgres(url, {
    max: 3,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 20,
    onnotice: () => undefined,
    // ER-3: DB statement timeout 5 s.
    connection: { application_name: "polymath-web", statement_timeout: 5000 },
  });
}

/** Lazy process-wide connection from the environment. */
export function privilegedDb(env: Record<string, string | undefined> = process.env): Sql {
  if (shared) return shared;
  const url = env.DATABASE_URL_PRIVILEGED;
  if (!url) throw new Error("DATABASE_URL_PRIVILEGED must be set");
  shared = connectPrivileged(url);
  return shared;
}
