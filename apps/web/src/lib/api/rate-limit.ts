// Per-user rate limits (api.openapi.yaml "Rate limits", doc 03 ER-8) over the Postgres token
// bucket. Capacity is the burst, refill the sustained rate.
import { ApiError } from "./errors.ts";
import type { RateLimitStore } from "@/server/privileged/rate-limit-store";

export type Bucket = { name: string; capacity: number; refillPerS: number };

const perMinute = (name: string, n: number): Bucket => ({ name, capacity: n, refillPerS: n / 60 });

export const BUCKETS = {
  api: perMinute("api", 120),
  attempts: perMinute("attempts", 60),
  tutor: perMinute("tutor", 20),
  session_preview: perMinute("session_preview", 10),
  uploads: { name: "uploads", capacity: 30, refillPerS: 30 / 3600 },
} as const satisfies Record<string, Bucket>;

/** Throws `rate_limited` (429 with Retry-After) when the bucket is empty. */
export async function takeRateLimit(store: RateLimitStore, userId: string, bucket: Bucket, cost = 1): Promise<void> {
  const wait = await store.take(userId, bucket.name, bucket.capacity, bucket.refillPerS, cost);
  if (wait > 0) throw new ApiError("rate_limited", { retryAfterS: Math.max(1, Math.ceil(wait)) });
}
