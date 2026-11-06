// 00a M2: "Practise this" on a learning skill whose loop is done plans a retrieval for it before its review is due,
// so the learner can supply the qualifying attempts the mastery rule needs. Builds without a focus keep waiting
// for the due date (00a M1). Pure: a hand-built snapshot (the founder's state of 6 Nov 2026), no database.
import { createFsrsAdapter, DEFAULT_PARAMS } from "@polymath/scheduler";
import { describe, expect, it } from "vitest";
import type { BuildSnapshot, SnapshotState } from "@/server/privileged/session-store";
import { buildPackSetup, planSession } from "./builder.ts";

const now = new Date("2026-11-06T09:00:00Z");
const KEY = "math.alg.order-of-operations";

function state(over: Partial<SnapshotState>): SnapshotState {
  return {
    skillKey: KEY,
    masteryState: "learning",
    elo: 1344,
    stability: 3,
    difficulty: 5,
    due: new Date("2026-11-09T06:08:00Z"),
    lastReview: new Date("2026-11-05T06:08:00Z"),
    reps: 1,
    lapses: 0,
    fsrsState: 2,
    scheduledDays: 4,
    learningSteps: 0,
    fsrsExtra: {},
    tierAttained: null,
    source: "learned",
    loopStep: "done",
    blockedBy: [],
    interleaveStage: 0,
    firstSeenAt: new Date("2026-11-05T05:00:00Z"),
    epochStart: null,
    ...over,
  };
}

function snapshot(states: SnapshotState[]): BuildSnapshot {
  return {
    timezone: "Europe/Berlin",
    graphVersion: "g1",
    skills: [{ key: KEY, node: "math", module: "alg", estMinutes: 10, tierTarget: "L1", confusableSet: null, status: "draft", templated: true }],
    edges: [],
    states,
    candidates: [],
    history: {},
    maxNewSkillsPerDay: null,
    newSkillsToday: 0,
    previousBacklog: false,
    nodeMinutes: {},
    lastCheckpointAt: null,
    moduleCheckpointAt: {},
    interleaveSets: {},
  };
}

async function plan(st: SnapshotState, focus: string | undefined) {
  const fsrs = await createFsrsAdapter();
  return planSession(buildPackSetup(snapshot([st]), now, fsrs, focus, { params: DEFAULT_PARAMS }), "micro", "desktop", 15, DEFAULT_PARAMS);
}

describe("early practice of a finished learning skill (00a M2)", () => {
  it("plans a retrieval for the focused skill before its review is due", async () => {
    const tasks = (await plan(state({}), KEY)).tasks;
    expect(tasks.map((t) => [t.task_kind, t.skill_key])).toContainEqual(["retrieval", KEY]);
  });

  it("does not pull the skill forward in a build without a focus (Practise all due waits for the due date, 00a M1)", async () => {
    expect((await plan(state({}), undefined)).tasks).toEqual([]);
  });

  it("does not apply to a skill still inside its loop or blocked by trace-back", async () => {
    const inLoop = (await plan(state({ loopStep: "practice" }), KEY)).tasks;
    expect(inLoop.every((t) => t.task_kind !== "retrieval" || t.reason !== "due_review")).toBe(true);
    expect((await plan(state({ blockedBy: ["math.alg.other"] }), KEY)).tasks).toEqual([]);
  });
});
