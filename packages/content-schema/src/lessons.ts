// Concept primers (lessons, 00a K6; doc 07 section 15). Cross-file rules L-G1 of
// polymath-app-spec/reference/validate_lessons.py, as pure functions: the caller reads the files, the graph
// and the templates and passes in what the rules need. Rule ids are LG1-*.
import { svgProblems } from "./svg.ts";

export const MAX_SCREEN_WORDS = 150;
export const MAX_RECAP_WORDS = 60;

export type LessonContext = {
  /** Base name of the file, for example `elec.dc.ohms-law.yaml`. */
  fileName: string;
  /** Every skill of the graph by key; `stub` marks stubs. */
  skills: ReadonlyMap<string, { stub: boolean }>;
  /** Misconception tags that the templates of each skill declare. */
  tags: ReadonlyMap<string, ReadonlySet<string>>;
};
export type LessonProblem = { rule: string; message: string };

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : {});
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? v.map(rec) : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Word count of Markdown text with inline and display math counted as one word each. */
export function lessonWords(text: string): number {
  const plain = text.replace(/\$\$.*?\$\$|\$[^$]*\$/gs, " m ");
  return (plain.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g) ?? []).length;
}

function duplicates(ids: string[]): boolean {
  return new Set(ids).size !== ids.length;
}

/** L-G1 on a document that already passed L-G0 (validateLesson). */
export function lessonProblems(doc: unknown, ctx: LessonContext): LessonProblem[] {
  const d = rec(doc);
  const out: LessonProblem[] = [];
  const add = (rule: string, message: string): void => void out.push({ rule, message });
  const key = str(d["skill_key"]);
  if (ctx.fileName !== `${key}.yaml`) add("LG1-FILE", `file name must be ${key}.yaml`);
  const skill = ctx.skills.get(key);
  if (!skill) add("LG1-SKILL", `skill ${key} is not in content/mvp-skill-graph.yaml`);
  else if (skill.stub) add("LG1-STUB", `skill ${key} is a stub; stubs are never taught`);
  const screens = arr(d["screens"]);
  if (duplicates(screens.map((s) => str(s["id"])))) add("LG1-IDS", "screen ids are not unique");
  for (const s of screens) {
    const n = lessonWords(str(s["body_md"]));
    if (n > MAX_SCREEN_WORDS) add("LG1-WORDS", `screen ${str(s["id"])} has ${String(n)} words (max ${String(MAX_SCREEN_WORDS)})`);
    const figure = rec(s["figure"]);
    if ("svg" in figure) for (const p of svgProblems(str(figure["svg"]))) add("LG1-SVG", `screen ${str(s["id"])}: ${p}`);
  }
  const recap = lessonWords(str(d["recap_md"]));
  if (recap > MAX_RECAP_WORDS) add("LG1-WORDS", `recap has ${String(recap)} words (max ${String(MAX_RECAP_WORDS)})`);
  const checks = arr(d["checks"]);
  if (duplicates(checks.map((c) => str(c["id"])))) add("LG1-IDS", "check ids are not unique");
  for (const c of checks) {
    const figure = rec(c["figure"]); // 00a M5: checks may carry a figure too
    if ("svg" in figure) for (const p of svgProblems(str(figure["svg"]))) add("LG1-SVG", `check ${str(c["id"])}: ${p}`);
    const options = arr(c["options"]);
    if (duplicates(options.map((o) => str(o["id"])))) add("LG1-IDS", `check ${str(c["id"])}: option ids are not unique`);
    const correct = options.filter((o) => o["correct"] === true).length;
    if (correct !== 1) add("LG1-CORRECT", `check ${str(c["id"])}: ${String(correct)} correct options (exactly 1 required)`);
  }
  const known = ctx.tags.get(key);
  const tag = str(rec(d["misconception"])["tag"]);
  if (known && known.size > 0 && !known.has(tag))
    add("LG1-TAG", `misconception tag ${tag} matches no template of ${key} (known: ${[...known].sort().join(", ")})`);
  return out;
}
