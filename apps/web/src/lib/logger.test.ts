// BL-0005: the redacting logger (doc 03 section 10.2, CLAUDE.md rule 2.5).
import { describe, expect, it } from "vitest";

import { createLogger, REDACTED, type LogFields } from "./logger.ts";

const FIXED_NOW = Date.UTC(2026, 10, 3, 12, 0, 0);

function capture(base?: LogFields) {
  const lines: string[] = [];
  const log = createLogger({
    sink: (l) => lines.push(l),
    now: () => FIXED_NOW,
    ...(base ? { base } : {}),
  });
  const last = (): Record<string, unknown> => JSON.parse(lines.at(-1) ?? "{}");
  return { log, lines, last };
}

describe("createLogger redaction", () => {
  it("acceptance: logger.info({authorization:'x', note:'ok'}) redacts authorization and keeps note", () => {
    const { log, lines, last } = capture();
    log.info({ authorization: "x", note: "ok" });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`"authorization":"${REDACTED}"`);
    expect(last()["note"]).toBe("ok");
    expect(lines[0]).not.toContain('"x"');
  });

  it("matches every deny-listed key name whatever its case or separators", () => {
    const { log, last } = capture();
    log.info("request", {
      Cookie: "a",
      "x-api-key": "b",
      SUPABASE_SECRET_KEY: "c",
      service_role: "d",
      hmacSignature: "e",
      vapidPrivateKey: "f",
      access_token: "g",
      password: "h",
      signed_url: "i",
      content: "learner free text",
      text: "tutor message",
    });
    const out = last();
    for (const key of [
      "Cookie",
      "x-api-key",
      "SUPABASE_SECRET_KEY",
      "service_role",
      "hmacSignature",
      "vapidPrivateKey",
      "access_token",
      "password",
      "signed_url",
      "content",
      "text",
    ]) {
      expect(out[key], key).toBe(REDACTED);
    }
  });

  it("keeps counters and ids that only resemble deny-listed names", () => {
    const { log, last } = capture();
    log.info("llm call", { tokens_in: 120, tokens_out: 40, cost_usd: 0.002, content_type: "json", user_id: "u1" });
    expect(last()).toMatchObject({ tokens_in: 120, tokens_out: 40, cost_usd: 0.002, content_type: "json", user_id: "u1" });
  });

  it("redacts nested objects and arrays", () => {
    const { log, last } = capture();
    log.warn("upstream", { req: { headers: { authorization: "Bearer abc" } }, list: [{ cookie: "s" }] });
    expect(last()["req"]).toEqual({ headers: { authorization: REDACTED } });
    expect(last()["list"]).toEqual([{ cookie: REDACTED }]);
  });

  it("redacts credential-shaped values under innocent keys and in the message", () => {
    const { log, lines } = capture();
    const fakeSb = `sb_secret_${"q".repeat(24)}`;
    const fakeAnt = `sk-ant-api03-${"z".repeat(40)}`;
    log.error(`failed with ${fakeSb}`, { detail: `header was Bearer tok.en-123 and ${fakeAnt}` });
    expect(lines[0]).not.toContain(fakeSb);
    expect(lines[0]).not.toContain(fakeAnt);
    expect(lines[0]).not.toContain("tok.en-123");
    expect(lines[0]).toContain(REDACTED);
  });

  it("logs an Error as name and message only, and survives circular data", () => {
    const { log, last } = capture();
    const loop: Record<string, unknown> = { id: 1 };
    loop["self"] = loop;
    log.error("boom", { err: new TypeError("bad input"), loop });
    expect(last()["err"]).toEqual({ name: "TypeError", message: "bad input" });
    expect(last()["loop"]).toEqual({ id: 1, self: "[Circular]" });
  });
});

describe("createLogger line format", () => {
  it("writes ts from the injected clock, level, msg and base fields; fields can't overwrite them", () => {
    const { log, last } = capture({ env: "local", git_sha: "abc123" });
    log.child({ request_id: "r1" }).info("served", { level: "spoofed", status: 200 });
    expect(last()).toEqual({
      ts: "2026-11-03T12:00:00.000Z",
      level: "info",
      msg: "served",
      env: "local",
      git_sha: "abc123",
      request_id: "r1",
      status: 200,
    });
  });
});
