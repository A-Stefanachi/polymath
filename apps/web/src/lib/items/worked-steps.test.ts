// BL-0198 (00a K2, K3): which steps a worked example or faded problem shows.
import { describe, expect, it } from "vitest";
import { fadedStepCount, workedStepsFor } from "./worked-steps.ts";

describe("fadedStepCount (00a K3)", () => {
  // [steps, shown for the 1st faded task, shown for the 2nd, shown for a later one]
  it.each([
    [2, 1, 1, 1],
    [3, 2, 2, 2],
    [4, 2, 1, 1],
    [5, 2, 1, 1],
    [6, 3, 1, 1],
  ] as const)("%i steps: first %i, second %i, third %i shown", (n, first, second, third) => {
    expect(fadedStepCount(n, 0)).toBe(first);
    expect(fadedStepCount(n, 1)).toBe(second);
    expect(fadedStepCount(n, 2)).toBe(third);
  });

  it("never shows the final step", () => {
    for (let n = 2; n <= 8; n++) for (let k = 0; k < 4; k++) expect(fadedStepCount(n, k)).toBeLessThan(n);
  });
});

describe("workedStepsFor (00a K2)", () => {
  const solution = {
    steps: [
      { id: "s1", text_md: "one", label: "Set up", secret: "x" },
      { id: "s2", text_md: "two" },
      { id: "s3", text_md: "three" },
    ],
    explanation_md: "Use the divider.",
  };

  it("worked_example: every step, steps_total and explanation_md; unknown keys are dropped", () => {
    const r = workedStepsFor(solution, "worked_example", 0);
    expect(r).toEqual({
      worked_steps: [{ id: "s1", label: "Set up", text_md: "one" }, { id: "s2", text_md: "two" }, { id: "s3", text_md: "three" }],
      steps_total: 3,
      explanation_md: "Use the divider.",
    });
  });

  it("faded_problem: leading steps only, total counts all, no explanation_md", () => {
    const r = workedStepsFor(solution, "faded_problem", 0);
    expect(r?.worked_steps.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(r?.steps_total).toBe(3);
    expect(r).not.toHaveProperty("explanation_md");
  });

  it.each(["retrieval", "problem", "checkpoint", "diagnostic"])("%s: no steps", (kind) => {
    expect(workedStepsFor(solution, kind, 0)).toBeNull();
  });

  it("returns null for a missing or malformed solution", () => {
    expect(workedStepsFor(null, "worked_example", 0)).toBeNull();
    expect(workedStepsFor({ steps: [] }, "worked_example", 0)).toBeNull();
    expect(workedStepsFor({ steps: "x" }, "worked_example", 0)).toBeNull();
  });

  it("a faded problem with one step shows nothing rather than the last step", () => {
    expect(workedStepsFor({ steps: [{ id: "a", text_md: "only" }] }, "faded_problem", 0)).toBeNull();
  });
});
