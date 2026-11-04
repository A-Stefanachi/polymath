import { describe, expect, it } from "vitest";
import { parseCode, parseEmail, signupEnabled, withMinimumDuration } from "./validate.ts";

describe("parseEmail", () => {
  it("normalises case and spaces", () => {
    expect(parseEmail("  Ada@Example.TEST ")).toBe("ada@example.test");
  });
  it("rejects non-strings, missing parts and over-long values", () => {
    expect(parseEmail(5)).toBeNull();
    expect(parseEmail("ada")).toBeNull();
    expect(parseEmail("a b@example.test")).toBeNull();
    const local = "a".repeat(243);
    expect(parseEmail(`${local}@example.te`)).toBe(`${local}@example.te`); // 254 characters
    expect(parseEmail(`${local}@example.tes`)).toBeNull(); // 255
  });
});

describe("parseCode", () => {
  it("accepts six digits, also pasted with spaces or a dash", () => {
    expect(parseCode("123456")).toBe("123456");
    expect(parseCode(" 123 456 ")).toBe("123456");
    expect(parseCode("123-456")).toBe("123456");
  });
  it("rejects five digits, seven digits and letters", () => {
    expect(parseCode("12345")).toBeNull();
    expect(parseCode("1234567")).toBeNull();
    expect(parseCode("12345a")).toBeNull();
    expect(parseCode(123456)).toBeNull();
  });
});

describe("signupEnabled", () => {
  it("is on only for the exact value true", () => {
    expect(signupEnabled({ AUTH_SIGNUP_ENABLED: "true" })).toBe(true);
    expect(signupEnabled({ AUTH_SIGNUP_ENABLED: "false" })).toBe(false);
    expect(signupEnabled({ AUTH_SIGNUP_ENABLED: "1" })).toBe(false);
    expect(signupEnabled({})).toBe(false);
  });
});

describe("withMinimumDuration", () => {
  it("pads a fast call up to the floor and does not delay a slow one", async () => {
    const t0 = Date.now();
    await withMinimumDuration(120, async () => "fast");
    expect(Date.now() - t0).toBeGreaterThanOrEqual(115);
    const t1 = Date.now();
    await withMinimumDuration(20, () => new Promise((r) => setTimeout(r, 80)));
    expect(Date.now() - t1).toBeLessThan(140);
  });
  it("pads a failing call too", async () => {
    const t0 = Date.now();
    await expect(withMinimumDuration(100, async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(Date.now() - t0).toBeGreaterThanOrEqual(95);
  });
});
