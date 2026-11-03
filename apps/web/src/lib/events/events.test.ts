// BL-0024 acceptance: the event catalogue, emitEvent and postEvents. The database tests need the
// local stack and are skipped without one unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createEventStore, type EventStore } from "@/server/privileged/events-store";
import { emitEvent } from "./emit.ts";
import { acceptEvents } from "./post-events.ts";
import { propsSchema } from "./schemas.ts";

const DOC = new URL("../../../../../polymath-app-spec/docs/11-evaluation-and-experiment-plan.md", import.meta.url);
function docEventNames(): string[] {
  const text = readFileSync(DOC, "utf8");
  const section = text.slice(text.indexOf("## 9. Event catalogue"), text.indexOf("## 10. Dashboards"));
  return section
    .split("\n")
    .filter((l) => l.startsWith("| `"))
    .flatMap((row) => [...(row.split("|")[1] ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? ""));
}

const noStore: EventStore = { insert: async () => undefined };

describe("event catalogue and emitEvent", () => {
  it("every event name in doc 11 section 9 has a props schema that accepts empty props", () => {
    const names = docEventNames();
    expect(names.length).toBeGreaterThan(60);
    for (const name of names) expect(propsSchema(name).safeParse({}).success, name).toBe(true);
  });

  it("emitting an unknown event name throws and writes nothing", async () => {
    const writes: unknown[] = [];
    const store: EventStore = { insert: async (rows) => void writes.push(rows) };
    await expect(emitEvent("not_in_the_catalogue", {}, { userId: randomUUID(), store })).rejects.toThrow(/unknown event name/);
    expect(writes).toEqual([]);
  });

  it("props outside the event's keys, or over 8 KB, throw without echoing values", async () => {
    const ctx = { userId: randomUUID(), store: noStore };
    await expect(emitEvent("consent_recorded", { research: true, free_text: "secret-value" }, ctx)).rejects.toThrow(/free_text/);
    await expect(emitEvent("consent_recorded", { research: true, free_text: "secret-value" }, ctx)).rejects.not.toThrow(/secret-value/);
    await expect(emitEvent("tier_attained", { node: "x".repeat(8100) }, ctx)).rejects.toThrow(/invalid props/);
    await expect(emitEvent("tier_attained", { node: "x".repeat(7900) }, ctx)).resolves.toBeUndefined();
  });
});

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;

describe.skipIf(!reachable)("postEvents (database)", () => {
  let me = "";
  const deps = (): ApiDeps => ({
    authenticate: async () => ({ userId: me }),
    idempotency: () => ({ claim: async () => ({ kind: "new" as const }), complete: async () => undefined, release: async () => undefined }),
    rateLimit: () => ({ take: async () => 0 }),
    logger: silent,
  });
  const route = () => defineRoute("postEvents", (ctx) => acceptEvents(ctx, createEventStore(sql)), deps());
  const post = (events: unknown[]) =>
    route()(new Request("http://localhost/api/v1/events", { method: "POST", body: JSON.stringify({ events }), headers: { "content-type": "application/json" } }));
  const event = (over: Record<string, unknown> = {}) => ({ client_event_id: randomUUID(), name: "app_opened", at: "2020-01-02T03:04:05Z", props: { context: "phone" }, ...over });
  const count = async () => Number((await sql`select count(*) from public.events where user_id = ${me}`)[0]?.count);

  beforeAll(async () => {
    me = await createTestUser(sql);
  });
  afterAll(async () => {
    await sql`delete from public.events where user_id = ${me}`;
    await deleteTestUser(sql, me);
    await sql.end();
  });

  it("5 events answer 202 and write 5 rows whose `at` is the server time, with the client time in props.client_at", async () => {
    const before = Date.now();
    const res = await post(Array.from({ length: 5 }, () => event()));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: 5 });
    const rows = await sql<{ at: Date; props: Record<string, unknown> }[]>`select at, props from public.events where user_id = ${me}`;
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.at.getTime()).toBeGreaterThanOrEqual(before - 2000);
      expect(row.at.getTime()).toBeLessThanOrEqual(Date.now() + 2000);
      expect(row.props).toEqual({ context: "phone", client_at: "2020-01-02T03:04:05Z" });
    }
  });

  it("a replayed client_event_id leaves one row", async () => {
    const e = event({ name: "app_opened", props: { offline: true } });
    const start = await count();
    expect((await post([e])).status).toBe(202);
    expect((await post([e])).status).toBe(202);
    expect(await count()).toBe(start + 1);
  });

  it("the batch limit: 100 events (the OpenAPI maxItems) are accepted, 101 and 501 are refused with nothing written", async () => {
    const start = await count();
    expect((await post(Array.from({ length: 100 }, () => event()))).status).toBe(202);
    expect(await count()).toBe(start + 100);
    expect((await post(Array.from({ length: 101 }, () => event()))).status).toBe(400);
    expect((await post(Array.from({ length: 501 }, () => event()))).status).toBe(400);
    expect(await count()).toBe(start + 100);
  });

  it("an unknown name, a server-only name or unknown props refuse the whole batch", async () => {
    const start = await count();
    for (const bad of [
      event({ name: "not_in_the_catalogue" }),
      event({ name: "consent_recorded", props: { research: true } }),
      event({ name: "safety_ack", props: {} }),
      event({ props: { notes: "free text" } }),
    ]) {
      const res = await post([event(), bad]);
      expect(res.status).toBe(400);
    }
    expect(await count()).toBe(start);
  });

  it("a client_at inside props cannot replace the event time; the envelope's `at` wins", async () => {
    const res = await post([event({ props: { client_at: "1999-01-01T00:00:00Z" }, at: "2021-05-05T05:05:05Z" })]);
    expect(res.status).toBe(202);
    const rows = await sql<{ props: { client_at: string } }[]>`select props from public.events where user_id = ${me} and props->>'client_at' = '2021-05-05T05:05:05Z'`;
    expect(rows).toHaveLength(1);
  });
});
