// Token bucket in Postgres (doc 03 ER-8): app_private.rate_limit_take is the only writer of
// app_private.rate_limits and callable by the service role only.
import type { Sql } from "./db.ts";

export type RateLimitStore = {
  /** Takes `cost` tokens; returns 0 when allowed, otherwise the seconds to wait. */
  take(userId: string, bucket: string, capacity: number, refillPerS: number, cost: number): Promise<number>;
};

export function createRateLimitStore(sql: Sql): RateLimitStore {
  return {
    take: async (userId, bucket, capacity, refillPerS, cost) => {
      const rows = await sql<{ wait: number }[]>`
        select app_private.rate_limit_take(${userId}::uuid, ${bucket}, ${capacity}::float8, ${refillPerS}::float8, ${cost}::float8) as wait`;
      return Number(rows[0]?.wait ?? 0);
    },
  };
}
