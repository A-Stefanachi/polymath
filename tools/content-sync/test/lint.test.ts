// G0 and G1 on small mutated copies of the real content, without a database.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONTENT_ROOT } from "../src/config.ts";
import { findCycle, lintContent } from "../src/lint.ts";
import { loadContent } from "../src/load.ts";
import { runSync } from "../src/run.ts";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pm_lint_"));
  for (const e of ["mvp-skill-graph.yaml", "templates", "REVIEW-LOG.md", "prompts"]) cpSync(path.join(CONTENT_ROOT, e), path.join(dir, e), { recursive: true });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const file = "templates/math/tpl.math.units-kilo.yaml";
function edit(change: (t: string) => string, run: () => void): void {
  const p = path.join(dir, file);
  const original = readFileSync(p, "utf8");
  writeFileSync(p, change(original));
  try {
    run();
  } finally {
    writeFileSync(p, original);
  }
}
const rules = (): string[] => {
  const l = loadContent(dir);
  // Warnings do not block the sync, so they are not problems here.
  return [...l.problems, ...lintContent(l, dir)].filter((p) => p.severity !== "W").map((p) => p.rule);
};

describe("G0 and G1", () => {
  it("the real content has no problem", () => {
    expect(rules()).toEqual([]);
  });
  it("G0: a missing license field and a licence outside the allowed set are schema errors", () => {
    edit((t) => t.replace(/^license: .*\n/m, ""), () => expect(rules()).toContain("G0"));
    edit((t) => t.replace("license: original", "license: CC-BY-NC-SA-4.0"), () => expect(rules()).toContain("G0"));
  });
  it("L10: a source that points at non-commercial material is refused", () => {
    edit((t) => t.replace("source: original", "source: MIT OpenCourseWare 6.002 problem set"), () => expect(rules()).toEqual(["L10"]));
  });
  it("L10: an LLM prompt_version without a prompt file is refused", () => {
    edit((t) => t.replace("prompt_version: template_assist_v1", "prompt_version: nope_v9"), () => expect(rules()).toEqual(["L10"]));
  });
  it("L02: an unknown skill_key is refused", () => {
    edit((t) => t.replace("skill_key: math.alg.units-and-prefixes", "skill_key: math.alg.no-such-skill"), () => expect(rules()).toEqual(["L02"]));
  });
  it("L24: fewer than 200 fuzz samples are refused (the schema already rejects them, so G0 reports it)", () => {
    edit((t) => t.replace("samples: 200", "samples: 199"), () => expect(rules()).toContain("G0"));
  });
  it("L25: placeholder text is refused", () => {
    edit((t) => t.replace("Is a kilo-ohm larger", "TODO Is a kilo-ohm larger"), () => expect(rules()).toEqual(["L25"]));
  });
  it("L01: a file whose name differs from its key is refused", () => {
    const copy = path.join(dir, "templates/math/tpl.math.copy.yaml");
    writeFileSync(copy, readFileSync(path.join(dir, file), "utf8"));
    try {
      expect(rules()).toEqual(expect.arrayContaining(["L01", "TPL-DUP"]));
    } finally {
      rmSync(copy);
    }
  });
  it("GRAPH: a prerequisite cycle is found", () => {
    expect(findCycle(new Map([["a", ["b"]], ["b", ["c"]], ["c", ["a"]]]))).toEqual(["a", "b", "c", "a"]);
    expect(findCycle(new Map([["a", ["b"]], ["b", []]]))).toBeUndefined();
  });
});

describe("CLI refusals need no database", () => {
  const base = { contentRoot: CONTENT_ROOT, dryRun: true, gitSha: "x", gitRef: null, trigger: "local" } as const;
  it("exits 3 with a clear message when no database URL is given", async () => {
    const r = await runSync({ ...base, databaseUrl: undefined });
    expect(r.exitCode).toBe(3);
    expect(r.err.join()).toContain("--database-url");
  });
  it("exits 3 for a remote host without allowRemote, even in a dry run, and never prints the URL", async () => {
    const r = await runSync({ ...base, databaseUrl: "postgresql://u:secret-pw@db.example.com:5432/postgres" });
    expect(r.exitCode).toBe(3);
    expect(r.err.join()).toContain("db.example.com");
    expect(r.err.join()).not.toContain("secret-pw");
  });
  it("exits 1 on invalid content before any database is touched", async () => {
    const p = path.join(dir, file);
    const original = readFileSync(p, "utf8");
    writeFileSync(p, original.replace(/^license: .*\n/m, ""));
    try {
      const r = await runSync({ ...base, contentRoot: dir, databaseUrl: undefined });
      expect(r.exitCode).toBe(1);
      expect(r.err.join("\n")).toContain("license");
    } finally {
      writeFileSync(p, original);
    }
  });
});
