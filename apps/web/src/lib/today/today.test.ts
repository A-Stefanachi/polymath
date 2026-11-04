// BL-0059: Today helpers (doc 09 S06, S07).
import { describe, expect, it } from "vitest";
import { preview } from "@/copy/strings";
import {
  CHIP_MINUTES,
  countGroups,
  dateLine,
  defaultContext,
  fallbackTitle,
  groupPreview,
  neighbourMinutes,
  reasonLabel,
  summariseWeek,
} from "./today.ts";

const task = (reason: string | null, position = 1) => ({ position, task_kind: "retrieval", est_seconds: 90, reason });

describe("reason wording (S07 AC-3)", () => {
  it("reads applied_gap in plain language", () => {
    expect(reasonLabel("applied_gap")).toBe("One more applied problem to finish this skill");
  });
  it("never shows an internal code: every known reason and an unknown one map to words with no underscore", () => {
    for (const code of [...Object.keys(preview.reasons), "something_new", null, undefined]) {
      expect(reasonLabel(code)).not.toMatch(/_/);
    }
    expect(reasonLabel("due_review")).toBe("Due for review");
  });
});

describe("grouping", () => {
  const tasks = [task("frontier", 1), task("due_review", 2), task("verify_inferred", 3), task("continue", 4), task("interleave", 5)];
  it("orders Reviews, Continue, New, Other and keeps the previewed order inside a group", () => {
    const groups = groupPreview(tasks);
    expect(groups.map((g) => g.key)).toEqual(["reviews", "continue", "new", "other"]);
    expect(groups[0]?.tasks.map((t) => t.position)).toEqual([2, 3]);
  });
  it("drops empty groups and counts", () => {
    expect(groupPreview([task("due_review")]).map((g) => g.key)).toEqual(["reviews"]);
    expect(countGroups(tasks)).toEqual({ reviews: 2, cont: 1, fresh: 1 });
  });
});

describe("chips", () => {
  it("steps along the chip scale and stops at the ends", () => {
    expect(CHIP_MINUTES).toEqual([5, 15, 30, 60]);
    expect(neighbourMinutes(15, 1)).toBe(30);
    expect(neighbourMinutes(15, -1)).toBe(5);
    expect(neighbourMinutes(5, -1)).toBeNull();
    expect(neighbourMinutes(60, 1)).toBeNull();
  });
  it("defaults the context from the viewport: 767 px is Phone, 768 px is Desktop", () => {
    expect(defaultContext(767)).toBe("phone");
    expect(defaultContext(768)).toBe("desktop");
  });
  it("makes a readable title from a skill key", () => {
    expect(fallbackTitle("elec.dc.voltage-divider")).toBe("Voltage divider");
  });
});

describe("week strip", () => {
  // Wednesday 4 Nov 2026 12:00 UTC; the week is Mon 2 Nov to Sun 8 Nov.
  const now = new Date("2026-11-04T12:00:00Z");
  it("marks the local days with a completed session and sums their minutes", () => {
    const week = summariseWeek(
      [
        { status: "completed", started_at: "2026-11-02T08:00:00Z", actual_min: 12 },
        { status: "completed", started_at: "2026-11-02T18:00:00Z", actual_min: 8 },
        { status: "completed", started_at: "2026-11-04T07:00:00Z", actual_min: 15 },
        { status: "abandoned", started_at: "2026-11-03T07:00:00Z", actual_min: 3 },
        { status: "completed", started_at: "2026-11-01T07:00:00Z", actual_min: 30 }, // Sunday before: last week
      ],
      now,
      "UTC",
    );
    expect(week.practised).toEqual([true, false, true, false, false, false, false]);
    expect(week).toMatchObject({ days: 2, minutes: 35, todayIndex: 2 });
  });
  it("uses the learner's time zone for the day boundary", () => {
    // 23:30 UTC on Sunday 1 Nov is already Monday 2 Nov in Rome (UTC+1).
    const week = summariseWeek([{ status: "completed", started_at: "2026-11-01T23:30:00Z", actual_min: 5 }], now, "Europe/Rome");
    expect(week.practised[0]).toBe(true);
    expect(summariseWeek([{ status: "completed", started_at: "2026-11-01T23:30:00Z", actual_min: 5 }], now, "UTC").days).toBe(0);
  });
  it("formats the date line", () => {
    expect(dateLine(now, "UTC")).toBe("Wed 4 Nov");
  });
});
