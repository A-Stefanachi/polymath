// BL-0186 / 00a G1 / doc 06 section 6.1: the placement grace satisfies min_tier up to L1 for the frontier test only.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { computeAvailable, computeFrontier, prereqSatisfied } from "./frontier.ts";
import type { GraphEdge, SkillGraph, SkillStateSnapshot } from "./types.ts";

const A = "math.alg.a";
const B = "math.alg.b";

function graph(min_tier: GraphEdge["min_tier"]): SkillGraph {
  return {
    skills: {
      [A]: { node: "math", module: "alg", est_minutes: 30, tier_target: "L1" },
      [B]: { node: "math", module: "alg", est_minutes: 30, tier_target: "L1" },
    },
    edges: [{ from: A, to: B, strength: "hard", min_tier }],
  };
}

const placed = (age: number, extra: Partial<SkillStateSnapshot> = {}): SkillStateSnapshot => ({
  mastery_state: "reviewing",
  source: "placement",
  retrievability: 0.4,
  tier_attained: "L0",
  placement_age_days: age,
  ...extra,
});

describe("placement grace in the frontier (G1)", () => {
  it("offers the dependent skill at day 10 and not at day 15 with R 0.4 and min_tier L1", () => {
    const g = graph("L1");
    expect(computeAvailable(g, { [A]: placed(10) })).toContain(B);
    expect(computeAvailable(g, { [A]: placed(15) })).not.toContain(B);
    expect(computeFrontier(g, { [A]: placed(10) })).toContain(B);
    expect(computeFrontier(g, { [A]: placed(15) })).not.toContain(B);
  });

  it("keeps a hard edge at min_tier L2 locked inside the grace window", () => {
    expect(computeAvailable(graph("L2"), { [A]: placed(10) })).not.toContain(B);
  });

  it("ends the grace after a failed verify retrieval or a verification review", () => {
    const g = graph("L1");
    expect(computeAvailable(g, { [A]: placed(3, { placement_verify_failed: true }) })).not.toContain(B);
    expect(computeAvailable(g, { [A]: placed(3, { verified_after_placement: true }) })).not.toContain(B);
  });

  it("does not stretch the grace to a non-placement source", () => {
    expect(computeAvailable(graph("L1"), { [A]: placed(3, { source: "practice" }) })).not.toContain(B);
  });

  it("never changes the placement skill's state: tier stays at most L0 and it is never mastered", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 40 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.constantFrom<GraphEdge["min_tier"]>(null, "L0", "L1", "L2", "L3"),
        (age, r, minTier) => {
          const state = Object.freeze(placed(age, { retrievability: r }));
          const states = { [A]: state };
          const g = graph(minTier);
          computeAvailable(g, states);
          computeFrontier(g, states);
          prereqSatisfied(state, { min_tier: minTier });
          expect(state.tier_attained).toBe("L0");
          expect(state.mastery_state).not.toBe("mastered");
          // Grace never grants more than L1: any min_tier above L1 stays locked while R is below the threshold.
          if ((minTier === "L2" || minTier === "L3") && r < 0.8) {
            expect(prereqSatisfied(state, { min_tier: minTier })).toBe(false);
          }
        },
      ),
    );
  });
});
