// Allow-context rule of reference/lint_claims.py (BL-0194; 00f section 9), ported verbatim.
// A hit is excused when ANY of these holds:
//   A. Line rule: its own line has a negation or discussion marker (never, do not, forbidden,
//      excluded, avoid, lint, "no ... claims", "out of v1", ...).
//   B. Section rule (Markdown): the nearest enclosing heading names an exclusion, claims, policy,
//      risk, avoid, non-goal, techniques, security or similar section.
//   C. Window rule: a line within 2 lines, in the same paragraph, matches rule A.
//   E. Context-key rule (YAML and other non-Markdown files): the enclosing entry's nearest
//      title/slug/id/name value mentions claims, lint, forbidden, neuro, biometric or emotion.
// The rule is lexical: a line with a marker word and a real claim is excused, so read the
// --show-allowed output whenever a section with an exclusion heading is edited.
import { pyLstrip, pyRegExp, pyStrip } from "./pyre.ts";

export const LINE_MARKERS = pyRegExp(
  String.raw`\b(?:never|do not|don't|doesn't|does not|must not|must never|cannot|can't|forbidden|forbids|excluded|exclusion|exclude|` +
    String.raw`deliberately|reject\w*|refus\w*|avoid\w*|prohibit\w*|ban(?:ned|s)?|blocklist|blacklist|lint\w*|claims policy|myth|` +
    String.raw`refuted|unsupported|unverified|no credible|no adequate|out of scope|out of v1|deferred|trigger to revisit|not claim\w*|` +
    String.raw`without claims|no (?:claim|evidence|source|support|medical|health|emotion|biometric|neural)\w*|` +
    String.raw`not (?:a|an|the|proven|supported|evidence|used|in v1|implemented|offered|collected|shipped|applicable|deliverable|validated|` +
    String.raw`treated|presented|cited|described|available|reopened)|` +
    String.raw`is (?:a )?(?:non-?goal|out)|no [a-z-]+ (?:data|inference)|v1 forbids)\b` +
    String.raw`|\bno\b[^.\n]{0,90}\bclaims?\b|\bmakes no\b`,
  true,
);

export const HEADING_MARKERS = pyRegExp(
  String.raw`(?:excluded|exclusion|forbidden|claims?\b|avoid|deliberately|policy|blocklist|lint|non-goal|out of scope|deferred|` +
    String.raw`what not to|not claim|\brisks?\b|never|evidence gaps|unverified|safety|security|privacy|legal|compliance|techniques)`,
  true,
);

const CONTEXT_KEYS = pyRegExp(String.raw`^\s*-?\s*(?:title|slug|id|name):\s*(.*)$`, false);
const CONTEXT_WORDS = pyRegExp(String.raw`claim|lint|forbidden|neuro|biometric|emotion`, true);
const HEADING = pyRegExp(String.raw`^(#{1,6})\s+(.*\S)\s*$`, false);

/** For each line, the enclosing Markdown heading titles, outermost first (headings in fences ignored). */
export function headingStack(lines: string[]): string[][] {
  const stack: [number, string][] = [];
  const out: string[][] = [];
  let inFence = false;
  for (const ln of lines) {
    if (pyLstrip(ln).startsWith("```")) inFence = !inFence;
    const m = inFence ? null : HEADING.exec(ln);
    if (m) {
      const level = (m[1] ?? "").length;
      while (stack.length > 0 && (stack.at(-1)?.[0] ?? 0) >= level) stack.pop();
      stack.push([level, m[2] ?? ""]);
    }
    out.push(stack.map(([, t]) => t));
  }
  return out;
}

/** Per line: is it inside a YAML entry whose title/slug/id/name mentions claims (rule E)? */
export function contextKeys(lines: string[]): boolean[] {
  let cur = false;
  return lines.map((ln) => {
    const m = CONTEXT_KEYS.exec(ln);
    if (m && !ln.startsWith("        ")) cur = CONTEXT_WORDS.test(m[1] ?? "");
    return cur;
  });
}

/** First 40 code points, as Python's str[:40]. */
function first40(s: string): string {
  return Array.from(s).slice(0, 40).join("");
}

export type Context = { markers: boolean[]; heads: string[][]; ctx: boolean[]; lines: string[] };

export function buildContext(lines: string[], isMarkdown: boolean): Context {
  return {
    lines,
    markers: lines.map((ln) => LINE_MARKERS.test(ln)),
    heads: isMarkdown ? headingStack(lines) : lines.map(() => []),
    ctx: isMarkdown ? lines.map(() => false) : contextKeys(lines),
  };
}

/** Why the hit on line index i is excused, in the reference's reason format, or undefined. */
export function excuse(c: Context, i: number, isMarkdown: boolean): string | undefined {
  if (c.markers[i]) return "A:line-marker";
  const heads = c.heads[i] ?? [];
  if (isMarkdown && heads.some((t) => HEADING_MARKERS.test(t))) {
    const nearest = [...heads].reverse().find((t) => HEADING_MARKERS.test(t)) ?? "";
    return `B:section=${first40(nearest)}`;
  }
  for (const j of [i - 2, i - 1, i + 1, i + 2]) {
    if (j >= 0 && j < c.lines.length && c.markers[j]) {
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      let sameParagraph = true;
      for (let k = lo; k <= hi; k++) if (pyStrip(c.lines[k] ?? "") === "") sameParagraph = false;
      if (sameParagraph) return "C:paragraph-window";
    }
  }
  if (!isMarkdown && c.ctx[i]) return "E:context-key";
  return undefined;
}
