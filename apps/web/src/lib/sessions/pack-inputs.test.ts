// BL-0046 pure parts: the daily cap bounds (PRM-15, 1 to 6, default 3) and the backlog thresholds (06 section 7.5).
import { describe, expect, it } from "vitest";
import { backlogFlag, dailyCap, newSkillAllowance } from "./pack-inputs.ts";

describe("dailyCap", () => {
  it("accepts 1 and 6, and falls back to 3 for 0, 7, fractions and non-numbers", () => {
    expect([1, 2, 6].map(dailyCap)).toEqual([1, 2, 6]);
    expect([0, 7, 2.5, "3", null, undefined].map(dailyCap)).toEqual([3, 3, 3, 3, 3, 3]);
  });
  it("allows what is left of the cap today and never less than 0", () => {
    expect(newSkillAllowance({ maxNewSkillsPerDay: 2, newSkillsToday: 1 })).toBe(1);
    expect(newSkillAllowance({ maxNewSkillsPerDay: 2, newSkillsToday: 2 })).toBe(0);
    expect(newSkillAllowance({ maxNewSkillsPerDay: 2, newSkillsToday: 5 })).toBe(0);
    expect(newSkillAllowance({ maxNewSkillsPerDay: null, newSkillsToday: 0 })).toBe(3);
  });
});

describe("backlogFlag", () => {
  it("sets above 120 review minutes (81 skills), not at 120 (80)", () => {
    expect(backlogFlag(80, false)).toBe(false);
    expect(backlogFlag(81, false)).toBe(true);
  });
  it("holds until the load falls below 60 minutes (40 skills)", () => {
    expect(backlogFlag(40, true)).toBe(true);
    expect(backlogFlag(39, true)).toBe(false);
    expect(backlogFlag(40, false)).toBe(false);
  });
});
