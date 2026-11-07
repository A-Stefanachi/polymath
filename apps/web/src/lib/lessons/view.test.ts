// toLessonView (00a K8) with a figure on a check (00a M5): copied like a screen figure, and a broken one gives null.
import { describe, expect, it } from "vitest";
import { toLessonView } from "./view.ts";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>';
const body = (checkFigure?: unknown) => ({
  est_seconds: 60,
  screens: [{ id: "why", title: "Why", body_md: "Because." }],
  misconception: { tag: "mc.x", wrong_idea_md: "Wrong.", why_tempting_md: "Tempting.", correct_idea_md: "Right." },
  checks: [
    {
      id: "c1",
      stem_md: "Pick.",
      ...(checkFigure === undefined ? {} : { figure: checkFigure }),
      options: [
        { id: "a", text_md: "A", correct: true, feedback_md: "Yes." },
        { id: "b", text_md: "B", correct: false, feedback_md: "No." },
      ],
    },
  ],
  recap_md: "Recap.",
  provenance: { authors: ["secret-author"] },
});

describe("toLessonView check figures (00a M5)", () => {
  it("copies a check's figure (svg and alt) into the view", () => {
    const view = toLessonView("math.x.y", 1, body({ svg, alt: "A small test drawing" }), "full");
    expect(view?.checks[0]?.figure).toEqual({ svg, alt: "A small test drawing" });
    expect(JSON.stringify(view)).not.toContain("secret-author");
  });

  it("leaves a check without a figure without one", () => {
    expect(toLessonView("math.x.y", 1, body(), "full")?.checks[0]).not.toHaveProperty("figure");
  });

  it("gives null for a check figure without alt text, as for a broken screen figure", () => {
    expect(toLessonView("math.x.y", 1, body({ svg }), "full")).toBeNull();
  });
});
