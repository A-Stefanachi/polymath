// Boundary and property tests for BL-0037; the shared vectors (pack.vectors.ts) cover the oracle.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  PHONE_KINDS,
  checkpointStatus,
  estimateMinutes,
  hintReliance,
  interleaveStage,
  interleaveWidth,
  isStuck,
  microWindow,
  packSession,
  roundRobinOrder,
  traceBack,
  type PackInput,
  type PackSkillState,
  type RecentAttempt,
} from "./pack.ts";
import { resolveParams } from "./params.ts";
import { sampleGraph } from "./sample-graph.ts";

const graph = sampleGraph();
const keys = Object.keys(graph.skills);

describe("interleaveStage limits", () => {
  it("stays blocked below 2 eligible skills and starts pairs at 2", () => {
    expect(interleaveStage(1, [], 0)).toBe(0);
    expect(interleaveStage(2, [], 0)).toBe(1);
  });
  it("regresses at accuracy 0.39 but not at 0.4", () => {
    expect(interleaveStage(3, [0.7, 0.39], 2)).toBe(1);
    expect(interleaveStage(3, [0.7, 0.4], 2)).toBe(2);
    expect(interleaveStage(3, [0.39], 1)).toBe(1);
  });
  it("advances 1 to 2 at 0.6 twice with 3 eligible skills, not at 0.59 or with 2 skills", () => {
    expect(interleaveStage(3, [0.6, 0.6], 1)).toBe(2);
    expect(interleaveStage(3, [0.59, 0.6], 1)).toBe(1);
    expect(interleaveStage(2, [0.9, 0.9], 1)).toBe(1);
  });
  it("advances 2 to 3 at 0.7 three times with 4 eligible skills, not at 0.69", () => {
    expect(interleaveStage(4, [0.7, 0.7, 0.7], 2)).toBe(3);
    expect(interleaveStage(4, [0.69, 0.7, 0.7], 2)).toBe(2);
    expect(interleaveStage(3, [0.9, 0.9, 0.9], 2)).toBe(2);
  });
  it("widens by stage and caps the whole-module stage at 5", () => {
    expect([0, 1, 2].map((s) => interleaveWidth(s, 9))).toEqual([1, 2, 3]);
    expect(interleaveWidth(3, 9)).toBe(5);
    expect(interleaveWidth(3, 4)).toBe(4);
  });
  it("never repeats a skill back to back with two or more skills", () => {
    const order = roundRobinOrder(["a", "b"], 5);
    expect(order).toEqual(["a", "b", "a", "b", "a"]);
  });
});

describe("estimateMinutes", () => {
  it("applies the personal ratio from 5 observations, not 4", () => {
    expect(estimateMinutes("problem", 1.5, 5)).toBe(15);
    expect(estimateMinutes("problem", 1.5, 4)).toBe(10);
  });
  it("clamps the ratio to [0.6, 1.8]", () => {
    expect(estimateMinutes("problem", 0.1, 9)).toBe(6);
    expect(estimateMinutes("problem", 9, 9)).toBe(18);
  });
  it("uses authored minutes for a project step and rejects unknown kinds", () => {
    expect(estimateMinutes("project_step", null, 0, 45)).toBe(45);
    expect(() => estimateMinutes("nonsense")).toThrow();
  });
});

describe("window rule (00a A1)", () => {
  it("serves 30 minutes as one micro of 20 plus an optional chained micro of 10", () => {
    expect(microWindow(30)).toEqual({ first: 20, chained: 10 });
    expect(microWindow(20)).toEqual({ first: 20, chained: null });
    expect(microWindow(44)).toEqual({ first: 20, chained: 20 });
  });
  it("packs a 30 minute micro within 20 minutes", () => {
    const states = { "sw.c.variables": { due: true, mastery_state: "mastered", retrievability: 0.7 } };
    const first = packSession({ available_minutes: 30, context: "desktop", session_type: "micro", graph, states });
    expect(first.available_minutes).toBe(20);
    expect(first.total_est_min).toBeLessThanOrEqual(20);
  });
});

