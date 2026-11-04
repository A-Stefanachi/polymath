import type { components } from "@polymath/shared-types";
import { describe, expect, it } from "vitest";
import { groupReviewQueue } from "./review-queue";

type Queue = components["schemas"]["ReviewQueue"];
const NOW = new Date(2026, 10, 4, 10, 0, 0);
const item = (key: string, due: Date): Queue["items"][number] => ({ skill_key: key as never, due: due.toISOString(), mastery_state: "reviewing" });

describe("groupReviewQueue (S17 AC 1)", () => {
  const queue: Queue = {
    now: NOW.toISOString(),
    due_now: 3,
    due_within_horizon: 5,
    items: [
      item("elec.a.over", new Date(2026, 10, 1, 9)), // 3 days ago
      item("elec.a.yest", new Date(2026, 10, 3, 23, 59)), // yesterday, last minute
      item("elec.a.today", new Date(2026, 10, 4, 8)),
      item("elec.a.later", new Date(2026, 10, 4, 23, 59)), // end of today still counts as due
      item("elec.a.tmrw", new Date(2026, 10, 5, 0, 0, 1)), // first second of tomorrow is upcoming
    ],
  };
  const g = groupReviewQueue(queue, NOW);

  it("rows are the skills due by the end of today; the rest is upcoming", () => {
    expect(g.dueNow.map((r) => r.skillKey)).toEqual(["elec.a.over", "elec.a.yest", "elec.a.today", "elec.a.later"]);
    expect(g.upcoming.map((r) => r.skillKey)).toEqual(["elec.a.tmrw"]);
  });

  it("separates overdue from due today and counts days overdue in local days", () => {
    expect(g.overdue).toBe(2);
    expect(g.today).toBe(2);
    expect(g.dueNow.map((r) => r.daysOverdue)).toEqual([3, 1, 0, 0]);
  });
});
