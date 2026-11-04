// BL-0050 acceptance tests: the doc 07 table drives the fixtures; samples pass; 100 templates lint fast.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CONTENT_ROOT } from "../src/config.ts";
import { RULES } from "../src/index.ts";
import { CLI, FIXTURES, runFixture } from "./helpers.ts";

const DOC = path.join(CONTENT_ROOT, "..", "docs", "07-content-pipeline-and-verification-spec.md");
const docRules = [...readFileSync(DOC, "utf8").matchAll(/^\| (L\d\d) \| .* \| ([EW]) \|$/gm)].map((m) => ({ id: m[1] ?? "", severity: m[2] ?? "" }));

function cli(...args: string[]): { status: number | null; output: string } {
  const run = spawnSync("node", [CLI, "--content-root", CONTENT_ROOT, ...args], { encoding: "utf8" });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

describe("rules from the doc 07 table", () => {
  // L27 (step labels) joined the table with 00a K5.
  it("the table has L01 to L27", () => {
    expect(docRules).toHaveLength(27);
  });
  it("every rule of the table is implemented with the table's severity", () => {
    expect(RULES.map((r) => ({ id: r.id, severity: r.severity }))).toEqual(docRules);
  });
  it.each(docRules)("$id: its failing fixture is reported with the rule id", ({ id, severity }) => {
    const { status, output } = runFixture(id);
    expect(output).toContain(`[${id}] ${severity} `);
    // An error fails the run; a warning alone does not.
    if (severity === "E") expect(status).toBe(1);
  });
  it("every fixture file belongs to a rule of the table", () => {
    const ids = new Set(docRules.map((r) => r.id));
    for (const f of readdirSync(FIXTURES)) expect(ids.has(f.replace(/\.json$/, ""))).toBe(true);
  });
});

describe("acceptance", () => {
  it("the 7 sample templates exit 0 without findings", () => {
    const { status, output } = cli(path.join(CONTENT_ROOT, "sample-problem-templates"));
    expect(output).toContain("7 template(s), 0 error(s), 0 warning(s)");
    expect(status).toBe(0);
  });
  it("lints 100 templates in under 20 seconds", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pm_perf_"));
    const src = path.join(CONTENT_ROOT, "templates");
    const files = readdirSync(src, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".yaml"));
    mkdirSync(path.join(dir, "t"));
    let n = 0;
    for (let round = 0; n < 100; round++) {
      for (const f of files) {
        if (n >= 100) break;
        const key = path.basename(f, ".yaml");
        const text = readFileSync(path.join(src, f), "utf8").replace(new RegExp(`^key: ${key.replaceAll(".", "\\.")}$`, "m"), `key: ${key}-c${String(round)}`);
        writeFileSync(path.join(dir, "t", `${key}-c${String(round)}.yaml`), text);
        n++;
      }
    }
    const t0 = performance.now();
    const { output } = cli(path.join(dir, "t"));
    const seconds = (performance.now() - t0) / 1000;
    expect(output).toContain("100 template(s)");
    expect(seconds).toBeLessThan(20);
  });
});