describe("packSession limits", () => {
  const due = (r: number): PackSkillState => ({ due: true, mastery_state: "mastered", retrievability: r });
  const base = { context: "desktop", session_type: "focus", graph } as const;

  it("fits a retrieval only when it is inside the 10 percent slack budget", () => {
    // budget = 0.9 * available; one retrieval costs 1.5
    const states = { "sw.c.variables": due(0.7) };
    const at = packSession({ ...base, available_minutes: 5 / 3, states, backlog: true, backlog_suspend_new: true });
    const below = packSession({ ...base, available_minutes: 1.66, states, backlog: true, backlog_suspend_new: true });
    expect(at.tasks).toHaveLength(1);
    expect(below.tasks).toHaveLength(0);
  });
  it("caps reviews at 70 percent of the budget unless there is a backlog", () => {
    const states: Record<string, PackSkillState> = {};
    for (const k of keys) states[k] = due(0.7);
    const mk = (backlog: boolean) =>
      packSession({ ...base, session_type: "micro", available_minutes: 10, states, backlog }).tasks.filter(
        (t) => t.reason === "due_review",
      ).length;
    expect(mk(false)).toBe(4); // floor(0.7 * 9 / 1.5)
    expect(mk(true)).toBe(6); // floor(9 / 1.5)
  });
  it("orders the lowest retrievability first and breaks ties by key", () => {
    const out = packSession({
      ...base,
      available_minutes: 30,
      states: { "sw.c.variables": due(0.8), "math.alg.linear-equations": due(0.8), "sw.c.control-flow": due(0.6) },
    });
    expect(out.tasks.filter((t) => t.reason === "due_review").map((t) => t.skill_key)).toEqual(["sw.c.control-flow", "math.alg.linear-equations", "sw.c.variables"]);
  });
  it("returns nothing on a bench context in a micro session", () => {
    const out = packSession({ ...base, context: "bench", session_type: "micro", available_minutes: 60, states: { "sw.c.variables": due(0.7) } });
    expect(out.tasks).toEqual([]);
  });
  it("puts an overdue checkpoint first and a due one after practice", () => {
    const states = { "sw.c.variables": due(0.7) };
    const over = packSession({ ...base, available_minutes: 20, states, checkpoint: "overdue", checkpoint_skills: ["sw.c.control-flow"] });
    expect(over.tasks[0]?.reason).toBe("checkpoint_overdue");
    const soon = packSession({
      ...base,
      available_minutes: 20,
      states,
      checkpoint: "due",
      checkpoint_skills: ["sw.c.control-flow"],
      backlog_suspend_new: true,
    });
    expect(soon.tasks.map((t) => t.reason)).toEqual(["due_review", "checkpoint_due"]);
  });
  it("applied_gap runs after reviews and before new skills, without taking a new-skill slot", () => {
    const states: Record<string, PackSkillState> = {
      "elec.dc.ohms-law": { mastery_state: "reviewing", needs_applied: true, retrievability: 0.9, tier_attained: "L0" },
      "math.alg.linear-equations": { mastery_state: "mastered", retrievability: 0.95, tier_attained: "L1" },
    };
    const out = packSession({ ...base, session_type: "micro", context: "phone", available_minutes: 20, states });
    const reasons = out.tasks.map((t) => t.reason);
    expect(reasons[0]).toBe("applied_gap");
    expect(reasons).toContain("new_frontier");
  });
  it("serves a lab slot with no eligible step as a focus session capped at 120 minutes", () => {
    const out = packSession({ ...base, session_type: "lab", available_minutes: 180, states: {}, project_steps: [] });
    expect(out.served_as).toBe("focus");
    expect(out.available_minutes).toBe(120);
  });
  it("accepts a lab step that exactly fits the 90 percent budget and falls back one minute above", () => {
    const step = (est_min: number) => ({ key: "prj.L1.x#s01", skill_key: "sw.c.variables", est_min });
    const fit = packSession({ ...base, session_type: "lab", available_minutes: 120, states: {}, project_steps: [step(108)] });
    expect(fit.served_as).toBeUndefined();
    expect(fit.tasks[0]?.task_kind).toBe("project_step");
    const over = packSession({ ...base, session_type: "lab", available_minutes: 120, states: {}, project_steps: [step(109)] });
    expect(over.served_as).toBe("focus");
  });
  it("rejects state for a skill the graph does not know", () => {
    expect(() => packSession({ ...base, available_minutes: 30, states: { "x.y.z": due(0.5) } })).toThrow(/unknown skill/);
  });
});

