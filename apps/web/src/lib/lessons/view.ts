// skill_lessons.body (the validated lesson file) -> LessonView (API schema, 00a K8). An allow-list: only the
// named fields are copied, so file-only fields (provenance, licence notes, authoring status) never leave the
// server. A body that does not have the expected shape gives null; the sync validates files before storing them,
// so that means a row someone edited by hand, and the caller then serves no lesson instead of a broken one.
import type { components } from "@polymath/shared-types";

export type LessonView = components["schemas"]["LessonView"];
type Rec = Record<string, unknown>;

const rec = (v: unknown): Rec | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const list = (v: unknown, min: number, max: number): Rec[] | null => {
  if (!Array.isArray(v) || v.length < min || v.length > max) return null;
  const out = v.map(rec);
  return out.every((x): x is Rec => x !== null) ? out : null;
};

export function toLessonView(skillKey: string, version: number, body: unknown, variant: LessonView["variant"]): LessonView | null {
  const b = rec(body);
  if (!b) return null;
  const est = b["est_seconds"];
  const recap = str(b["recap_md"]);
  const m = rec(b["misconception"]);
  const screensRaw = list(b["screens"], 1, 3);
  const checksRaw = list(b["checks"], 1, 2);
  if (typeof est !== "number" || !recap || !m || !screensRaw || !checksRaw) return null;
  const tag = str(m["tag"]);
  const wrong = str(m["wrong_idea_md"]);
  const tempting = str(m["why_tempting_md"]);
  const correct = str(m["correct_idea_md"]);
  if (!tag || !wrong || !tempting || !correct) return null;

  const screens: LessonView["screens"] = [];
  for (const s of screensRaw) {
    const id = str(s["id"]);
    const title = str(s["title"]);
    const bodyMd = str(s["body_md"]);
    if (!id || !title || !bodyMd) return null;
    const screen: LessonView["screens"][number] = { id, title, body_md: bodyMd };
    const figure = rec(s["figure"]);
    if (figure) {
      const svg = str(figure["svg"]);
      const alt = str(figure["alt"]);
      if (!svg || !alt) return null;
      screen.figure = { svg, alt };
    }
    screens.push(screen);
  }

  const checks: LessonView["checks"] = [];
  for (const c of checksRaw) {
    const id = str(c["id"]);
    const stem = str(c["stem_md"]);
    const optionsRaw = list(c["options"], 2, 4);
    if (!id || !stem || !optionsRaw) return null;
    const options: LessonView["checks"][number]["options"] = [];
    for (const o of optionsRaw) {
      const oid = str(o["id"]);
      const text = str(o["text_md"]);
      const feedback = str(o["feedback_md"]);
      if (!oid || !text || !feedback || typeof o["correct"] !== "boolean") return null;
      options.push({ id: oid, text_md: text, correct: o["correct"], feedback_md: feedback });
    }
    checks.push({ id, stem_md: stem, options });
  }

  return {
    skill_key: skillKey,
    version,
    variant,
    est_seconds: est,
    screens,
    misconception: { tag, wrong_idea_md: wrong, why_tempting_md: tempting, correct_idea_md: correct },
    checks,
    recap_md: recap,
  };
}
