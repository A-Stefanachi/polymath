// BL-0194: the allow-context rule of reference/lint_claims.py, ported (00f section 9).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { scanPackage, scanText, type Finding } from "../src/scan.ts";
import { selftest } from "../src/selftest.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, "..", "..", "..");
const PACKAGE = path.join(REPO, "polymath-app-spec");
const CLI = path.join(HERE, "..", "src", "cli.ts");
const PYTHON = process.env["PYTHON"] ?? "python3";

const reasons = (text: string, md = true) => scanText(text, md).map((f) => f.reason ?? "VIOLATION");

describe("allow-context rule", () => {
  it("acceptance 1: --selftest passes the 16 cases of reference/lint_claims.py --selftest", () => {
    expect(selftest()).toEqual([]);
    const ts = spawnSync(process.execPath, [CLI, "--selftest"], { encoding: "utf8" });
    expect(ts.stdout).toContain("selftest ok (16 cases)");
    expect(ts.status).toBe(0);
    const py = spawnSync(PYTHON, ["-B", path.join(PACKAGE, "reference", "lint_claims.py"), "--selftest"], {
      encoding: "utf8",
    });
    expect(py.stdout).toContain("lint_claims selftest ok");
  });

  it("A: a marker on the same line excuses the hit", () => {
    expect(reasons("The app must never claim a 2 sigma effect.")).toEqual(["A:line-marker"]);
  });

  it("B: a heading such as Exclusions excuses its block until the next heading of that level", () => {
    const md = "# Exclusions\n\n## Copy\n\nUnlock your top 1% brain\n\n# Plans\n\nUnlock your top 1% brain\n";
    expect(reasons(md)).toEqual(["B:section=Exclusions", "VIOLATION"]);
  });

  it("B: headings inside a code fence are ignored", () => {
    expect(reasons("```\n# Claims\n```\nUnlock your top 1% brain\n")).toEqual(["VIOLATION"]);
  });

  it("C: a marker within two lines of the same paragraph excuses; a blank line breaks it", () => {
    expect(reasons("We do not say\nthat you will be\nin the top 1%.\n")).toEqual(["C:paragraph-window"]);
    expect(reasons("We do not say this.\n\nYou will be in the top 1%.\n")).toEqual(["VIOLATION"]);
  });

  it("E: a YAML entry whose title names the topic excuses its lines; the next entry does not", () => {
    // The hit sits 3 lines below the title, outside rule C's window, so only rule E applies.
    const yaml = [
      "- id: BL-1",
      "  title: Neuro wording review",
      "  owner: agent",
      "  estimate: 2",
      "  note: replace top 1% copy",
      "- id: BL-2",
      "  title: Hero copy",
      "  owner: agent",
      "  estimate: 2",
      "  note: top 1% engineers",
      "",
    ].join("\n");
    expect(reasons(yaml, false)).toEqual(["E:context-key", "VIOLATION"]);
  });

  it("the section rule does not apply outside Markdown", () => {
    expect(reasons("# Exclusions\nUnlock your top 1% brain\n", false)).toEqual(["VIOLATION"]);
  });
});

describe("acceptance 3: a component fails, the same sentence under an Exclusions heading is listed", () => {
  let root = "";
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("is excused under the heading and shown by --show-allowed", () => {
    root = mkdtempSync(path.join(tmpdir(), "claims-context-"));
    const doc = path.join(root, "polymath-app-spec", "docs", "copy.md");
    mkdirSync(path.dirname(doc), { recursive: true });
    writeFileSync(doc, "# Exclusions\n\nUnlock your top 1% brain\n");
    const quiet = spawnSync(process.execPath, [CLI, "--root", root], { encoding: "utf8" });
    expect(quiet.status).toBe(0);
    expect(quiet.stdout).not.toContain("copy.md");
    const shown = spawnSync(process.execPath, [CLI, "--root", root, "--show-allowed"], { encoding: "utf8" });
    expect(shown.status).toBe(0);
    expect(shown.stdout).toContain(
      "polymath-app-spec/docs/copy.md:3: allowed(B:section=Exclusions) [top-1-percent] 'top 1%'",
    );
  });
});

type Row = string; // file:line:category:reason

function pythonRows(): { violations: Row[]; allowed: Row[] } {
  const run = spawnSync(PYTHON, ["-B", path.join(PACKAGE, "reference", "lint_claims.py"), "--show-allowed"], {
    encoding: "utf8",
  });
  if (run.error) throw run.error;
  const violations: Row[] = [];
  const allowed: Row[] = [];
  for (const line of run.stdout.split("\n")) {
    const v = /^(.+?):(\d+): VIOLATION \[([a-z0-9-]+)\]/.exec(line);
    if (v) violations.push(`${v[1]}:${v[2]}:${v[3]}:VIOLATION`);
    const a = /^(.+?):(\d+): allowed\((.+?)\) \[([a-z0-9-]+)\] '/.exec(line);
    if (a) allowed.push(`${a[1]}:${a[2]}:${a[4]}:${a[3]}`);
  }
  return { violations: violations.sort(), allowed: allowed.sort() };
}

function tsRows(findings: Finding[]): { violations: Row[]; allowed: Row[] } {
  const ref = findings.filter((f) => f.source === "reference");
  return {
    violations: ref.filter((f) => f.reason === undefined).map((f) => `${f.file}:${String(f.line)}:${f.category}:VIOLATION`).sort(),
    allowed: ref.filter((f) => f.reason !== undefined).map((f) => `${f.file}:${String(f.line)}:${f.category}:${f.reason ?? ""}`).sort(),
  };
}

describe("acceptance 2: parity with reference/lint_claims.py on the repository corpus", () => {
  it("reports the same violations (0) and the same excused-hit locations and reasons", () => {
    const py = pythonRows();
    const ts = tsRows(scanPackage(PACKAGE).findings);
    expect(py.allowed.length).toBeGreaterThan(100); // the reference really ran
    expect(ts.violations).toEqual(py.violations);
    expect(py.violations).toEqual([]);
    expect(ts.allowed).toEqual(py.allowed);
  });
});
