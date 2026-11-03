import { describe, expect, it } from "vitest";
import { pathFor } from "./next-step.ts";

const consented = { research: { version: "2026-11", granted: true, at: "2026-11-03T00:00:00Z" } };

describe("pathFor (consent, then onboarding, then home)", () => {
  it.each([
    [{ onboarded_at: null, consents: {} }, "/consent"],
    [{ onboarded_at: "2026-11-03T00:00:00Z", consents: {} }, "/consent"],
    [{ onboarded_at: null, consents: consented }, "/onboarding"],
    [{ onboarded_at: "2026-11-03T00:00:00Z", consents: consented }, "/"],
    [{ onboarded_at: null, consents: { research: { version: "2026-11", granted: false } } }, "/onboarding"],
    [null, "/"],
  ])("%j -> %s", (profile, path) => {
    expect(pathFor(profile)).toBe(path);
  });
});
