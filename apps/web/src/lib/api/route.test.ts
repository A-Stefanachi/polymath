// BL-0022 acceptance: strict bodies, size cap, error envelope, idempotency (doc 03 section 11,
// ST-API-05, ST-API-07, ST-API-12) and the rate limit (ER-8). Database tests need the local
// stack (POLYMATH_TEST_DB_URL) and are skipped without one unless REQUIRE_DB=1.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MAX_BODY_BYTES } from "./body.ts";
import { ApiError } from "./errors.ts";
import { defineRoute, json, type ApiDeps } from "./route.ts";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "./test-db.ts";
import { createIdempotencyStore } from "@/server/privileged/idempotency-store";
import { createRateLimitStore } from "@/server/privileged/rate-limit-store";
import { logger } from "@/lib/logger";

const USER = "00000000-0000-4000-8000-000000000001";
const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const quiet = logger.child({});
const silent = { ...quiet, info: () => undefined, error: () => undefined } as typeof logger;
const allowAll = { take: async () => 0 };
const neverStored = {
  claim: async () => ({ kind: "new" as const }),
  complete: async () => undefined,
  release: async () => undefined,
};

function deps(over: Partial<ApiDeps> = {}, userId = USER): ApiDeps {
  return {
    authenticate: async () => ({ userId }),
    idempotency: () => neverStored,
    rateLimit: () => allowAll,
    logger: silent,
    ...over,
  };
}

const URL_START = "http://localhost/api/v1/user-projects";
function post(body: BodyInit, headers: Record<string, string> = {}): Request {
  return new Request(URL_START, { method: "POST", body, headers: { "content-type": "application/json", ...headers } });
}
const validBody = JSON.stringify({ project_key: "prj.L0.blink" });

// startProject: POST with a strict body and an Idempotency-Key.
const start = (over: Partial<ApiDeps> = {}, userId = USER) =>
  defineRoute("startProject", async () => json({ ok: true }, 201), deps(over, userId));

describe("strict request bodies (ST-API-05)", () => {
  it("rejects an unknown field user_id with 400 validation_failed", async () => {
    const res = await start()(post(JSON.stringify({ project_key: "prj.L0.blink", user_id: USER })));
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    const body = (await res.json()) as { code: string; request_id: string; errors: { message: string }[] };
    expect(body.code).toBe("validation_failed");
    expect(body.request_id).toBe(res.headers.get("x-request-id"));
    expect(JSON.stringify(body.errors)).toContain("user_id");
  });

  it("rejects a malformed body and an invalid value, and accepts a valid one", async () => {
    expect((await start()(post("{not json"))).status).toBe(400);
    expect((await start()(post(JSON.stringify({ project_key: "nope" })))).status).toBe(400);
    expect((await start()(post(validBody))).status).toBe(201);
  });
});

describe("body size cap (ST-API-12)", () => {
  const padded = (bytes: number) => {
    const head = '{"project_key":"prj.L0.blink","pad":"';
    return head + "x".repeat(bytes - head.length - 2) + '"}';
  };

  it("returns 413 payload_too_large for a 300 KB body", async () => {
    const res = await start()(post(padded(300 * 1024)));
    expect(res.status).toBe(413);
    expect(((await res.json()) as { code: string }).code).toBe("payload_too_large");
  });

  it("returns 413 when Content-Length understates the real size", async () => {
    const res = await start()(post(padded(MAX_BODY_BYTES + 1), { "content-length": "100" }));
    expect(res.status).toBe(413);
  });

  it("accepts the cap itself and refuses one byte more", async () => {
    // Both are too big for the schema (unknown field), so 400 means the size check passed.
    expect((await start()(post(padded(MAX_BODY_BYTES)))).status).toBe(400);
    expect((await start()(post(padded(MAX_BODY_BYTES + 1)))).status).toBe(413);
  });
});

