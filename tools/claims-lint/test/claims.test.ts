// BL-0006: claims-policy lint (contract section 8, PRD 11.2, FR-126, ST-CLAIM-01).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { hitsInLine } from "../src/rules.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "src", "cli.ts");

// PRD section 11.2, verbatim, with the rule each must be flagged by.
const PRD_11_2: [string, string][] = [
  ["Unlock your brain's peak learning window.", "neuroplasticity-window"],
  ["Learn twice as fast with our AI tutor.", "efficacy-multiplier"],
  ["Reach the top 1% in every engineering discipline.", "top-1-percent"],
  ["Novices beat experts in 16 weeks, like the military.", "novices-beat-experts"],
  ["Built on secret military learning techniques.", "secret-techniques"],
  ["Every session rewires your brain.", "brain-rewiring"],
  ["Keep your success rate at the proven 85% for optimal learning.", "85-percent-rule"],
  ["Study in 90-minute brain cycles for best results.", "90-minute-cycle"],
  ["Learn while you sleep", "sleep-or-audio-learning"],
  ["Focus audio that boosts learning.", "sleep-or-audio-learning"],
  ["Our AI knows exactly what you have forgotten and guarantees retention.", "guaranteed-outcome"],
];

describe("forbidden phrases", () => {
  it.each(PRD_11_2)("acceptance 2: PRD 11.2 string %j is flagged as %s", (text, rule) => {
    expect(hitsInLine(text).map((h) => h.category)).toContain(rule);
  });

  it.each([
    "Adaptive practice with spaced retrieval, graded feedback and guided builds.",
    "An inner loop 4 to 10 times faster than the outer loop.",
    "Two-sided coverage within two standard deviations: 95.45%.",
    "Good PM and GM guarantee a good Ms; a curve can pass close to -1.",
    "Your next review is due tomorrow.",
  ])("does not flag ordinary copy or technical text: %j", (text) => {
    expect(hitsInLine(text)).toEqual([]);
  });

  it("flags medical claims (contract section 8)", () => {
    expect(hitsInLine("Clinically proven to improve recall.").map((h) => h.category)).toEqual(["medical-claim"]);
  });
});

describe("pnpm claims:lint on a repository", () => {
  let root = "";
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  function repoWith(file: string, content: string): string {
    root = mkdtempSync(path.join(tmpdir(), "claims-lint-"));
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
    return root;
  }

  function run(dir: string) {
    return spawnSync(process.execPath, [CLI, "--root", dir], { encoding: "utf8" });
  }

  it("acceptance 3: 'unlock your top 1% brain' in a component fails with exit 1", () => {
    const dir = repoWith(
      "apps/web/src/components/Hero.tsx",
      'export const Hero = () => <h1>Unlock your top 1% brain</h1>;\n',
    );
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("apps/web/src/components/Hero.tsx:1: VIOLATION [top-1-percent] 'top 1%'");
  });

  it("exits 0 on a repository with ordinary copy", () => {
    const dir = repoWith("apps/web/src/components/Hero.tsx", "export const Hero = () => <h1>Practice today</h1>;\n");
    const result = run(dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("0 violation(s)");
  });
});
