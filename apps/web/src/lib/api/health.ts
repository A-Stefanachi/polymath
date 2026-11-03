// getHealth (api.openapi.yaml; doc 03 section 10): 200 when the database answers, 503 when it does
// not. The worker is "queue-only" while WORKER_URL is unset (00a I2), so its heartbeat cannot
// degrade the status then; once a worker is expected, a missing or stale heartbeat does.
import { privilegedDb } from "@/server/privileged/db";
import { createHealthStore, type HealthStore } from "@/server/privileged/health-store";
import { json } from "./route.ts";

/** doc 03 section 10: "Worker down: no heartbeat > 5 min". */
export const WORKER_STALE_AFTER_S = 300;

export async function healthResponse(
  store: HealthStore = createHealthStore(privilegedDb()),
  env: Record<string, string | undefined> = process.env,
): Promise<Response> {
  const { dbOk, workerHeartbeatAgeS } = await store.probe();
  // `version` is the deployed git sha (doc 03 section 9, GIT_SHA).
  const version = env.GIT_SHA || "dev";
  const workerExpected = Boolean(env.WORKER_URL);
  const workerStale = workerHeartbeatAgeS === null || workerHeartbeatAgeS > WORKER_STALE_AFTER_S;
  const body = {
    status: dbOk && !(workerExpected && workerStale) ? "ok" : "degraded",
    version,
    db: dbOk ? "ok" : "down",
    worker_heartbeat_age_s: workerHeartbeatAgeS,
  };
  return json(body, dbOk ? 200 : 503);
}
