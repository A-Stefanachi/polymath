import { describe, expect, it } from "vitest";
import { packSelfExplanation, SELF_EXPLANATION_MAX, shuffled } from "./self-explanation";

describe("packSelfExplanation (BL-0199, 00a K4)", () => {
  it("is undefined with no picks and no text, so completeTask omits the field (minLength 1)", () => {
    expect(packSelfExplanation([], "   ")).toBeUndefined();
  });

  it("lists each pick and the trimmed note", () => {
    const out = packSelfExplanation([{ id: "s1", picked: "Find the current", right: true }, { id: "s2", picked: "Add", right: false }], " same current ");
    expect(out).toBe("s1: Find the current (matched)\ns2: Add (other)\nNote: same current");
  });

  it("never exceeds the 2000-character API limit", () => {
    expect(packSelfExplanation([], "x".repeat(5000))?.length).toBe(SELF_EXPLANATION_MAX);
  });
});

describe("shuffled", () => {
  it("keeps every element and does not touch the input", () => {
    const input = ["a", "b", "c", "d"];
    const out = shuffled(input, () => 0);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual(["a", "b", "c", "d"]);
  });
});
