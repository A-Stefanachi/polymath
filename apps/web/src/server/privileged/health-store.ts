// Health probe (doc 03 section 10): database reachability and the worker heartbeat age.
import type { Sql } from "./db.ts";

export type HealthProbe = { dbOk: boolean; workerHeartbeatAgeS: number | null };
export type HealthStore = { probe(): Promise<HealthProbe> };

export function createHealthStore(sql: Sql): HealthStore {
  return {
    probe: async () => {
      try {
        const rows = await sql<{ age: number | null }[]>`select app_private.worker_heartbeat_age_s() as age`;
        const age = rows[0]?.age;
        return { dbOk: true, workerHeartbeatAgeS: age === null || age === undefined ? null : Number(age) };
      } catch {
        // The cause stays out of the response; the caller logs the outcome class.
        return { dbOk: false, workerHeartbeatAgeS: null };
      }
    },
  };
}
