// BL-0004: the module boundary rules of doc 03 section 13.1, proved on fixture repositories.
// Each rule has a fixture file that breaks it; `clean` holds the allowed counterparts, so a rule
// that starts flagging legitimate code fails here too.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { checkBoundaries, type Violation } from "../src/run.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "..", "fixtures");
const CLI = path.join(HERE, "..", "src", "cli.ts");

function runCli(fixture: string): { status: number | null; stdout: string } {
  const run = spawnSync(process.execPath, [CLI, "--root", path.join(FIXTURES, fixture)], {
    encoding: "utf8",
  });
  return { status: run.status, stdout: run.stdout };
}

const pairs = (vs: Violation[]): string[] => vs.map((v) => `${v.file} ${v.rule}`).sort();

describe("lint:boundaries exit code", () => {
  it("exits 0 on a repository that keeps every rule", () => {
    const run = runCli("clean");
    expect(run.stdout).toContain("no violations");
    expect(run.status).toBe(0);
  });

  it("acceptance 2: a component importing the Supabase client exits non-zero", () => {
    const run = runCli("ui-supabase-service-client");
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("apps/web/src/components/AdminPanel.tsx:2 [ui-no-db-client]");
  });

  it("acceptance 3: process.env inside packages/scheduler exits non-zero", () => {
    const run = runCli("scheduler-process-env");
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("packages/scheduler/src/config.ts:2 [packages-pure-env]");
  });
});

describe("every rule of doc 03 section 13.1 fires on its fixture", () => {
  it("reports exactly the planted violations, each with its rule id", async () => {
    const found = await checkBoundaries(path.join(FIXTURES, "violations"));
    expect(pairs(found)).toEqual(
      [
        "apps/web/src/app/api/v1/long/route.ts max-lines",
        "apps/web/src/app/page.tsx ui-no-db-client",
        "apps/web/src/components/ImportsPrivileged.tsx ui-no-privileged",
        "apps/web/src/components/ImportsPrivileged.tsx ui-no-privileged",
        "apps/web/src/lib/ai.ts llm-sdk-only-in-packages-llm",
        "packages/grading-core/src/net.ts packages-pure-network",
        "packages/offline/src/disk.ts packages-pure-io",
        "packages/offline/src/disk.ts packages-pure-io",
        "packages/scheduler/src/llm.ts core-packages-isolated",
        "packages/shared-types/src/app.ts packages-not-to-apps-or-services",
        "packages/tutor-policy/src/clock.ts packages-pure-clock",
        "packages/tutor-policy/src/clock.ts packages-pure-clock",
        "services/sandbox-runner/runner/bad.py sandbox-no-worker-import",
        "services/worker/polymath_worker/write.py worker-no-learner-state-writes",
        "services/worker/polymath_worker/write.py worker-no-learner-state-writes",
      ].sort(),
    );
  });

  it("checks the resolved graph as well as the import text (both tools flag the alias import)", async () => {
    const found = await checkBoundaries(path.join(FIXTURES, "violations"));
    const tools = found
      .filter((v) => v.rule === "ui-no-privileged")
      .map((v) => v.tool)
      .sort();
    expect(tools).toEqual(["dependency-cruiser", "eslint"]);
  });

  it("allows test files to read vectors, packages/llm to use fetch, and the worker to read learner state", async () => {
    expect(await checkBoundaries(path.join(FIXTURES, "clean"))).toEqual([]);
  });
});
