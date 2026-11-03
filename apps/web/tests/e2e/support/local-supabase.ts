import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export type LocalSupabase = {
  url: string;
  publishableKey: string;
  /** Local development secret key; used only by tests to delete the users they created. */
  secretKey: string;
  mailpitUrl: string;
  /** Local Postgres, used only to age a one-time token (the real 15 minutes are not waited out). */
  dbUrl: string;
};

const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");

/**
 * Reads the running local stack from `supabase status` (the CLI's fixed development keys, never
 * committed). Refuses a URL that is not this machine unless E2E_ALLOW_NON_LOCAL=1, so a stray
 * environment variable can never aim the suite at staging (CLAUDE.md rule 2.5).
 * E2E_SUPABASE_URL overrides the API URL, for a gateway in front of the local stack.
 */
export function localSupabase(env: Record<string, string | undefined> = process.env): LocalSupabase {
  const raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    // The privileged staging URL must not leak into the CLI call either.
    env: { ...process.env, DATABASE_URL_PRIVILEGED: "" },
  });
  const status = JSON.parse(raw.slice(raw.indexOf("{"))) as Record<string, string>;
  const url = env.E2E_SUPABASE_URL ?? status.API_URL;
  if (!url) throw new Error("supabase status did not report the API URL; is the stack running?");
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost"].includes(host) && env.E2E_ALLOW_NON_LOCAL !== "1") {
    throw new Error(`e2e refuses the non-local Supabase URL host "${host}"; set E2E_ALLOW_NON_LOCAL=1 to allow it`);
  }
  const publishableKey = status.PUBLISHABLE_KEY;
  const secretKey = status.SECRET_KEY;
  const mailpitUrl = status.MAILPIT_URL ?? status.INBUCKET_URL;
  const dbUrl = status.DB_URL;
  if (!url || !publishableKey || !secretKey || !mailpitUrl || !dbUrl) {
    throw new Error("supabase status did not report the API URL, keys, mail catcher and database; is the stack running?");
  }
  if (!["127.0.0.1", "localhost"].includes(new URL(dbUrl).hostname)) {
    throw new Error("e2e refuses a non-local database URL");
  }
  return { url, publishableKey, secretKey, mailpitUrl, dbUrl };
}
