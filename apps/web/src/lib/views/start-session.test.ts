// "Practise this" on the skill map (doc 09 S14). A skill not yet in review starts the learning loop: a
// worked example (4 min) and a faded problem (5 min) do not fit a 5-minute micro budget (06 section 7.4,
// B = 0.9 x available), so the builder returned an empty plan and the button said the build failed.
import { afterEach, describe, expect, it, vi } from "vitest";
import { practiseMinutes, previewFocus, startSession } from "./start-session.ts";

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

  it("00a M4: reports an empty plan with today's new-skill cap used as capped, not as nothing to practise", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ dry_run: true, tasks: [], new_skill_cap_reached: true }), { status: 200 })));
    expect(await startSession({ available_minutes: 15, context: "desktop", skill_focus: "math.alg.s" })).toEqual({ ok: false, reason: "capped" });
  });

  it("opens a built session", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "s-1", tasks: [{}] }), { status: 201 })));
    expect(await startSession({ available_minutes: 15, context: "desktop" })).toEqual({ ok: true, id: "s-1" });
  });
});

// Doc 09 S14: when a focus build would plan nothing, the map offered a button that could only refuse. The map now
// asks the builder first (dry run, G16).
describe("previewFocus", () => {
  afterEach(() => vi.unstubAllGlobals());
  const body = { available_minutes: 15, context: "desktop", skill_focus: "math.alg.s" } as const;

  it("asks the builder for a dry run of the same focus build, so nothing is written", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ dry_run: true, tasks: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await previewFocus(body);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1].body))).toEqual({ ...body, dry_run: true });
  });

  it("reports an empty dry-run plan as nothing to practise", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ dry_run: true, tasks: [] }), { status: 200 })));
    expect(await previewFocus(body)).toBe("empty");
  });

  it("00a M4: reports an empty plan with today's new-skill cap used as capped", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ dry_run: true, tasks: [], new_skill_cap_reached: true }), { status: 200 })));
    expect(await previewFocus(body)).toBe("capped");
  });

  it("reports a plan with tasks as practisable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ dry_run: true, tasks: [{ position: 1 }] }), { status: 200 })));
    expect(await previewFocus(body)).toBe("plannable");
  });

  it("is unknown when the preview is refused (open session, rate limit) or the network fails, so the button stays", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "open_session_exists" }), { status: 409 })));
    expect(await previewFocus(body)).toBe("unknown");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await previewFocus(body)).toBe("unknown");
  });
});
