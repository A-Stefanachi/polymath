// pnpm content:sync [--dry-run] [--only <key>] [--content-root DIR] [--trigger ci|manual|local]
//                   [--database-url URL] [--allow-remote]
// The database is --database-url, else DATABASE_URL_PRIVILEGED (doc 03 section 9.1).
// Exit 0 success, 1 validation error, 2 fuzz failure, 3 database error (doc 07 section 10).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

import { CONTENT_ROOT, DATABASE_ENV } from "./config.ts";
import { runSync } from "./run.ts";

function gitHead(): string {
  const fromEnv = process.env["GITHUB_SHA"] ?? process.env["GIT_SHA"];
  if (fromEnv) return fromEnv;
  const run = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  return run.status === 0 ? run.stdout.trim() : "unknown";
}

let values;
try {
  ({ values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      only: { type: "string" },
      "content-root": { type: "string" },
      trigger: { type: "string" },
      "database-url": { type: "string" },
      "allow-remote": { type: "boolean", default: false },
    },
    strict: true,
  }));
} catch (error) {
  console.error(`content:sync: ${error instanceof Error ? error.message : "bad arguments"}`);
  process.exit(1);
}

const trigger = values.trigger ?? (process.env["CI"] ? "ci" : "local");
if (trigger !== "ci" && trigger !== "manual" && trigger !== "local") {
  console.error("content:sync: --trigger must be ci, manual or local");
  process.exit(1);
}

const result = await runSync({
  contentRoot: values["content-root"] ? path.resolve(values["content-root"]) : CONTENT_ROOT,
  dryRun: values["dry-run"] ?? false,
  only: values.only,
  // --database-url wins over the environment; a non-local host needs --allow-remote.
  databaseUrl: values["database-url"] || process.env[DATABASE_ENV] || undefined,
  allowRemote: values["allow-remote"] ?? false,
  gitSha: gitHead(),
  gitRef: process.env["GITHUB_REF"] ?? null,
  trigger,
});
for (const line of result.err) console.error(line);
for (const line of result.out) console.log(line);
process.exitCode = result.exitCode;
