// BL-0023 acceptance: getProfile / updateProfile (FR-002, ST-API-05) against the local database.
// Skipped without a database unless REQUIRE_DB=1.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createProfileStore } from "@/server/privileged/profile-store";
import { CONSENT_VERSION } from "./consent.ts";
import { isTimeZone, readProfile, writeProfile } from "./profile.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;
const store = createProfileStore(sql);

let me = "";
let other = "";
const deps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => ({ claim: async () => ({ kind: "new" as const }), complete: async () => undefined, release: async () => undefined }),
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
const get = (id: string) => defineRoute("getProfile", (ctx) => readProfile(ctx, store), deps(id));
const patch = (id: string) => defineRoute("updateProfile", (ctx) => writeProfile(ctx, store), deps(id));
const send = (body: unknown, id = me) =>
  patch(id)(new Request("http://localhost/api/v1/profile", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
const read = async (id = me) => (await get(id)(new Request("http://localhost/api/v1/profile"))).json() as Promise<Record<string, unknown>>;

describe.skipIf(!reachable)("profile routes (database)", () => {
  beforeAll(async () => {
    me = await createTestUser(sql);
    other = await createTestUser(sql);
  });
  afterAll(async () => {
    await sql`delete from public.events where user_id = ${me}`;
    await deleteTestUser(sql, me);
    await deleteTestUser(sql, other);
    await sql.end();
  });

  it("GET returns the new profile with its defaults and not yet onboarded", async () => {
    const p = await read();
    expect(p).toMatchObject({ id: me, timezone: "UTC", weekly_minutes_target: 480, onboarded_at: null, adult_attested: false, cohort_key: null });
  });

  it("PATCH changes display name, time zone and weekly target, and GET returns them", async () => {
    const res = await send({ display_name: "  Ada ", timezone: "Europe/Rome", weekly_minutes_target: 300 });
    expect(res.status).toBe(200);
    expect(await read()).toMatchObject({ display_name: "Ada", timezone: "Europe/Rome", weekly_minutes_target: 300 });
  });

  it.each([
    [60, 200],
    [1200, 200],
    [59, 400],
    [0, 400],
    [1201, 400],
    [100000, 400],
  ])("weekly_minutes_target %i answers %i (FR-002)", async (value, status) => {
    expect((await send({ weekly_minutes_target: value })).status).toBe(status);
  });

  it("a rejected PATCH leaves the stored profile unchanged", async () => {
    await send({ weekly_minutes_target: 480 });
    const before = await read();
    for (const bad of [{ weekly_minutes_target: 0 }, { timezone: "Not/AZone" }, { display_name: "x".repeat(81) }, { weekly_minutes_target: 90, timezone: "nope" }]) {
      expect((await send(bad)).status).toBe(400);
    }
    expect(await read()).toEqual(before);
  });

  it("cohort_id, id and user_id in the body are rejected and the database is unchanged (guard_profile_update)", async () => {
    const before = await read();
    const [cohort] = await sql<{ id: string }[]>`insert into public.cohorts (key, name) values ('bl0023-test', 'BL-0023 test') returning id`;
    try {
      for (const bad of [{ cohort_id: cohort?.id }, { id: other }, { user_id: other }, { created_at: "2020-01-01T00:00:00Z" }]) {
        expect((await send(bad)).status).toBe(400);
      }
      const rows = await sql`select cohort_id from public.profiles where id = ${me}`;
      expect(rows[0]?.cohort_id).toBeNull();
      expect(await read()).toEqual(before);
    } finally {
      await sql`delete from public.cohorts where key = 'bl0023-test'`;
    }
  });

  it("consents of another version or purpose, or several purposes, are rejected and nothing is stored", async () => {
    for (const bad of [
      { research: { version: "1999-01", granted: true } },
      { marketing: { version: CONSENT_VERSION, granted: true } },
      { research: { version: CONSENT_VERSION, granted: true }, marketing: { version: CONSENT_VERSION, granted: true } },
      {},
    ]) {
      expect((await send({ consents: bad })).status).toBe(400);
    }
    const rows = await sql`select consents from public.profiles where id = ${me}`;
    expect(rows[0]?.consents).toEqual({});
    const events = await sql`select 1 from public.events where user_id = ${me} and name = 'consent_recorded'`;
    expect(events).toHaveLength(0);
  });

  it("a consent under the current version is stamped by the server and writes one consent_recorded event; repeating it writes none", async () => {
    const body = { consents: { research: { version: CONSENT_VERSION, granted: true, at: "1999-01-01T00:00:00Z" } } };
    const before = Date.now();
    expect((await send(body)).status).toBe(200);
    expect((await send(body)).status).toBe(200);
    const profile = (await read()) as { consents: { research: { version: string; granted: boolean; at: string } } };
    expect(profile.consents.research).toMatchObject({ version: CONSENT_VERSION, granted: true });
    expect(Date.parse(profile.consents.research.at)).toBeGreaterThanOrEqual(before - 2000);
    const events = await sql<{ props: unknown }[]>`select props from public.events where user_id = ${me} and name = 'consent_recorded'`;
    expect(events.map((e) => e.props)).toEqual([{ consent_version: CONSENT_VERSION, research: true }]);
  });

  it("a changed decision (withdrawal) replaces the record and adds a second event", async () => {
    expect((await send({ consents: { research: { version: CONSENT_VERSION, granted: false } } })).status).toBe(200);
    expect(((await read()) as { consents: { research: { granted: boolean } } }).consents.research.granted).toBe(false);
    const events = await sql`select 1 from public.events where user_id = ${me} and name = 'consent_recorded'`;
    expect(events).toHaveLength(2);
  });

  it("onboarded and adult_attested are set once and cannot be unset", async () => {
    expect((await send({ adult_attested: false })).status).toBe(400);
    await send({ adult_attested: true, onboarded: true });
    const first = await read();
    expect(first.onboarded_at).not.toBeNull();
    expect(first.adult_attested).toBe(true);
    await send({ onboarded: true });
    expect((await read()).onboarded_at).toBe(first.onboarded_at);
  });

  it("changes only the caller's own row", async () => {
    await send({ display_name: "Someone else" }, other);
    expect((await read()).display_name).toBe("Ada");
    expect((await read(other)).display_name).toBe("Someone else");
  });

  it("time and reminder fields round-trip and can be cleared with null", async () => {
    await send({ bedtime_local: "23:00", reminder_time_local: "07:30", reminder_prefs: { enabled: true, max_per_day: 1 } });
    expect(await read()).toMatchObject({ bedtime_local: "23:00", reminder_time_local: "07:30", reminder_prefs: { enabled: true, max_per_day: 1 } });
    await send({ bedtime_local: null });
    expect((await read()).bedtime_local).toBeNull();
  });
});

describe("isTimeZone", () => {
  it.each([["Europe/Rome", true], ["UTC", true], ["America/Argentina/Buenos_Aires", true], ["+01:00", false], ["Not/AZone", false], ["", false], ["Europe/Rome; drop", false]])(
    "%s -> %s",
    (zone, expected) => {
      expect(isTimeZone(zone)).toBe(expected);
    },
  );
});