describe("packSession properties", () => {
  const stateArb: fc.Arbitrary<PackSkillState> = fc.record(
    {
      mastery_state: fc.constantFrom("unseen", "learning", "reviewing", "mastered", "decayed"),
      retrievability: fc.double({ min: 0, max: 1, noNaN: true }),
      due: fc.boolean(),
      loop_step: fc.constantFrom("worked_example", "faded_problem", "practice", "verify", "retrieval_same_day", "done", null),
      needs_applied: fc.boolean(),
      tier_attained: fc.constantFrom("L0", "L1"),
    },
    { requiredKeys: [] },
  );
  const inputArb: fc.Arbitrary<PackInput> = fc
    .record({
      available_minutes: fc.integer({ min: 0, max: 300 }),
      context: fc.constantFrom("phone", "desktop", "bench"),
      session_type: fc.constantFrom("micro", "focus", "lab"),
      states: fc.dictionary(fc.constantFrom(...keys), stateArb),
      interleave: fc.dictionary(fc.constantFrom("dc", "alg", "c"), fc.integer({ min: 0, max: 3 })),
      checkpoint: fc.constantFrom("none", "due", "overdue"),
      backlog: fc.boolean(),
    })
    .map((r) => ({ ...r, graph, checkpoint_skills: ["sw.c.variables"] }) as PackInput);

  it("never exceeds the available minutes and caps micro at 20", () => {
    fc.assert(
      fc.property(inputArb, (inp) => {
        const out = packSession(inp);
        expect(out.total_est_min).toBeLessThanOrEqual(out.available_minutes + 1e-9);
        expect(out.fits).toBe(true);
        if (inp.session_type === "micro") expect(out.available_minutes).toBeLessThanOrEqual(20);
        if (out.served_as === "focus") expect(out.available_minutes).toBeLessThanOrEqual(120);
        out.tasks.forEach((t, i) => expect(t.position).toBe(i + 1));
      }),
      { numRuns: 300 },
    );
  });
  it("offers only phone-suitable kinds on a phone (interleaved shorts count as problem_short)", () => {
    fc.assert(
      fc.property(inputArb, (inp) => {
        const out = packSession({ ...inp, context: "phone", session_type: inp.session_type === "lab" ? "focus" : inp.session_type });
        for (const t of out.tasks) {
          const shortProblem = t.task_kind === "problem" && t.est_min === estimateMinutes("problem_short");
          expect(PHONE_KINDS.includes(t.task_kind) || shortProblem).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });
  it("gives no card in a bench micro session and is deterministic", () => {
    fc.assert(
      fc.property(inputArb, (inp) => {
        const bench = packSession({ ...inp, context: "bench", session_type: "micro" });
        expect(bench.tasks).toEqual([]);
        expect(packSession(inp)).toEqual(packSession(inp));
      }),
      { numRuns: 100 },
    );
  });
});

describe("checkpointStatus limits", () => {
  it("is none below 12 days, due at 12, overdue at 14, none when never taken", () => {
    expect(checkpointStatus(11.99, {}, {}).status).toBe("none");
    expect(checkpointStatus(12, {}, {}).status).toBe("due");
    expect(checkpointStatus(13.99, {}, {}).status).toBe("due");
    expect(checkpointStatus(14, {}, {}).status).toBe("overdue");
    expect(checkpointStatus(null, {}, {}).status).toBe("none");
  });
  it("lists a module at fraction 0.8 and not 0.79, and waits 7 days after its last checkpoint", () => {
    expect(checkpointStatus(1, { dc: 0.8 }, {}).module_checkpoints).toEqual(["dc"]);
    expect(checkpointStatus(1, { dc: 0.79 }, {}).module_checkpoints).toEqual([]);
    expect(checkpointStatus(1, { dc: 0.9 }, { dc: 6 }).module_checkpoints).toEqual([]);
    expect(checkpointStatus(1, { dc: 0.9 }, { dc: 7 }).module_checkpoints).toEqual(["dc"]);
  });
  it("a ready module makes the status due but never downgrades overdue", () => {
    expect(checkpointStatus(1, { dc: 0.9 }, {}).status).toBe("due");
    expect(checkpointStatus(20, { dc: 0.9 }, {}).status).toBe("overdue");
  });
});

describe("isStuck limits", () => {
  const at = (day: number, item: string, score: number, hint = 0): RecentAttempt => ({
    item_id: item,
    score,
    max_hint_level: hint,
    submitted_at: `2026-10-${String(day).padStart(2, "0")}T09:00:00Z`,
  });
  it("needs 3 failures over 2 items and 2 days", () => {
    expect(isStuck([at(1, "a", 0.4), at(2, "b", 0.1), at(2, "b", 0)]).reason).toBe("consecutive_fails");
    expect(isStuck([at(1, "a", 0.4), at(2, "a", 0.1), at(2, "a", 0)]).stuck).toBe(false);
    expect(isStuck([at(1, "a", 0.4), at(1, "b", 0.1), at(1, "b", 0)]).stuck).toBe(false);
    expect(isStuck([at(1, "a", 0.4), at(2, "b", 0.1)]).stuck).toBe(false);
  });
  it("treats score 0.5 as not a failure", () => {
    expect(isStuck([at(1, "a", 0.5), at(2, "b", 0.1), at(3, "c", 0)]).stuck).toBe(false);
  });
  it("flags 2 reveals in the last 4, not 1", () => {
    expect(isStuck([at(1, "a", 1), at(1, "a", 1, 4), at(1, "a", 1), at(1, "a", 1, 4)]).reason).toBe("reveals");
    expect(isStuck([at(1, "a", 1), at(1, "a", 1, 4), at(1, "a", 1), at(1, "a", 1)]).stuck).toBe(false);
  });
});

describe("hintReliance limits", () => {
  const mk = (n: number, hinted: number): RecentAttempt[] =>
    Array.from({ length: n }, (_, i) => ({ score: 1, max_hint_level: i < hinted ? 2 : 1 }));
  it("flags above 0.5 with at least 8 attempts only", () => {
    expect(hintReliance(mk(8, 5))).toEqual({ rate: 0.625, flag: true });
    expect(hintReliance(mk(8, 4)).flag).toBe(false);
    expect(hintReliance(mk(7, 7)).flag).toBe(false);
    expect(hintReliance([])).toEqual({ rate: 0, flag: false });
  });
  it("looks at the last 20 attempts", () => {
    expect(hintReliance([...mk(10, 10), ...mk(20, 0)]).rate).toBe(0);
  });
});

describe("traceBack", () => {
  it("stops the chain at trace_max_depth", () => {
    const states = {
      "math.alg.linear-equations": { mastery_state: "learning" },
      "elec.dc.ohms-law": { mastery_state: "learning" },
      "elec.dc.series-parallel": { mastery_state: "learning" },
    };
    const out = traceBack(graph, states, "elec.dc.voltage-divider");
    expect(out.status).toBe("blocked");
    expect(out.chain).toEqual(["elec.dc.ohms-law", "elec.dc.series-parallel", "math.alg.linear-equations"]);
    const two = traceBack(graph, states, "elec.dc.voltage-divider", {}, 0, resolveParams({ trace_max_depth: 2 }));
    expect(two.chain).toEqual(["elec.dc.ohms-law", "elec.dc.series-parallel"]);
    const shallow = traceBack(graph, states, "elec.dc.voltage-divider", {}, 0, resolveParams({ trace_max_depth: 1 }));
    expect(shallow.chain).toEqual(["elec.dc.series-parallel"]);
  });
});