describe("authentication and errors", () => {
  it("maps an authentication failure to 401 unauthenticated without running the handler", async () => {
    let ran = false;
    const route = defineRoute("startProject", async () => ((ran = true), json({})), deps({
      authenticate: async () => {
        throw new ApiError("unauthenticated");
      },
    }));
    const res = await route(post(validBody));
    expect(res.status).toBe(401);
    expect(ran).toBe(false);
  });

  it("hides the cause of an unexpected failure behind 500 internal", async () => {
    const route = defineRoute("startProject", async () => {
      throw new Error("connection to db.secret.example failed");
    }, deps());
    const res = await route(post(validBody));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain('"code":"internal"');
    expect(text).not.toContain("secret.example");
  });

  it("rejects an Idempotency-Key outside 8 to 128 characters", async () => {
    expect((await start()(post(validBody, { "idempotency-key": "short" }))).status).toBe(400);
    expect((await start()(post(validBody, { "idempotency-key": "k".repeat(129) }))).status).toBe(400);
  });

  it("answers 429 with Retry-After when the bucket is empty", async () => {
    const res = await start({ rateLimit: () => ({ take: async () => 2.2 }) })(post(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3");
  });
});

describe.skipIf(!reachable)("against the local database", () => {
  let userId = "";
  beforeAll(async () => {
    userId = await createTestUser(sql);
  });
  afterAll(async () => {
    if (userId) await deleteTestUser(sql, userId);
    await sql.end();
  });

  const real = () => ({
    idempotency: () => createIdempotencyStore(sql),
    rateLimit: () => createRateLimitStore(sql),
  });

  it("returns 409 idempotency_key_reuse for the same key with a different body", async () => {
    let runs = 0;
    const route = defineRoute("startProject", async () => ((runs += 1), json({ n: runs }, 201)), deps(real(), userId));
    const key = { "idempotency-key": `key-${crypto.randomUUID()}` };
    expect((await route(post(validBody, key))).status).toBe(201);
    const res = await route(post(JSON.stringify({ project_key: "prj.L1.other" }), key));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("idempotency_key_reuse");
    expect(runs).toBe(1);
  });

  it("returns the stored response for the same key and body, without running again", async () => {
    let runs = 0;
    const route = defineRoute("startProject", async () => ((runs += 1), json({ n: runs }, 201)), deps(real(), userId));
    const key = { "idempotency-key": `key-${crypto.randomUUID()}` };
    const first = await route(post(validBody, key));
    // The hash covers the parsed body, so extra whitespace is the same request.
    const second = await route(post(` ${validBody} `, key));
    expect(first.headers.get("idempotent-replay")).toBeNull();
    expect(second.status).toBe(201);
    expect(second.headers.get("idempotent-replay")).toBe("true");
    expect(await second.json()).toEqual({ n: 1 });
    expect(runs).toBe(1);
  });

  it("does not store a 5xx, so a retry after a system error runs again (IR-6)", async () => {
    let runs = 0;
    const route = defineRoute("startProject", async () => {
      runs += 1;
      throw new Error("boom");
    }, deps(real(), userId));
    const key = { "idempotency-key": `key-${crypto.randomUUID()}` };
    expect((await route(post(validBody, key))).status).toBe(500);
    expect((await route(post(validBody, key))).status).toBe(500);
    expect(runs).toBe(2);
  });

  it("answers 409 idempotency_in_progress while an identical request is unfinished", async () => {
    const store = createIdempotencyStore(sql);
    const key = `key-${crypto.randomUUID()}`;
    expect((await store.claim(userId, key, "POST", "/p", "h1")).kind).toBe("new");
    expect((await store.claim(userId, key, "POST", "/p", "h1")).kind).toBe("in_progress");
    expect((await store.claim(userId, key, "POST", "/p", "h2")).kind).toBe("reuse");
  });

  it("limits a bucket to its capacity and then returns the wait (ER-8)", async () => {
    const store = createRateLimitStore(sql);
    const bucket = `test-${crypto.randomUUID()}`;
    expect(await store.take(userId, bucket, 2, 0.01, 1)).toBe(0);
    expect(await store.take(userId, bucket, 2, 0.01, 1)).toBe(0);
    expect(await store.take(userId, bucket, 2, 0.01, 1)).toBeGreaterThan(0);
  });
});
