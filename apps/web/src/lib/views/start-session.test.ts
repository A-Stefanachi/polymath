// "Practise this" on the skill map (doc 09 S14). A skill not yet in review starts the learning loop: a
// worked example (4 min) and a faded problem (5 min) do not fit a 5-minute micro budget (06 section 7.4,
// B = 0.9 x available), so the builder returned an empty plan and the button said the build failed.
import { afterEach, describe, expect, it, vi } from "vitest";
import { practiseMinutes, startSession } from "./start-session.ts";

describe("practiseMinutes", () => {
  it("gives a skill in review a 5-minute session", () => {
    for (const state of ["reviewing", "mastered", "refresher"] as const) expect(practiseMinutes(state)).toBe(5);
  });

  it("gives a skill that has not reached review 15 minutes, enough for worked example, faded problem and retrieval", () => {
    for (const state of ["ready", "learning"] as const) expect(practiseMinutes(state)).toBe(15);
  });
});

describe("startSession", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports an empty plan (200 with no session id) as nothing to practise, not as a failed build", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ dry_run: true, tasks: [] }), { status: 200 })));
    expect(await startSession({ available_minutes: 5, context: "desktop", skill_focus: "math.alg.s" })).toEqual({ ok: false, reason: "focus" });
  });

  it("opens a built session", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "s-1", tasks: [{}] }), { status: 201 })));
    expect(await startSession({ available_minutes: 15, context: "desktop" })).toEqual({ ok: true, id: "s-1" });
  });
});
