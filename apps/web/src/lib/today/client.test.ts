// BL-0059 / BL-0044: the Today preview never waits forever (doc 09 S06 states, section 3.3 error copy).
// fetch is the external boundary and is stubbed; timers are faked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_TIMEOUT_MS, previewSession } from "./client.ts";

/** A fetch that never answers, and rejects like the browser when its signal aborts. */
function stalledFetch() {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  );
}

describe("previewSession", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("a build that does not answer within the client timeout is an error, so Today shows its error state", async () => {
    vi.stubGlobal("fetch", stalledFetch());
    const result = previewSession(15, "phone", new AbortController().signal);
    await vi.advanceTimersByTimeAsync(PREVIEW_TIMEOUT_MS);
    await expect(result).resolves.toEqual({ kind: "error" });
  });

  it("a 502 from the hosting proxy is an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("upstream request failed", { status: 502 })));
    await expect(previewSession(15, "phone", new AbortController().signal)).resolves.toEqual({ kind: "error" });
  });

  it("a preview the screen abandoned (chips changed) rejects instead of reporting an error", async () => {
    vi.stubGlobal("fetch", stalledFetch());
    const caller = new AbortController();
    const result = previewSession(15, "phone", caller.signal);
    caller.abort();
    await expect(result).rejects.toThrow("aborted");
  });
});
