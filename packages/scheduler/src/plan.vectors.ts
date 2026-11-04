// Vector handlers for weekly_plan_slots and rebalance (BL-0038). Mirror run_vector in the reference.
import { rebalance, weeklyPlanSlots, type PlanSlot } from "./plan.ts";
import type { VectorHandlers } from "./vector-registry.ts";

export const vectorHandlers: VectorHandlers = {
  weekly_plan_slots: (i) => weeklyPlanSlots(i["weekly_minutes"] as number),
  rebalance: (i) =>
    rebalance(i["slots"] as PlanSlot[], i["today_idx"] as number, i["weekly_minutes"] as number),
};
