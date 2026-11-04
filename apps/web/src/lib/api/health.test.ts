// getHealth (BL-0022): database reachability, git sha and the worker heartbeat; the worker is
// "queue-only" while WORKER_URL is unset (00a I2).
import { describe, expect, it } from "vitest";
import { healthResponse, WORKER_STALE_AFTER_S } from "./health.ts";

const store = (probe: { dbOk: boolean; workerHeartbeatAgeS: number | null }) => ({ probe: async () => probe });
const read = async (res: Response) => (await res.json()) as Record<string, unknown>;

describe("healthResponse", () => {
  it("is ok with the sha and heartbeat age when the database answers", async () => {
    const res = await healthResponse(store({ dbOk: true, workerHeartbeatAgeS: 4 }), { GIT_SHA: "abc1234", WORKER_URL: "http://w" });
    expect(res.status).toBe(200);
    expect(await read(res)).toEqual({ status: "ok", version: "abc1234", db: "ok", worker_heartbeat_age_s: 4 });
  });

  it("stays ok without a heartbeat while no worker is expected (queue-only)", async () => {
    const res = await healthResponse(store({ dbOk: true, workerHeartbeatAgeS: null }), {});
    expect(res.status).toBe(200);
    expect(await read(res)).toMatchObject({ status: "ok", version: "dev", worker_heartbeat_age_s: null });
  });

  it("is degraded (still 200) when an expected worker is silent for more than 5 minutes", async () => {
    const env = { WORKER_URL: "http://w" };
    expect((await read(await healthResponse(store({ dbOk: true, workerHeartbeatAgeS: WORKER_STALE_AFTER_S }), env)))["status"]).toBe("ok");
    const stale = await healthResponse(store({ dbOk: true, workerHeartbeatAgeS: WORKER_STALE_AFTER_S + 1 }), env);
    expect(stale.status).toBe(200);
    expect((await read(stale))["status"]).toBe("degraded");
    expect((await read(await healthResponse(store({ dbOk: true, workerHeartbeatAgeS: null }), env)))["status"]).toBe("degraded");
  });

  it("answers 503 degraded with db down when the database is unreachable", async () => {
    const res = await healthResponse(store({ dbOk: false, workerHeartbeatAgeS: null }), {});
    expect(res.status).toBe(503);
    expect(await read(res)).toMatchObject({ status: "degraded", db: "down" });
  });
});
