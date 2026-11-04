// content:sync orchestration (doc 07 section 10). Exit codes: 0 success; 1 validation error (nothing
// is written); 2 fuzz failure (G2 runs in the worker after the sync, through the content_postprocess
// job, so this tool never returns it); 3 database error.
import { applyPlan, connect, failRun, readExisting, startRun, type RunTrigger, type Sql } from "./db.ts";
import { lintContent } from "./lint.ts";
import { loadContent, type Problem } from "./load.ts";
import { buildPlan, countsOf, type Plan } from "./plan.ts";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** Returns an error message (never the URL itself) when the host is remote and not allowed. */
export function remoteHostError(url: string, allowRemote: boolean): string | undefined {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "the database URL cannot be parsed";
  }
  if (allowRemote || LOCAL_HOSTS.has(host)) return undefined;
  return `refusing to connect to non-local host ${host}; pass --allow-remote to confirm`;
}

export type RunOptions = {
  allowRemote?: boolean | undefined;
  contentRoot: string;
  dryRun: boolean;
  only?: string | undefined;
  databaseUrl?: string | undefined;
  gitSha: string;
  gitRef: string | null;
  trigger: RunTrigger;
};
export type RunResult = { exitCode: 0 | 1 | 3; out: string[]; err: string[] };

function summary(plan: Plan, errors: number, dryRun: boolean, jobId: string | null): string[] {
  const counts = countsOf(plan);
  const lines = [`content:sync summary${dryRun ? " (dry run, nothing written)" : ""}`];
  for (const [name, c] of Object.entries(counts)) {
    lines.push(
      `${name.padEnd(10)} created=${String(c.created)} updated=${String(c.updated)} unchanged=${String(c.unchanged)} retired=${String(c.retired)} errors=${String(errors)}`,
    );
  }
  const jobs = plan.templates.needsJob.length;
  if (jobs > 0) {
    lines.push(
      dryRun
        ? `verification: would enqueue 1 content_postprocess job for ${String(jobs)} template(s)`
        : `verification: enqueued content_postprocess job ${jobId ?? "(deduplicated)"} for ${String(jobs)} template(s)`,
    );
  } else lines.push("verification: no template changed, no job enqueued");
  const waiting = plan.templates.awaitingReview;
  lines.push(`awaiting human review: ${String(waiting.length)}${waiting.length > 0 ? ` (${waiting.join(", ")})` : ""}`);
  return lines;
}

function failure(problems: Problem[], extra: string[] = []): RunResult {
  const err = problems.map((p) => `${p.file} [${p.rule}] ${p.message}`);
  const out = [`content:sync: ${String(problems.length)} validation error(s), nothing written`, ...extra];
  return { exitCode: 1, out, err };
}

export async function runSync(options: RunOptions): Promise<RunResult> {
  const loaded = loadContent(options.contentRoot);
  const all = [...loaded.problems, ...lintContent(loaded, options.contentRoot)];
  // Warnings (L06, L21, L26) are shown but never block the sync.
  const problems = all.filter((p) => p.severity !== "W");
  const warnings = all.filter((p) => p.severity === "W").map((p) => `${p.file} [${p.rule}] warning: ${p.message}`);
  if (options.only !== undefined && !loaded.templates.some((t) => t.doc["key"] === options.only))
    problems.push({ file: "(--only)", rule: "ARGS", message: `no valid template with key ${options.only}` });
  if (problems.length > 0) return failure(problems);

  let sql: Sql | undefined;
  let runId: string | undefined;
  try {
    if (!options.databaseUrl) {
      return { exitCode: 3, out: [], err: ["content:sync: no database: pass --database-url or set DATABASE_URL_PRIVILEGED"] };
    }
    const refused = remoteHostError(options.databaseUrl, options.allowRemote === true);
    if (refused) return { exitCode: 3, out: [], err: [`content:sync: ${refused}`] };
    sql = connect(options.databaseUrl);
    const existing = await readExisting(sql);

    const plan = buildPlan(loaded, existing, { only: options.only });
    if (plan.problems.length > 0) return failure(plan.problems);

    if (options.dryRun) return { exitCode: 0, out: summary(plan, 0, true, null), err: warnings };

    runId = await startRun(sql, options.gitSha, options.gitRef, options.trigger);
    const c = countsOf(plan);
    const stat = (x: { created: number; updated: number; unchanged: number; retired: number }): object => ({
      added: x.created,
      changed: x.updated,
      unchanged: x.unchanged,
      retired: x.retired,
    });
    const jobId = await applyPlan(sql, plan, {
      runId,
      gitSha: options.gitSha,
      stats: {
        modules: stat(c.modules),
        skills: stat(c.skills),
        edges: stat(c.edges),
        templates: { ...stat(c.templates), job_template_keys: plan.templates.needsJob },
      },
    });
    return { exitCode: 0, out: [`run ${runId}`, ...summary(plan, 0, false, jobId)], err: warnings };
  } catch (error) {
    // Postgres error messages carry no connection string; the URL is never interpolated anywhere.
    const message = error instanceof Error ? error.message : "unknown database error";
    if (sql && runId) await failRun(sql, runId, message).catch(() => undefined);
    return { exitCode: 3, out: [], err: [`content:sync: database error: ${message}`] };
  } finally {
    await sql?.end({ timeout: 5 });
  }
}
