// Weekly plan slots and rebalancing (06 sections 7.8 and 7.9, BL-0038). Pure: the day index of "today"
// is an argument (the caller resolves it in the learner's timezone). Mirrors the reference
// weekly_plan_slots / rebalance.

export interface PlanSlotGroup {
  readonly n: number;
  readonly len_min: number;
}

export interface WeeklyPlan {
  readonly micro: PlanSlotGroup;
  readonly focus: PlanSlotGroup;
  readonly lab: PlanSlotGroup;
  readonly planned_total_min: number;
  readonly slack_min: number;
}

export type PlanSlotType = "micro" | "focus" | "lab";
export type PlanSlotStatus = "done" | "planned" | "missed";

export interface PlanSlot {
  readonly day: number;
  readonly type: PlanSlotType;
  readonly min: number;
  readonly status: PlanSlotStatus;
}

export interface RebalanceResult {
  readonly slots: readonly PlanSlot[];
  readonly carry: { readonly focus_min: number; readonly lab_min: number };
  readonly actions: readonly string[];
  readonly planned_remaining_min: number;
}

const roundTo = (x: number, step: number): number => Math.floor(x / step + 0.5) * step;

/** Default plan is 480 minutes a week. Planned total never exceeds the budget (slack is the rest). */
export function weeklyPlanSlots(weeklyMinutes: number): WeeklyPlan {
  const w = weeklyMinutes;
  const lab = w >= 300 ? Math.min(240, Math.max(120, roundTo(0.375 * w, 30))) : 0;
  const microLen = w >= 360 ? 20 : w >= 150 ? 15 : 10;
  const microN = 5;
  const remaining = w - lab - microN * microLen;
  const focusN = remaining >= 90 ? 2 : remaining >= 45 ? 1 : 0;
  const focusLen =
    focusN > 0 ? Math.min(120, Math.max(45, Math.floor(remaining / focusN / 15) * 15)) : 0;
  const total = lab + microN * microLen + focusN * focusLen;
  return {
    micro: { n: microN, len_min: microLen },
    focus: { n: focusN, len_min: focusLen },
    lab: { n: lab > 0 ? 1 : 0, len_min: lab },
    planned_total_min: total,
    slack_min: w - total,
  };
}

/** Moves or carries missed sessions (06 section 7.9). Input slots are not mutated. */
export function rebalance(
  planSlots: readonly PlanSlot[],
  todayIdx: number,
  weeklyMinutes: number,
): RebalanceResult {
  const slots: PlanSlot[] = planSlots.map((s) => ({ ...s }));
  const actions: string[] = [];
  let carryFocus = 0;
  let carryLab = 0;
  const daysWith = new Map<number, PlanSlotType[]>();
  const has = (d: number, t: PlanSlotType): boolean => daysWith.get(d)?.includes(t) ?? false;
  const add = (d: number, t: PlanSlotType): void => {
    daysWith.set(d, [...(daysWith.get(d) ?? []), t]);
  };
  for (const s of slots) if (s.status !== "missed") add(s.day, s.type);
  const missedMicro = slots.filter((s) => s.status === "missed" && s.type === "micro");

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s === undefined || s.status !== "missed") continue;
    if (s.type === "focus") {
      let target: number | null = null;
      for (let d = todayIdx; d < 7; d++) {
        const near = has(d - 1, "focus") || has(d, "focus") || has(d + 1, "focus");
        if (!near && !has(d, "lab")) {
          target = d;
          break;
        }
      }
      if (target === null) {
        const c = Math.min(120, Math.floor(s.min / 2));
        carryFocus += c;
        actions.push(`focus day ${s.day}: carry ${c} min to next week`);
      } else {
        slots[i] = { ...s, day: target, status: "planned" };
        add(target, "focus");
        actions.push(`focus: moved to day ${target}`);
      }
    } else if (s.type === "lab") {
      let target: number | null = null;
      for (let d = 6; d >= todayIdx; d--) {
        if ((daysWith.get(d)?.length ?? 0) === 0) {
          target = d;
          break;
        }
      }
      if (target === null) {
        const c = Math.min(240, s.min);
        carryLab += c;
        actions.push(`lab: carry ${c} min to next week`);
      } else {
        slots[i] = { ...s, day: target, status: "planned" };
        add(target, "lab");
        actions.push(`lab: moved to day ${target}`);
      }
    }
  }

  const firstMissed = missedMicro[0];
  if (missedMicro.length >= 2 && firstMissed !== undefined) {
    const microCount = slots.filter((s) => s.type === "micro" && s.status !== "missed").length;
    let freeDay: number | null = null;
    for (let d = todayIdx; d < 7; d++) {
      if (!has(d, "micro")) {
        freeDay = d;
        break;
      }
    }
    if (microCount < 7 && freeDay !== null) {
      slots.push({ day: freeDay, type: "micro", min: firstMissed.min, status: "planned" });
      actions.push(`micro: added extra micro on day ${freeDay}`);
    }
  }
  for (const s of slots) {
    if (s.status === "missed" && s.type === "micro") {
      actions.push(`micro day ${s.day}: not made up; due reviews carry over`);
    }
  }
  const planned = slots.filter((s) => s.status === "planned").reduce((a, s) => a + s.min, 0);
  const cap = Math.trunc(1.25 * weeklyMinutes);
  if (planned > cap) {
    actions.push(`planned ${planned} exceeds cap ${cap}: drop lowest priority extra micro`);
  }
  return {
    slots,
    carry: { focus_min: carryFocus, lab_min: carryLab },
    actions,
    planned_remaining_min: planned,
  };
}
