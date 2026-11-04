// BL-0044 regression (staging hang of POST /sessions/build): the Today screen fires several dry-run builds at once.
// Through a transaction-mode pooler (test-pooler.ts, Supavisor's behaviour) and the real privileged pool (max 3),
// every build must answer, for a learner who sees no skills and for an admin who sees all of them.
// Integration, local database with the synced content; skipped without one unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFsrsAdapter, DEFAULT_PARAMS } from "@polymath/scheduler";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, TEST_DB_URL, testSql } from "@/lib/api/test-db";
import { startFakePooler, type FakePooler } from "@/lib/api/test-pooler";
import { connectPrivileged, type Sql } from "@/server/privileged/db";
import { createIdempotencyStore } from "@/server/privileged/idempotency-store";
import { ensurePoolStock } from "@/server/privileged/pool-store";
import { createRateLimitStore } from "@/server/privileged/rate-limit-store";
import { createSessionStore } from "@/server/privileged/session-store";
import { createStateStore } from "@/server/privileged/state-store";
import { buildSession, type SessionDeps } from "./sessions.ts";

const admin = testSql();
const reachable = await dbReachable(admin);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;

const BOUND_MS = 5000;
let pooler: FakePooler;
let pool: Sql;
let learner = "";
let founder = "";

function route(userId: string) {
  const deps: SessionDeps = {
    store: createSessionStore(pool),
    state: async () => ({ store: createStateStore(pool), fsrs: await createFsrsAdapter(), params: DEFAULT_PARAMS }),
    pool: (u, keys, now) => ensurePoolStock(pool, u, keys, now),
    now: () => new Date(),
  };
  const api: ApiDeps = {
    authenticate: async () => ({ userId }),
    idempotency: () => createIdempotencyStore(pool),
    rateLimit: () => createRateLimitStore(pool),
    logger: silent,
  };
  return defineRoute("buildSession", (c) => buildSession(c, deps), api);
}

/** "200", or "503 item_pool_empty" when visible skills (other test files add some) have no items for this user. */
const ANSWERED = ["200", "503 item_pool_empty"];

async function build(userId: string, dryRun: boolean): Promise<string> {
  const req = new Request("http://localhost/api/v1/sessions/build", {
    method: "POST",
    headers: { "content-type": "application/json", ...(dryRun ? {} : { "idempotency-key": randomUUID() }) },
    body: JSON.stringify({ available_minutes: 15, context: "phone", ...(dryRun ? { dry_run: true } : {}) }),
  });
  let timer: NodeJS.Timeout | undefined;
  const status = await Promise.race([
    route(userId)(req, { params: Promise.resolve({}) }).then(async (r) =>
      r.ok ? String(r.status) : `${r.status} ${String(((await r.json()) as { code?: unknown }).code)}`,
    ),
    new Promise<"timeout">((resolve) => (timer = setTimeout(() => resolve("timeout"), BOUND_MS))),
  ]);
  clearTimeout(timer);
  return status;
}

describe.skipIf(!reachable)("buildSession under concurrency behind a transaction pooler", () => {
  beforeAll(async () => {
    pooler = await startFakePooler(TEST_DB_URL);
    pool = connectPrivileged(pooler.url);
    learner = await createTestUser(admin);
    founder = await createTestUser(admin);
    await admin`insert into public.admin_users (user_id) values (${founder})`;
  });

  afterAll(async () => {
    await admin`delete from public.admin_users where user_id = ${founder}`;
    for (const u of [learner, founder]) await deleteTestUser(admin, u);
    await pool.end({ timeout: 1 });
    await pooler.close();
    await admin.end();
  });

  it(`five previews each for a learner and an admin at once, plus a stored build, all answer within ${BOUND_MS} ms`, async () => {
    const statuses = await Promise.all([
      ...Array.from({ length: 5 }, () => build(learner, true)),
      ...Array.from({ length: 5 }, () => build(founder, true)),
      build(learner, false),
    ]);
    for (const s of statuses) expect(ANSWERED).toContain(s);
    // The pool is still usable afterwards (on staging one hung build stalled every later request of the instance).
    expect(ANSWERED).toContain(await build(founder, true));
  }, 30_000);
});
