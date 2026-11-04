// BL-0200: G0 (Ajv) and the cross-file rules L-G1 of doc 07 section 15 for concept primers, against the
// sample lesson and in-code mutations of it. Agreement with reference/validate_lessons.py is tested in
// tools/content-lint/test/lessons.test.ts, which has the files and the oracle at hand.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { lessonProblems, lessonWords, validateLesson, type LessonContext } from "./index.ts";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SAMPLE = path.join(REPO, "polymath-app-spec", "content", "lessons", "elec.dc.ohms-law.yaml");

// The fields these tests mutate; the file is parsed from YAML and the shape is checked by validateLesson itself.
type Option = { id: string; correct: boolean };
type Screen = { id: string; body_md: string; figure: { svg: string } };
type Check = { id: string; options: [Option, Option, ...Option[]] };
type Doc = {
  skill_key: string;
  est_seconds: number;
  recap_md: string;
  extra?: number;
  misconception: { tag: string };
  // Tuples: the sample has several screens, checks and options, so fixed indexes are defined.
  screens: [Screen, Screen, ...Screen[]];
  checks: [Check, Check, ...Check[]];
};

const base = (): Doc => structuredClone(parse(readFileSync(SAMPLE, "utf8"), { schema: "core" }) as Doc);
const ctx = (over: Partial<LessonContext> = {}): LessonContext => ({
  fileName: "elec.dc.ohms-law.yaml",
  skills: new Map([["elec.dc.ohms-law", { stub: false }], ["sw.tools.git-branching", { stub: true }]]),
  tags: new Map([["elec.dc.ohms-law", new Set(["mc.ohm-milliamps-as-amps"])]]),
  ...over,
});
const rules = (doc: Doc, c = ctx()): string[] => lessonProblems(doc, c).map((p) => p.rule);
const words = (n: number): string => Array.from({ length: n }, () => "word").join(" ");

describe("L-G0: lesson.schema.json through Ajv", () => {
  it("the sample lesson is valid and has no cross-file problem", () => {
    expect(validateLesson(base()).errors).toEqual([]);
    expect(lessonProblems(base(), ctx())).toEqual([]);
  });
  it("est_seconds 10 is accepted and 9 rejected; 180 accepted and 181 rejected", () => {
    for (const [v, ok] of [[10, true], [9, false], [180, true], [181, false]] as const) {
      const d = base();
      d.est_seconds = v;
      expect(validateLesson(d).valid, String(v)).toBe(ok);
    }
  });
  it("3 screens are accepted and 4 rejected; 2 checks accepted and 3 rejected", () => {
    const d = base();
    d.screens.push({ ...d.screens[0], id: "extra" });
    expect(validateLesson(d).valid).toBe(false);
    const e = base();
    e.checks.push({ ...e.checks[0], id: "third" });
    expect(validateLesson(e).valid).toBe(false);
  });
  it("an unknown property is rejected", () => {
    const d = base();
    d.extra = 1;
    expect(validateLesson(d).valid).toBe(false);
  });
});

describe("L-G1: cross-file rules", () => {
  it("LG1-FILE: the file name must equal the skill key", () => {
    expect(rules(base(), ctx({ fileName: "elec.dc.other.yaml" }))).toEqual(["LG1-FILE"]);
  });
  it("LG1-SKILL: an unknown skill is reported", () => {
    expect(rules(base(), ctx({ skills: new Map() }))).toContain("LG1-SKILL");
  });
  it("LG1-STUB: a stub skill is never taught", () => {
    const d = base();
    d.skill_key = "sw.tools.git-branching";
    expect(rules(d, ctx({ fileName: "sw.tools.git-branching.yaml", tags: new Map() }))).toEqual(["LG1-STUB"]);
  });
  it("LG1-WORDS: a screen of 150 words passes and 151 fails; a recap of 60 passes and 61 fails", () => {
    const d = base();
    d.screens[0].body_md = words(150);
    d.recap_md = words(60);
    expect(rules(d)).toEqual([]);
    d.screens[0].body_md = words(151);
    expect(rules(d)).toEqual(["LG1-WORDS"]);
    d.screens[0].body_md = words(150);
    d.recap_md = words(61);
    expect(rules(d)).toEqual(["LG1-WORDS"]);
  });
  it("LG1-WORDS: inline and display math count as one word each", () => {
    expect(lessonWords("Use $a very long expression here$ and $$x = y + z$$ now")).toBe(5);
  });
  it("LG1-IDS: duplicate screen, check and option ids are reported", () => {
    const a = base();
    a.screens[1].id = a.screens[0].id;
    const b = base();
    b.checks[1].id = b.checks[0].id;
    const c = base();
    c.checks[0].options[1].id = c.checks[0].options[0].id;
    for (const d of [a, b, c]) expect(rules(d)).toEqual(["LG1-IDS"]);
  });
  it("LG1-CORRECT: exactly one correct option per check (0 and 2 fail)", () => {
    const none = base();
    none.checks[0].options[0].correct = false;
    const two = base();
    two.checks[0].options[1].correct = true;
    expect(rules(none)).toEqual(["LG1-CORRECT"]);
    expect(rules(two)).toEqual(["LG1-CORRECT"]);
  });
  it("LG1-TAG: the tag must match a template tag of the skill, and is free when the skill has none", () => {
    const d = base();
    d.misconception.tag = "mc.something-else";
    expect(rules(d)).toEqual(["LG1-TAG"]);
    expect(rules(d, ctx({ tags: new Map() }))).toEqual([]);
  });
  it.each([
    ["script element", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ["foreignObject", '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>'],
    ["event attribute", '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"/>'],
    ["external href", '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://example.test/x"/></svg>'],
    ["external url()", '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://example.test/x)"/></svg>'],
    ["image element", '<svg xmlns="http://www.w3.org/2000/svg"><image/></svg>'],
    ["not well-formed", '<svg xmlns="http://www.w3.org/2000/svg"><g></svg>'],
    ["wrong root", "<div/>"],
    ["undefined entity", '<svg xmlns="http://www.w3.org/2000/svg"><text>&nbsp;</text></svg>'],
    ["two roots", "<svg/><svg/>"],
  ])("LG1-SVG: %s is reported", (_name, svg) => {
    const d = base();
    d.screens[1].figure.svg = svg;
    expect(rules(d)).toEqual(["LG1-SVG"]);
  });
  it("LG1-SVG: a local href and a local url() are allowed", () => {
    const d = base();
    d.screens[1].figure.svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><a href="#g"/></svg>';
    expect(rules(d)).toEqual([]);
  });
});
