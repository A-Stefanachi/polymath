import { describe, expect, it } from "vitest";
import { dueWhen, IDLE_CAP_MS, parseNumericAnswer, pollDelayMs, TaskTimer } from "./runner";

describe("parseNumericAnswer", () => {
  it("reads a number with and without a unit", () => {
    expect(parseNumericAnswer("2.5 V")).toEqual({ value: 2.5, unit: "V" });
    expect(parseNumericAnswer(" -3e-3mA ")).toEqual({ value: -0.003, unit: "mA" });
    expect(parseNumericAnswer(".5")).toEqual({ value: 0.5 });
  });
  it("rejects text that is not a number first", () => {
    expect(parseNumericAnswer("V 2")).toBeNull();
    expect(parseNumericAnswer("2 V extra")).toBeNull();
    expect(parseNumericAnswer("")).toBeNull();
  });
});

describe("TaskTimer", () => {
  it("excludes paused time from latency and active time (S08 AC 1)", () => {
    const t = new TaskTimer(0);
    t.touch(10_000);
    t.pause(10_000);
    t.resume(70_000);
    expect(t.latency(80_000)).toBe(20_000);
    expect(t.active(80_000)).toBe(20_000);
  });
  it("caps an idle gap at 45 s: exactly 45 s counts in full, one more ms does not", () => {
    const a = new TaskTimer(0);
    expect(a.active(IDLE_CAP_MS)).toBe(IDLE_CAP_MS);
    const b = new TaskTimer(0);
    expect(b.active(IDLE_CAP_MS + 1)).toBe(IDLE_CAP_MS);
    expect(b.latency(IDLE_CAP_MS + 1)).toBe(IDLE_CAP_MS + 1);
  });
  it("counts time while paused as paused even before resume", () => {
    const t = new TaskTimer(0);
    t.pause(5_000);
    expect(t.latency(65_000)).toBe(5_000);
  });
});

describe("pollDelayMs", () => {
  it("polls each second for 5 s, then every 3 s, and stops at 90 s", () => {
    expect(pollDelayMs(0)).toBe(1_000);
    expect(pollDelayMs(4_999)).toBe(1_000);
    expect(pollDelayMs(5_000)).toBe(3_000);
    expect(pollDelayMs(89_999)).toBe(3_000);
    expect(pollDelayMs(90_000)).toBeNull();
  });
});

describe("dueWhen", () => {
  const now = new Date("2026-11-04T10:00:00Z");
  it("names the calendar day in the learner's zone", () => {
    expect(dueWhen("2026-11-04T23:00:00Z", now, "UTC")).toBe("today");
    expect(dueWhen("2026-11-05T00:00:00Z", now, "UTC")).toBe("tomorrow");
    expect(dueWhen("2026-11-07T08:00:00Z", now, "UTC")).toBe("in 3 days");
    expect(dueWhen("2026-11-03T08:00:00Z", now, "UTC")).toBe("today");
  });
  it("uses the zone for the day boundary", () => {
    expect(dueWhen("2026-11-04T23:30:00Z", now, "Europe/Rome")).toBe("tomorrow");
  });
});
