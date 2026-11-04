// BL-0184 tests: needs_applied derivation (00a G2) and the applied_gap packer slot (doc 06 section 7.4 b2).
// The shared vectors (applied-gap.vectors.ts, pack.vectors.ts) cover the oracle; these cover limits and properties.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { needsApplied } from "./applied-gap.ts";
import { masteryRule, type MasteryAttempt } from "./mastery.ts";
import { packSession, type PackInput, type PackSkillState } from "./pack.ts";
import { DEFAULT_PARAMS, type SchedulerParams } from "./params.ts";
import { sampleGraph } from "./sample-graph.ts";

function att(n: number, over: Partial<MasteryAttempt> = {}): MasteryAttempt {
  return {
    item_id: `i${n}`,
    item_tier: "L1",
    template_key: `t${n % 2}`,
    task_kind: "retrieval",
    grader_type: "exact_numeric",
    score: 1,
    max_hint_level: 0,
    unaided: true,
    submitted_at: `2026-10-${String(10 + n).padStart(2, "0")}T09:00:00Z`,
    ...over,
  };
}
const three = [att(1), att(2), att(3)];

describe("needsApplied (AC-1, 00a G2)", () => {
  it("is true for a reviewing skill whose only gap is the applied attempt", () => {
    expect(needsApplied(three, "L1", "reviewing")).toBe(true);
  });
  it("is false once the applied attempt exists", () => {
    expect(needsApplied([...three, att(4, { task_kind: "problem" })], "L1", "reviewing")).toBe(false);
  });
  it("is false when another condition is also open: 2 attempts (count) vs 3", () => {
    expect(needsApplied(three.slice(0, 2), "L1", "reviewing")).toBe(false);
  });
  it("is false for every state except reviewing", () => {
    for (const s of ["unseen", "learning", "mastered", "decayed"] as const) {
      expect(needsApplied(three, "L1", s)).toBe(false);
    }
  });
  it("is false for an L0 target and when applied is waived or credited", () => {
    expect(needsApplied(three, "L0", "reviewing")).toBe(false);
    expect(needsApplied(three, "L1", "reviewing", { hasApplied: false })).toBe(false);
    expect(needsApplied(three, "L1", "reviewing", { projectCreditApplied: true })).toBe(false);
  });
  it("property: true iff reviewing, applied unmet and every other check met", () => {
    const attArb = fc.record({
      n: fc.integer({ min: 1, max: 15 }),
      kind: fc.constantFrom("retrieval", "problem", "debug_case"),
      score: fc.constantFrom(0, 0.5, 1),
      mc: fc.boolean(),
    });
    fc.assert(
      fc.property(
        fc.array(attArb, { maxLength: 7 }),
        fc.constantFrom("unseen", "learning", "reviewing", "mastered", "decayed"),
        (rows, state) => {
          const attempts = rows
            .map((r, i) =>
              att(r.n, { item_id: `i${i}`, task_kind: r.kind, score: r.score, grader_type: r.mc ? "multiple_choice" : "exact_numeric" }),
            )
            .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
          const c = masteryRule(attempts, "L1").checks;
          const expected =
            state === "reviewing" &&
            !c.applied &&
            c.count && c.days && c.variants && c.last_two_not_failed && c.constructed_response;
          expect(needsApplied(attempts, "L1", state)).toBe(expected);
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("applied_gap packer slot (AC-2, rule b2)", () => {
  const graph = sampleGraph();
  const keys = Object.keys(graph.skills);
  const zero: SchedulerParams = { ...DEFAULT_PARAMS, applied_gap_max: { micro: 0, focus: 0, lab: 0 } };
  const stateArb: fc.Arbitrary<PackSkillState> = fc.record(
    {
      mastery_state: fc.constantFrom("unseen", "learning", "reviewing", "mastered", "decayed"),
      retrievability: fc.double({ min: 0, max: 1, noNaN: true }),
      due: fc.boolean(),
      needs_applied: fc.boolean(),
      tier_attained: fc.constantFrom("L0", "L1"),
    },
    { requiredKeys: [] },
  );
  it("with applied_gap_max all zero the flag changes nothing and no applied_gap task appears", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.constantFrom(...keys), stateArb),
        fc.constantFrom("micro", "focus"),
        fc.integer({ min: 0, max: 200 }),
        (states, session_type, available_minutes) => {
          const base = { graph, context: "desktop", session_type, available_minutes } as unknown as PackInput;
          const flagged = packSession({ ...base, states }, zero);
          const cleared = packSession(
            {
              ...base,
              states: Object.fromEntries(Object.entries(states).map(([k, s]) => [k, { ...s, needs_applied: false }])),
            },
            zero,
          );
          expect(flagged).toEqual(cleared);
          expect(flagged.tasks.some((t) => t.reason === "applied_gap")).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});
