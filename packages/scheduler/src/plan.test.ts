// BL-0038 acceptance: weekly plan and rebalance (06 sections 7.8, 7.9). Vectors run in vectors.test.ts.
import { describe, expect, it } from "vitest";
import { rebalance, weeklyPlanSlots, type PlanSlot } from "./plan.ts";

describe("weeklyPlanSlots", () => {
  it("planned total never exceeds the budget for 60..1200 step 30", () => {
    for (let w = 60; w <= 1200; w += 30) {
      const p = weeklyPlanSlots(w);
      expect(p.planned_total_min).toBeLessThanOrEqual(w);
      expect(p.slack_min).toBe(w - p.planned_total_min);
    }
  });
  it("gives 460 planned minutes for the default 480", () => {
    expect(weeklyPlanSlots(480).planned_total_min).toBe(460);
  });
  it("adds a lab at 300 minutes but not at 299", () => {
    expect(weeklyPlanSlots(300).lab.n).toBe(1);
    expect(weeklyPlanSlots(299).lab.n).toBe(0);
  });
});

describe("rebalance", () => {
  const slot = (day: number, type: PlanSlot["type"], min: number, status: PlanSlot["status"]): PlanSlot => ({
    day,
    type,
    min,
    status,
  });
  it("carries half a missed focus (cap 120) when no day is free", () => {
    const slots = [slot(0, "focus", 90, "missed"), slot(1, "lab", 100, "planned"), slot(2, "focus", 60, "planned")];
    const r = rebalance(slots, 6, 480);
    // day 6 is free of focus and lab, so it moves; make it occupied instead
    expect(r.slots[0]?.day).toBe(6);
    const full = [slot(0, "focus", 300, "missed"), slot(5, "focus", 60, "planned"), slot(6, "lab", 60, "planned")];
    const c = rebalance(full, 6, 480);
    expect(c.carry.focus_min).toBe(120);
  });
  it("carries a missed lab fully (cap 240) when every remaining day is busy", () => {
    const slots = [slot(0, "lab", 300, "missed"), slot(6, "micro", 20, "planned")];
    expect(rebalance(slots, 6, 480).carry.lab_min).toBe(240);
  });
  it("does not mutate its input", () => {
    const slots = [slot(5, "lab", 180, "missed")];
    rebalance(slots, 4, 480);
    expect(slots[0]?.status).toBe("missed");
  });
});
