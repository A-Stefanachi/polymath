// multiple_choice grader, doc 08 section 2.3.
import { describe, expect, it } from "vitest";
import { gradeMultipleChoice, type McKey } from "./index.ts";

const key: McKey = {
  correct_option_id: "b",
  options: [
    { id: "a", misconception_tag: "mc.swapped-resistors", feedback_md: "That is the drop across R1." },
    { id: "b" },
    { id: "c", misconception_tag: null, feedback_md: null },
    { id: "d", misconception_tag: "mc.no-feedback" },
  ],
};

describe("gradeMultipleChoice", () => {
  it("scores the correct option 1 with no tags", () => {
    expect(gradeMultipleChoice("b", key)).toEqual({
      score: 1,
      correct: true,
      graders: [{ type: "multiple_choice", score: 1, detail: { option_id: "b" } }],
      feedback: "Correct.",
      misconception_tags: [],
    });
  });

  it("scores a wrong option 0 and returns its tag and feedback", () => {
    expect(gradeMultipleChoice("a", key)).toMatchObject({
      score: 0,
      correct: false,
      feedback: "That is the drop across R1.",
      misconception_tags: ["mc.swapped-resistors"],
    });
  });

  it("falls back to default feedback and no tag when the distractor has none", () => {
    expect(gradeMultipleChoice("c", key)).toMatchObject({
      correct: false,
      feedback: "Not quite. Check your method and units.",
      misconception_tags: [],
    });
    expect(gradeMultipleChoice("d", key).misconception_tags).toEqual(["mc.no-feedback"]);
  });

  it("returns invalid_input for an option that was not shown, and does not reveal the answer", () => {
    const r = gradeMultipleChoice("zzz", key);
    expect(r).toMatchObject({ score: 0, correct: false, status: "invalid_input", misconception_tags: [] });
    expect(JSON.stringify(r)).not.toContain('"b"');
  });

  it("does not match option ids by prefix or case", () => {
    expect(gradeMultipleChoice("B", key).status).toBe("invalid_input");
    expect(gradeMultipleChoice("", key).status).toBe("invalid_input");
  });

  it("flags an answer after the time limit as late but grades it normally", () => {
    const limit = { time_limit_s: 5 };
    const atLimit = gradeMultipleChoice("b", key, { ...limit, latency_ms: 5000 });
    const past = gradeMultipleChoice("b", key, { ...limit, latency_ms: 5001 });
    expect(atLimit.graders[0]?.detail).not.toHaveProperty("late");
    expect(past.graders[0]?.detail).toMatchObject({ late: true });
    expect(past).toMatchObject({ score: 1, correct: true });
  });
});
