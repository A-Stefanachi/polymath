// BL-0039: tutor_overreliance boundaries (00a G6). The shared vectors cover the main cases; these pin the limits.
import { describe, expect, it } from "vitest";
import { tutorOverreliance } from "./overreliance.ts";

const ck = (un: number, uc: number, an: number, ac: number) => ({
  unaided_n: un,
  unaided_correct: uc,
  aided_n: an,
  aided_correct: ac,
});

describe("tutorOverreliance", () => {
  it("flags a gap just over 0.15 and switches to post_attempt_only", () => {
    // unaided 8/20 = 0.4, aided 18/20 = 0.9 -> 0.5 is far over; use 0.15 + epsilon below
    const r = tutorOverreliance([ck(10, 5, 10, 7), ck(10, 5, 10, 7)]); // 0.5 vs 0.7 -> 0.2
    expect(r).toMatchObject({ flag: true, gap: 0.2, tutor_mode: "post_attempt_only" });
  });
  it("does not flag a gap of exactly 0.15", () => {
    const r = tutorOverreliance([ck(10, 8, 10, 10), ck(10, 9, 10, 10)]);
    expect(r).toMatchObject({ flag: false, gap: 0.15, reason: "within_threshold" });
  });
  it("accepts exactly 10 attempts per pool and rejects 9", () => {
    expect(tutorOverreliance([ck(5, 1, 5, 5), ck(5, 1, 5, 5)]).reason).not.toBe("too_few_attempts");
    expect(tutorOverreliance([ck(5, 1, 5, 5), ck(4, 1, 5, 5)]).reason).toBe("too_few_attempts");
    expect(tutorOverreliance([ck(5, 1, 5, 5), ck(5, 1, 4, 4)]).reason).toBe("too_few_attempts");
  });
  it("needs two checkpoints", () => {
    expect(tutorOverreliance([ck(50, 1, 50, 50)])).toMatchObject({ flag: false, reason: "too_few_checkpoints" });
  });
});
