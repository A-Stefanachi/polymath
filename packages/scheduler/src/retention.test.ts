// BL-0187 acceptance: the retention switch (00a G5) and its effect on FSRS intervals.
import { describe, expect, it } from "vitest";
import { createFsrsAdapter } from "./fsrs-adapter.ts";
import { desiredRetention } from "./retention.ts";

describe("desiredRetention", () => {
  it("returns 0.85 in week 3 even with a perfect calibration", () => {
    expect(desiredRetention(3, 0)).toBe(0.85);
  });
  it("returns 0.90 in week 9 with a gap of 0.05, either sign", () => {
    expect(desiredRetention(9, 0.05)).toBe(0.9);
    expect(desiredRetention(9, -0.05)).toBe(0.9);
  });
  it("returns 0.85 in week 9 with a gap of 0.09 or with no calibration", () => {
    expect(desiredRetention(9, 0.09)).toBe(0.85);
    expect(desiredRetention(9, -0.09)).toBe(0.85);
    expect(desiredRetention(9, null)).toBe(0.85);
    expect(desiredRetention(9, undefined)).toBe(0.85);
  });
  it("switches exactly at week 8 and accepts a gap of 0.07 but not 0.0701", () => {
    expect(desiredRetention(7.99, 0)).toBe(0.85);
    expect(desiredRetention(8, 0)).toBe(0.9);
    expect(desiredRetention(8, 0.07)).toBe(0.9);
    expect(desiredRetention(8, 0.0701)).toBe(0.85);
  });
});

describe("FSRS adapter at the two retention values", () => {
  it("gives a longer interval at 0.85 than at 0.90 for the same history", async () => {
    const a85 = await createFsrsAdapter({ desiredRetention: desiredRetention(3, null), maximumIntervalDays: 36500 });
    const a90 = await createFsrsAdapter({ desiredRetention: desiredRetention(9, 0), maximumIntervalDays: 36500 });
    const t0 = new Date("2026-10-01T09:00:00Z");
    let c85 = (await a85.review(a85.newCard(t0), 3, t0)).card;
    let c90 = (await a90.review(a90.newCard(t0), 3, t0)).card;
    const t1 = new Date(t0.getTime() + 10 * 86_400_000);
    c85 = (await a85.review(c85, 3, t1)).card;
    c90 = (await a90.review(c90, 3, t1)).card;
    expect(c85.scheduled_days).toBeGreaterThan(c90.scheduled_days);
  });
});
