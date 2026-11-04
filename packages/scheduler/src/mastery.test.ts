// Boundary tests for the mastery functions; the shared vectors (mastery.vectors.ts) cover the oracle.
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "./params.ts";
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

describe("BL-0185 span and template diversity (00a G3)", () => {
  const P0 = { ...DEFAULT_PARAMS, mastery_min_span_days: 0 };
  const three = (times: readonly string[], key: (n: number) => string = () => "t") =>
    times.map((s, i) => att(i + 1, { submitted_at: s, template_key: key(i) }));

  it("defaults: span 2 days and 2 templates", () => {
    expect(DEFAULT_PARAMS.mastery_min_span_days).toBe(2);
    expect(DEFAULT_PARAMS.mastery_min_templates).toBe(2);
  });
  it("does not count 23:50 and 00:10 as a 2-day span, and counts a full 2-day gap", () => {
    const gaming = three(["2026-10-10T09:00:00Z", "2026-10-10T23:50:00Z", "2026-10-11T00:10:00Z"]);
    const r = masteryRule(gaming, "L1");
    expect(r.days).toBe(2);
    expect(r.checks.days).toBe(false);
    expect(r.met).toBe(false);
    const ok = three(["2026-10-10T23:50:00Z", "2026-10-11T12:00:00Z", "2026-10-12T00:10:00Z"]);
    expect(masteryRule(ok, "L1").checks.days).toBe(true);
  });
  it("measures the span in learner-local days with a timezone offset (and across a DST change)", () => {
    // UTC days 10 and 12 (span 2). At UTC-2 the last attempt is 23:00 on the 11th (span 1).
    const t = three(["2026-10-10T09:00:00Z", "2026-10-10T12:00:00Z", "2026-10-12T01:00:00Z"]);
    expect(masteryRule(t, "L1", { tzOffsetMin: 0 }).checks.days).toBe(true);
    expect(masteryRule(t, "L1", { tzOffsetMin: -120 }).checks.days).toBe(false);
    // At UTC+2 the first attempt (09:00Z -> 11:00) stays on the 10th and the last (03:00) on the 12th.
    expect(masteryRule(t, "L1", { tzOffsetMin: 120 }).checks.days).toBe(true);
  });
  it("mastery_min_span_days = 0 restores the v1.1 behaviour", () => {
    const gaming = three(["2026-10-10T09:00:00Z", "2026-10-10T23:50:00Z", "2026-10-11T00:10:00Z"]);
    expect(masteryRule(gaming, "L1", { params: P0 }).met).toBe(true);
    expect(masteryRule(gaming, "L1").met).toBe(false);
  });
  it("a single-template skill is not blocked; two templates need a second one used", () => {
    const one = [1, 2, 3].map((n) => att(n, { template_key: "only" }));
    expect(masteryRule(one, "L1", { nVerifiedTemplates: 1 }).met).toBe(true);
    const two = masteryRule(one, "L1", { nVerifiedTemplates: 2 });
    expect(two.met).toBe(false);
    expect(two.checks.variants).toBe(false);
    const used = [att(1, { template_key: "a" }), att(2, { template_key: "b" }), att(3, { template_key: "a" })];
    expect(masteryRule(used, "L1", { nVerifiedTemplates: 2 }).met).toBe(true);
  });
  it("mastery_min_templates = 0 switches the diversity condition off", () => {
    const one = [1, 2, 3].map((n) => att(n, { template_key: "only" }));
    const params = { ...DEFAULT_PARAMS, mastery_min_templates: 0 };
    expect(masteryRule(one, "L1", { nVerifiedTemplates: 3, params }).met).toBe(true);
  });
  it("attempts without a template_key cannot show diversity when 2 templates exist", () => {
    const noKey = [1, 2, 3].map((n) => att(n, { template_key: "" }));
    expect(masteryRule(noKey, "L1", { nVerifiedTemplates: 2 }).checks.variants).toBe(false);
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
