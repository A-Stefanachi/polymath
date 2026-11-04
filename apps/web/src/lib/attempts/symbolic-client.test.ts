// BL-0054: the TypeScript client of the worker's /grade/symbolic. A fake fetch stands in for the network.
import { describe, expect, it } from "vitest";
import { createSymbolicClient, signRequest, SYMBOLIC_TIMEOUT_MS } from "./symbolic-client.ts";

const ENV = { WORKER_URL: "http://worker.test:8000", WORKER_HMAC_SECRET: "s3cret" };
const REQ = { responseText: "x^2", reference: "x**2", spec: { variables: ["x"], sample_domain: { x: [0.3, 2.5] as [number, number] } } };
const GRADE = {
  status: "graded",
  score: 1,
  correct: true,
  graders: [{ type: "symbolic_equivalence", score: 1, detail: { method: "symbolic" } }],
  feedback: "Correct.",
  misconception_tags: [],
};

type Call = { url: string; init: RequestInit };
function fakeFetch(respond: () => Response | Promise<Response>, calls: Call[] = []): typeof fetch {
  return (async (url: URL, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return respond();
  }) as unknown as typeof fetch;
}
const ok = () => new Response(JSON.stringify(GRADE), { status: 200 });

describe("createSymbolicClient", () => {
  it("posts a body the worker's HMAC scheme accepts and returns the grade", async () => {
    const calls: Call[] = [];
    const client = createSymbolicClient(ENV, fakeFetch(ok, calls), () => 1_800_000_000);
    expect(await client(REQ)).toEqual(GRADE);
    const call = calls[0];
    expect(call?.url).toBe("http://worker.test:8000/grade/symbolic");
    const headers = call?.init.headers as Record<string, string>;
    expect(headers["X-Polymath-Timestamp"]).toBe("1800000000");
    expect(headers["X-Polymath-Signature"]).toBe(signRequest("s3cret", "1800000000", "/grade/symbolic", String(call?.init.body)));
    expect(JSON.parse(String(call?.init.body))).toEqual({
      response_text: "x^2",
      reference: "x**2",
      spec: REQ.spec,
    });
    expect(SYMBOLIC_TIMEOUT_MS).toBe(1500);
  });

  it("signs exactly like the worker: HMAC-SHA256 hex of timestamp.POST.path.body", () => {
    // Value printed by polymath_worker.hmac_auth.sign("k", "1", "POST", "/grade/symbolic", b"{}").
    expect(signRequest("k", "1", "/grade/symbolic", "{}")).toBe("2b51dda6ada1c2cd6e58b61e9e1a76b4ed094209ad6e598272798d1344eae5ea");
  });

  it("returns null without WORKER_URL (queue-only mode, 00a I2) and calls nothing", async () => {
    const calls: Call[] = [];
    const client = createSymbolicClient({ WORKER_HMAC_SECRET: "s" }, fakeFetch(ok, calls));
    expect(await client(REQ)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["a worker error status", () => new Response("{}", { status: 500 })],
    ["a bad answer key (422)", () => new Response("{}", { status: 422 })],
    ["a malformed grade", () => new Response(JSON.stringify({ status: "graded" }), { status: 200 })],
    ["a body that is not JSON", () => new Response("<html>", { status: 200 })],
  ])("returns null on %s", async (_name, respond) => {
    expect(await createSymbolicClient(ENV, fakeFetch(respond))(REQ)).toBeNull();
  });

  it("returns null when the network call throws, such as a timeout", async () => {
    const boom = (async () => {
      throw new DOMException("timed out", "TimeoutError");
    }) as unknown as typeof fetch;
    expect(await createSymbolicClient(ENV, boom)(REQ)).toBeNull();
  });
});
