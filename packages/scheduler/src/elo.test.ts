import { describe, expect, it } from "vitest";
import {
  coldStartTheta,
  difficultyFromPrior,
  expectedScore,
  kFactor,
  kItem,
  mapRating,
  updateElo,
} from "./elo.ts";

const base = { task_kind: "problem", score: 1, max_hint_level: 0, unaided: true };

describe("elo", () => {
  it("expectedScore is 0.5 for equal ratings and applies the guess floor", () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
    expect(expectedScore(1500, 1500, 0.25)).toBeCloseTo(0.625, 10);
  });

  it("kFactor starts at 48, halves at n=10 and floors at 16", () => {
    expect(kFactor(0)).toBe(48);
    expect(kFactor(10)).toBe(24);
    expect(kFactor(100)).toBe(16);
  });

  it("kItem starts at 24 and floors at 4", () => {
    expect(kItem(0)).toBe(24);
    expect(kItem(10000)).toBe(4);
  });

  it("difficultyFromPrior clamps to 1200..1800", () => {
    expect(difficultyFromPrior(-1)).toBe(1200);
    expect(difficultyFromPrior(0.5)).toBe(1500);
    expect(difficultyFromPrior(2)).toBe(1800);
  });

  it("coldStartTheta clamps at 1100 and 1700", () => {
    expect(coldStartTheta([])).toBe(1300);
    expect(coldStartTheta([1000])).toBe(1100);
    expect(coldStartTheta([2000])).toBe(1700);
  });

  it("updateElo: worked examples change nothing; the reveal scores 0", () => {
    const w = updateElo(1500, 3, 1500, 3, { ...base, task_kind: "worked_example" });
    expect(w).toMatchObject({ theta: 1500, d: 1500, n_skill: 3, n_item: 3 });
    const r = updateElo(1400, 5, 1450, 5, { ...base, max_hint_level: 4, unaided: false });
    expect(r.theta).toBeLessThan(1400);
    expect(r.d).toBe(1450);
  });
});

describe("mapRating", () => {
  const good = { ...base, confidence: 4, latency_ms: 5000, expected_ms: 10000, template_n_obs: 20 };

  it("returns null for task kinds that create no review", () => {
    expect(mapRating({ ...base, task_kind: "worked_example" }).rating).toBeNull();
  });

  it("score at the fail threshold 0.5 is Hard, just below is Again", () => {
    expect(mapRating({ ...base, score: 0.5 }).rating).toBe(2);
    expect(mapRating({ ...base, score: 0.49 }).rating).toBe(1);
  });

  it("score at the correct threshold 0.8 is not Hard", () => {
    expect(mapRating({ ...base, score: 0.8 }).rating).toBe(3);
    expect(mapRating({ ...base, score: 0.79 }).rating).toBe(2);
  });

  it("latency rows apply at 20 observations and are ignored at 19 (00a G5)", () => {
    const slow = { ...good, latency_ms: 30000 };
    expect(mapRating(slow, 3).rating).toBe(2);
    expect(mapRating({ ...slow, template_n_obs: 19 }, 3).rating).toBe(3);
    expect(mapRating(good, 2).rating).toBe(4);
    expect(mapRating(good, 1).rating).toBe(3);
    expect(mapRating({ ...good, template_n_obs: 19 }, 3).rating).toBe(3);
  });
});
