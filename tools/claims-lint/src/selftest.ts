// The 16 positive and negative cases of `reference/lint_claims.py --selftest` (BL-0194).
import { scanText } from "./scan.ts";

const LINE_CASES: [string, boolean][] = [
  ["Unlock your brain's neuroplasticity window with our daily sprint.", true],
  ["Learn like the top 1% of engineers.", true],
  ["Our tutor delivers 2 sigma gains.", true],
  ["Use the 85% rule to keep every learner at the optimum.", true],
  ["We use targeted memory reactivation while you sleep.", true],
  ["Take 90-minute brain cycles for best results.", true],
  ["Achieve mastery of all disciplines.", true],
  ["Novices beat experts in 16 weeks.", true],
  ["The app reads your heart rate variability to adapt the lesson.", true],
  ["A tDCS headband boosts retention.", true],
  ["The app infers emotion from your webcam.", true],
  ["Spaced retrieval and graded feedback help you practise.", false],
  ["The UI must never claim neuroplasticity windows.", false],
  ["Do not advertise the top 1% claim.", false],
  ["tDCS is excluded from v1.", false],
];

const SECTION_CASE = "# Claims\n\n- the 85% rule is described here\n\n# Plans\n\nWe promise 2 sigma.\n";

/** Runs the cases; returns the failure messages (empty when all pass). */
export function selftest(): string[] {
  const failures: string[] = [];
  for (const [text, shouldFlag] of LINE_CASES) {
    const violations = scanText(text, true).filter((f) => f.reason === undefined);
    if (violations.length > 0 !== shouldFlag) {
      failures.push(`${JSON.stringify(text)}: expected ${shouldFlag ? "flag" : "clean"}, got ${JSON.stringify(violations)}`);
    }
  }
  const md = scanText(SECTION_CASE, true);
  const allowed = md.filter((f) => f.reason !== undefined);
  const violations = md.filter((f) => f.reason === undefined);
  if (allowed.length !== 1 || violations.length !== 1 || violations[0]?.line !== 7) {
    failures.push(`section rule: violations ${JSON.stringify(violations)}, allowed ${JSON.stringify(allowed)}`);
  }
  return failures;
}

export const SELFTEST_CASES = LINE_CASES.length + 1;
