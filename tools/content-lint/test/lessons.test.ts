// BL-0200 acceptance: `pnpm content:lint` covers content/lessons/ and fails on one fixture per L-G1 rule with the
// rule named; the app validator and reference/validate_lessons.py (the oracle) agree on every lesson file and on
// every failure fixture. A fixture is a patch on the sample lesson, so it shows only what breaks the rule.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";

import { CONTENT_ROOT } from "../src/config.ts";

const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const FIXTURES = fileURLToPath(new URL("../fixtures-lessons", import.meta.url));
const ORACLE = path.join(CONTENT_ROOT, "..", "reference", "validate_lessons.py");
const LESSONS = path.join(CONTENT_ROOT, "lessons");
const BASE = "elec.dc.ohms-law";

type Patch = { rule: string; file?: string; set: Record<string, unknown> };
type Result = { status: number | null; output: string };

function expand(v: unknown): unknown {
  if (typeof v === "object" && v !== null && "$repeat" in v) {
    const r = v as { $repeat: string; times: number };
    return r.$repeat.repeat(r.times);
  }
  return v;
}

/** Writes the patched sample lesson as the only file of a new content root (graph and templates linked). */
function materialise(patch: Patch): { root: string; file: string } {
  const doc: unknown = parse(readFileSync(path.join(LESSONS, `${BASE}.yaml`), "utf8"), { schema: "core" });
  for (const [dotted, value] of Object.entries(patch.set)) {
    const parts = dotted.split(".");
    let cur = doc as Record<string, unknown>;
    for (const p of parts.slice(0, -1)) cur = cur[p] as Record<string, unknown>;
    cur[parts.at(-1) ?? ""] = expand(value);
  }
  const root = mkdtempSync(path.join(tmpdir(), "pm_lesson_fix_"));
  for (const e of ["mvp-skill-graph.yaml", "templates", "prompts"]) symlinkSync(path.join(CONTENT_ROOT, e), path.join(root, e));
  mkdirSync(path.join(root, "lessons"));
  const file = path.join(root, "lessons", patch.file ?? `${BASE}.yaml`);
  writeFileSync(file, stringify(doc));
  return { root, file };
}

const lint = (root: string): Result => {
  const run = spawnSync("node", [CLI, "--content-root", root], { encoding: "utf8" });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
};
const oracle = (...files: string[]): Result => {
  const run = spawnSync("python3", ["-B", ORACLE, ...files], { encoding: "utf8" });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
};

const fixtures = readdirSync(FIXTURES)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(path.join(FIXTURES, f), "utf8")) as Patch] as const);

describe("content:lint on content/lessons", () => {
  it("the real lessons pass and are counted", () => {
    const run = spawnSync("node", [CLI], { encoding: "utf8" });
    expect(run.stdout).toContain("content:lint: 19 lesson(s)");
    expect(run.stdout).not.toMatch(/\[(LG0|LG1-[A-Z]+)\]/);
    expect(run.status, run.stdout + run.stderr).toBe(0);
  });

  it("the fixtures cover every L-G1 rule", () => {
    const covered = new Set(fixtures.map(([, p]) => p.rule));
    for (const rule of ["LG0", "LG1-FILE", "LG1-SKILL", "LG1-STUB", "LG1-WORDS", "LG1-IDS", "LG1-CORRECT", "LG1-TAG", "LG1-SVG", "LG1-VISUAL", "LG1-FIGTEXT"]) {
      expect(covered.has(rule), rule).toBe(true);
    }
  });

  it.each(fixtures)("%s: fails with the rule named, and the oracle fails it too", (_name, patch) => {
    const { root, file } = materialise(patch);
    const ours = lint(root);
    expect(ours.output).toContain(`[${patch.rule}] E `);
    expect(ours.status).toBe(1);
    expect(oracle(file).status).toBe(1);
  });
});

describe("agreement with reference/validate_lessons.py", () => {
  it("both accept all 19 lesson files", () => {
    const files = readdirSync(LESSONS).filter((f) => f.endsWith(".yaml"));
    expect(files).toHaveLength(19);
    expect(oracle(...files.map((f) => path.join(LESSONS, f))).status).toBe(0);
    expect(lint(CONTENT_ROOT).status).toBe(0);
  });

  it("the limits agree: 150 and 60 words pass in both, 151 and 61 fail in both", () => {
    const words = (n: number): Record<string, unknown> => ({ $repeat: "word ", times: n });
    for (const [screen, recap, ok] of [[150, 60, true], [151, 60, false], [150, 61, false]] as const) {
      const { root, file } = materialise({ rule: "", set: { "screens.0.body_md": words(screen), recap_md: words(recap) } });
      expect(lint(root).status, `${String(screen)}/${String(recap)} ours`).toBe(ok ? 0 : 1);
      expect(oracle(file).status, `${String(screen)}/${String(recap)} oracle`).toBe(ok ? 0 : 1);
    }
  });
});
