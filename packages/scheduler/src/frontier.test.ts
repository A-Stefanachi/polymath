// Boundary and property tests for the frontier (BL-0036); the shared vectors (frontier.vectors.ts) cover the oracle.
import { describe, expect, it } from "vitest";
import { computeAvailable, computeFrontier, frontierScores, lockedReasons, prereqSatisfied, projectPull } from "./frontier.ts";
import { sampleGraph } from "./sample-graph.ts";
import type { SkillGraph, SkillStateSnapshot } from "./types.ts";

const hard = { min_tier: null };

describe("prereqSatisfied limits", () => {
  it("accepts R 0.8 and rejects 0.79 for a reviewing prerequisite", () => {
    expect(prereqSatisfied({ mastery_state: "reviewing", retrievability: 0.8 }, hard)).toBe(true);
    expect(prereqSatisfied({ mastery_state: "reviewing", retrievability: 0.79 }, hard)).toBe(false);
  });
  it("uses the continue threshold 0.7 under hysteresis", () => {
    expect(prereqSatisfied({ mastery_state: "reviewing", retrievability: 0.7 }, hard, true)).toBe(true);
    expect(prereqSatisfied({ mastery_state: "reviewing", retrievability: 0.69 }, hard, true)).toBe(false);
  });
  it("applies placement grace on day 14 and not on day 15", () => {
    const s = (age: number): SkillStateSnapshot => ({
      mastery_state: "reviewing",
      source: "placement",
      retrievability: 0.1,
      tier_attained: "L0",
      placement_age_days: age,
    });
    expect(prereqSatisfied(s(14), { min_tier: "L1" })).toBe(true);
    expect(prereqSatisfied(s(15), { min_tier: "L1" })).toBe(false);
    expect(prereqSatisfied(s(14), { min_tier: "L2" })).toBe(false);
  });
});

describe("stub skills", () => {
  it("never appear in available or frontier", () => {
    const g = sampleGraph();
    const root = g.skills["sw.c.variables"];
    if (root === undefined) throw new Error("sample graph changed");
    const stub: SkillGraph = { ...g, skills: { ...g.skills, "sw.c.variables": { ...root, status: "stub" } } };
    expect(computeAvailable(stub, {})).not.toContain("sw.c.variables");
    expect(computeFrontier(stub, {})).not.toContain("sw.c.variables");
    expect(computeFrontier(g, {})).toContain("sw.c.variables");
  });
});

describe("lockedReasons", () => {
  it("lists unmet hard prerequisites with their current state", () => {
    const g = sampleGraph();
    const states: Record<string, SkillStateSnapshot> = {
      "elec.dc.voltage-divider": { mastery_state: "mastered", retrievability: 0.9, tier_attained: "L0" },
    };
    expect(lockedReasons(g, states, "elec.rc.rc-time-constant")).toEqual([
      { prerequisite: "elec.dc.voltage-divider", mastery_state: "mastered", retrievability: 0.9, tier_attained: "L0", min_tier: "L1" },
      { prerequisite: "math.calc.exponential-decay", mastery_state: "unseen", retrievability: null, tier_attained: null, min_tier: null },
    ]);
  });
  it("is empty for a root skill", () => {
    expect(lockedReasons(sampleGraph(), {}, "sw.c.variables")).toEqual([]);
  });
});

describe("projectPull and frontierScores", () => {
  it("takes the maximum pull over several step skills", () => {
    const p = projectPull(sampleGraph(), ["sw.fw.adc-reading", "sw.fw.gpio"]);
    expect(p["sw.fw.gpio"]).toBe(1);
    expect(p["sw.fw.adc-reading"]).toBe(1);
  });
  it("puts a skill with more than half its soft prerequisites unmet last", () => {
    const g = sampleGraph();
    const scores = frontierScores(g, {}, ["sw.fw.gpio", "sw.c.variables"], { "sw.fw.gpio": 1 }, {});
    expect(scores.map((s) => s.key)).toEqual(["sw.c.variables", "sw.fw.gpio"]);
    expect(scores[1]?.unmet_soft).toBe(1);
  });
});

// Seeded generator keeps the property test reproducible without a new dependency.
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("property: no frontier skill has an unmet hard prerequisite", () => {
  it("holds for 300 random learner states", () => {
    const g = sampleGraph();
    const rand = rng(36);
    const names = ["unseen", "learning", "reviewing", "mastered", "decayed"];
    const tiers = ["L0", "L1", "L2"];
    for (let n = 0; n < 300; n += 1) {
      const states: Record<string, SkillStateSnapshot> = {};
      for (const k of Object.keys(g.skills)) {
        if (rand() < 0.3) continue;
        states[k] = {
          mastery_state: names[Math.floor(rand() * names.length)] as string,
          retrievability: rand(),
          tier_attained: tiers[Math.floor(rand() * tiers.length)] as "L0",
        };
        if (rand() < 0.3) states[k] = { ...states[k], source: "placement", placement_age_days: Math.floor(rand() * 30) };
      }
      const learning = Object.keys(states).filter((k) => states[k]?.mastery_state === "learning");
      for (const key of computeFrontier(g, states)) {
        expect(["unseen", "learning"]).toContain(states[key]?.mastery_state ?? "unseen");
        expect(lockedReasons(g, states, key, undefined, learning.includes(key))).toEqual([]);
      }
    }
  });
});
