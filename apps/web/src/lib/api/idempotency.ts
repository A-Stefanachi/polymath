// Idempotency-Key handling (doc 03 section 11.1, IR-1/IR-2, ADR-016). The key is scoped to the
// user; the request hash covers method, path and the canonical body, so reordering JSON keys is
// not a different request. Only answers below 500 are stored: a system error must not be replayed
// to a client that retries with the same key (IR-6).
import { createHash } from "node:crypto";
import { ApiError, problemResponse } from "./errors.ts";
import type { IdempotencyStore } from "@/server/privileged/idempotency-store";

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function requestHash(method: string, path: string, body: unknown): string {
  return createHash("sha256").update(`${method}\n${path}\n${canonicalJson(body ?? null)}`).digest("hex");
}

/** The header value, or undefined when absent. 8 to 128 characters (api.openapi.yaml IdempotencyKey). */
export function readIdempotencyKey(request: Request): string | undefined {
  const key = request.headers.get("idempotency-key");
  if (key === null) return undefined;
  if (key.length < 8 || key.length > 128) {
    throw new ApiError("validation_failed", { errors: [{ field: "Idempotency-Key", message: "must be 8 to 128 characters" }] });
  }
  return key;
}

export type IdempotentCall = { userId: string; key: string; method: string; path: string; body: unknown; requestId: string };

export async function withIdempotency(
  store: IdempotencyStore,
  call: IdempotentCall,
  run: () => Promise<Response>,
): Promise<Response> {
  const { userId, key, requestId } = call;
  const claim = await store.claim(userId, key, call.method, call.path, requestHash(call.method, call.path, call.body));
  if (claim.kind === "reuse") throw new ApiError("idempotency_key_reuse");
  if (claim.kind === "in_progress") throw new ApiError("idempotency_in_progress", { retryAfterS: 1 });
  if (claim.kind === "replay") {
    const headers = new Headers({
      "Content-Type": claim.status >= 400 ? "application/problem+json" : "application/json",
      "Idempotent-Replay": "true",
      "X-Request-Id": requestId,
    });
    return new Response(JSON.stringify(claim.response), { status: claim.status, headers });
  }
  let response: Response;
  try {
    response = await run();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) {
      await store.release(userId, key);
      throw error;
    }
    response = problemResponse(error, requestId);
  }
  if (response.status >= 500) {
    await store.release(userId, key);
    return response;
  }
  const text = await response.clone().text();
  await store.complete(userId, key, response.status, text === "" ? null : (JSON.parse(text) as unknown));
  return response;
}
