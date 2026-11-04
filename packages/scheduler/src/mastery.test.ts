// Boundary tests for the mastery functions; the shared vectors (mastery.vectors.ts) cover the oracle.
import { describe, expect, it } from "vitest";
import { aggregateAttempts, isQualifying, masteryRule, masteryState, tierAttained, type MasteryAttempt } from "./mastery.ts";

function att(n: number, over: Partial<MasteryAttempt> = {}): MasteryAttempt {
  return {
    item_id: `i${n}`,
    item_tier: "L1",
    template_key: `t${n % 2}`,
    task_kind: "problem",
    grader_type: "exact_numeric",
    score: 1,
    max_hint_level: 0,
    unaided: true,
    submitted_at: `2026-10-${String(10 + n).padStart(2, "0")}T09:00:00Z`,
    ...over,
  };
}

describe("isQualifying limits", () => {
  it("accepts hint level 1 and score 0.8, rejects hint level 2 and score 0.79", () => {
    expect(isQualifying(att(1, { max_hint_level: 1, score: 0.8 }), "L1")).toBe(true);
    expect(isQualifying(att(1, { max_hint_level: 2 }), "L1")).toBe(false);
    expect(isQualifying(att(1, { score: 0.79 }), "L1")).toBe(false);
  });
  it("requires unaided and a verified item, and an item tier at least the tier", () => {
    expect(isQualifying(att(1, { unaided: false }), "L1")).toBe(false);
    expect(isQualifying(att(1, { verified: false }), "L1")).toBe(false);
    expect(isQualifying(att(1, { item_tier: "L0" }), "L1")).toBe(false);
  });
});

describe("masteryRule limits", () => {
  it("is met with 3 qualifying attempts spanning exactly 2 days, not with 2 or a 1-day span", () => {
    expect(masteryRule([att(1), att(2), att(3)], "L1").met).toBe(true);
    expect(masteryRule([att(1), att(2)], "L1").checks.count).toBe(false);
    const short = masteryRule([att(1), att(2), att(2, { item_id: "x" })], "L1");
    expect(short.checks.days).toBe(false); // 2 days with a 1-day span
  });
  it("uses the learner-local calendar day", () => {
    const a = [att(1, { submitted_at: "2026-10-11T23:30:00Z" }), att(2, { submitted_at: "2026-10-12T00:30:00Z" })];
    const rule = masteryRule([...a, att(3, { submitted_at: "2026-10-13T12:00:00Z" })], "L1", { tzOffsetMin: -60 });
    expect(rule.days).toBe(2);
  });
  it("needs 2 templates only when the skill has 2 or more verified templates", () => {
    const one = [1, 2, 3].map((n) => att(n, { template_key: "t" }));
    expect(masteryRule(one, "L1", { nVerifiedTemplates: 1 }).met).toBe(true);
    expect(masteryRule(one, "L1", { nVerifiedTemplates: 2 }).checks.variants).toBe(false);
  });
});

describe("masteryState", () => {
  const base = { tier: "L1", retrievability: 0.9, everMastered: false, lastRating: 3 } as const;
  it("is unseen without attempts and learning with one qualifying attempt", () => {
    expect(masteryState({ ...base, attempts: [] })).toBe("unseen");
    expect(masteryState({ ...base, attempts: [att(1)] })).toBe("learning");
  });
  it("is mastered at the rule, but not when retrievability is below 0.7", () => {
    const attempts = [att(1), att(2), att(3)];
    expect(masteryState({ ...base, attempts })).toBe("mastered");
    expect(masteryState({ ...base, attempts, retrievability: 0.69 })).toBe("reviewing");
  });
});

describe("tierAttained", () => {
  it("returns null without evidence and L1 for L1 evidence", () => {
    expect(tierAttained({ attempts: [], checkpointOk: false, spanDays: 0 })).toBeNull();
    expect(tierAttained({ attempts: [att(1), att(2), att(3)], checkpointOk: true, spanDays: 30 })).toBe("L1");
  });
});

describe("aggregateAttempts", () => {
  it("rounds the median latency half to even and keeps the lower median", () => {
    const out = aggregateAttempts([
      { task_kind: "problem", score: 1, max_hint_level: 0, grader_type: "multiple_choice", latency_ms: 1, expected_ms: 2000, confidence: 5 },
      { task_kind: "retrieval", score: 0, max_hint_level: 2, grader_type: "multiple_choice", latency_ms: 3, expected_ms: 2000, confidence: 1 },
    ]);
    expect(out).toMatchObject({ task_kind: "retrieval", score: 0.5, max_hint_level: 2, grader_type: "multiple_choice", confidence: 1 });
    expect(out.latency_ms).toBe(0); // 0.0005 * 1000 = 0.5 rounds to 0
  });
  it("rejects an empty list", () => {
    expect(() => aggregateAttempts([])).toThrow();
  });
});
