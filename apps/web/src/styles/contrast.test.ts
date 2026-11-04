import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// WCAG 2.2 contrast of the design tokens (BL-0058, doc 09 sections 7 and 10.1). The pairs are read from
// globals.css, so a colour change that breaks AA fails here.
const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");

type Tokens = Record<string, string>;

/** Custom properties declared in the block that follows `selector {` (first match, braces not nested). */
function block(selector: string): Tokens {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const tokens: Tokens = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)) tokens[m[1] as string] = m[2] as string;
  return tokens;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground token, background token]. Text needs 4.5:1.
const TEXT_PAIRS: [string, string][] = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "field"],
  ["ink", "control"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["muted", "control"],
  ["primary", "bg"], // links and the Skip action
  ["primary", "surface"],
  ["on-primary", "primary"],
  ["on-coin", "coin"],
  ["ok", "ok-fill"], // icon and word colour of a correct answer
  ["ink", "ok-fill"],
  ["nq", "nq-fill"],
  ["ink", "nq-fill"],
  ["nq", "surface"], // field error text
  ["bg", "ink"], // current nav item, selected confidence value
];

// Component boundaries, focus ring and shape cues need 3:1 (WCAG 1.4.11).
const UI_PAIRS: [string, string][] = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "field"],
  ["ink", "ok-fill"],
  ["ink", "nq-fill"],
  ["muted", "bg"], // dashed outline of a locked item
  ["focus", "bg"],
  ["focus", "surface"],
  ["primary", "bg"],
  ["primary", "surface"],
];

const themes: Record<string, Tokens> = {
  light: block(":root"),
  dark: block(':root[data-theme="dark"]'),
};

describe.each(Object.entries(themes))("%s theme", (_name, tokens) => {
  it("declares every token used in a pair", () => {
    for (const [a, b] of [...TEXT_PAIRS, ...UI_PAIRS]) {
      expect(tokens[a], a).toBeDefined();
      expect(tokens[b], b).toBeDefined();
    }
  });

  it.each(TEXT_PAIRS)("text %s on %s is at least 4.5:1", (fg, bg) => {
    expect(ratio(tokens[fg] as string, tokens[bg] as string)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)("boundary %s against %s is at least 3:1", (fg, bg) => {
    expect(ratio(tokens[fg] as string, tokens[bg] as string)).toBeGreaterThanOrEqual(3);
  });
});

describe("dark theme", () => {
  it("is declared identically for the system setting and the manual override", () => {
    const media = block(":root:not([data-theme=\"light\"])");
    expect(media).toEqual(themes["dark"]);
  });

  it("defines the same token names as the light theme", () => {
    const names = (t: Tokens) => Object.keys(t).sort();
    expect(names(themes["dark"] as Tokens)).toEqual(names(themes["light"] as Tokens));
  });
});

describe("the ratio helper", () => {
  it("gives 21:1 for black on white and 1:1 for equal colours", () => {
    expect(ratio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(ratio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});
