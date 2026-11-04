// BL-0046 (FR-024): `max_new_frontier` is the number of new skills still allowed today.
import { describe, expect, it } from "vitest";
import { packSession, type PackInput } from "./pack.ts";
import { sampleGraph } from "./sample-graph.ts";

const base: PackInput = { context: "desktop", session_type: "focus", available_minutes: 120, graph: sampleGraph(), states: {} };
const newSkills = (input: PackInput): string[] => [
  ...new Set(packSession(input).tasks.filter((t) => t.reason === "new_frontier").map((t) => t.skill_key ?? "")),
];

describe("max_new_frontier", () => {
  it("adds at most the allowance of new skills, and none at 0 (AC-1)", () => {
    const uncapped = newSkills(base).length;
    expect(uncapped).toBeGreaterThanOrEqual(2);
    expect(newSkills({ ...base, max_new_frontier: 2 })).toHaveLength(2);
    expect(newSkills({ ...base, max_new_frontier: 1 })).toHaveLength(1);
    expect(newSkills({ ...base, max_new_frontier: 0 })).toHaveLength(0);
  });
  it("does not change the plan when absent or larger than the session slots", () => {
    expect(packSession({ ...base, max_new_frontier: 99 })).toEqual(packSession(base));
  });
});
