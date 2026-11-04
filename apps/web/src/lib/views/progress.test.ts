import type { components } from "@polymath/shared-types";
import { describe, expect, it } from "vitest";
import { isEmpty, nextArtifact, percentOf, stateRows } from "./progress";

type Progress = components["schemas"]["Progress"];
type Node = Progress["nodes"][number];

const counts = { unseen: 0, learning: 0, reviewing: 0, mastered: 0, decayed: 0 };
const node = (code: string, at: number, scope: number, over: Partial<Node> = {}): Node => ({
  node: code as Node["node"],
  skills_total: scope,
  by_mastery_state: counts,
  tier_counts: { none: 0, L0: 0, L1: 0, L2: 0, L3: 0 },
  l1_scope_skills: scope,
  l1_scope_at_l1: at,
  l1_gate_project: null,
  l1_working: false,
  ...over,
});
const base: Progress = {
  generated_at: "2026-11-04T10:00:00Z",
  timezone: "Europe/Rome",
  week: { start_date: "2026-11-02", end_date: "2026-11-08", minutes_done: 0, minutes_target: 480, history: [] },
  totals: { skills: 40, needs_applied: 0, by_mastery_state: { ...counts, unseen: 40 } },
  nodes: [],
  review_load: { horizon_days: 7, overdue_now: 0, total_due: 0, estimated_minutes: 0, days: [] },
  projects: [],
  checkpoints: { completed_count: 0, recent: [], aided_vs_unaided: null },
  decayed: [],
};

describe("nextArtifact (S15 AC 5)", () => {
  it("names the area nearest working level and the project evidence still missing", () => {
    const gate = { project_key: "prj.L1.led-blink" as never, status: "active" as const, steps_done: 2, steps_total: 6, evidence_accepted: 1, evidence_required: 3 };
    const a = nextArtifact({ ...base, nodes: [node("math", 4, 9), node("elec", 14, 17, { l1_gate_project: gate })] });
    expect(a.heading).toBe("Next: Electronics working level, 14 of 17 skills; Led blink project, evidence 1 of 3 accepted");
    expect(a.remaining).toEqual(["3 more skills to bring to working level.", "2 pieces of project evidence still to be accepted.", "Project steps: 2 of 6 done."]);
  });

  it("says evidence is not yet logged when none is accepted", () => {
    const gate = { project_key: "prj.L1.led-blink" as never, status: "active" as const, steps_done: 0, steps_total: 6, evidence_accepted: 0, evidence_required: 3 };
    expect(nextArtifact({ ...base, nodes: [node("elec", 0, 17, { l1_gate_project: gate })] }).heading).toContain("evidence not yet logged");
  });

  it("breaks a tie on the share by the lower node code, and skips an area already at working level", () => {
    expect(nextArtifact({ ...base, nodes: [node("sw", 1, 2), node("math", 2, 4), node("elec", 5, 5, { l1_working: true })] }).heading).toContain("Math");
  });

  it("falls back to plain sentences when nothing is in scope or everything is working", () => {
    expect(nextArtifact(base).heading).toBe("Next: start your first sessions");
    expect(nextArtifact({ ...base, nodes: [node("elec", 5, 5, { l1_working: true })] }).heading).toBe("Working level reached in every area that has a project.");
  });
});

describe("helpers", () => {
  it("percentOf rounds a count pair and survives a zero total", () => {
    expect(percentOf({ correct: 41, total: 50 })).toBe(82);
    expect(percentOf({ correct: 0, total: 0 })).toBe(0);
  });

  it("is empty only when nothing at all has happened", () => {
    expect(isEmpty(base)).toBe(true);
    expect(isEmpty({ ...base, totals: { ...base.totals, by_mastery_state: { ...counts, unseen: 39, learning: 1 } } })).toBe(false);
    expect(isEmpty({ ...base, projects: [{ user_project_id: "x", project_key: "prj.L0.a" as never, status: "active", steps_done: 0, steps_total: 1 }] })).toBe(false);
  });

  it("adds the applied-problem row only when a skill needs one (S15 AC)", () => {
    expect(stateRows(base).map((r) => r.label)).not.toContain("Reviewing: needs one more applied problem");
    const rows = stateRows({ ...base, totals: { ...base.totals, needs_applied: 2 } });
    expect(rows.find((r) => r.sub)).toEqual({ label: "Reviewing: needs one more applied problem", count: 2, sub: true });
  });
});
