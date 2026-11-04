// Item pool stock and the pregenerate_items enqueue path (BL-0043; doc 03 sections 5.2 and 8.3, ADR-019).
// The session builder (BL-0044) calls `ensurePoolStock` before it picks items. The job carries ids and
// numbers only; the worker generates and verifies the items (rule 3), this module never creates one.
import type { Sql } from "./db.ts";

/** Stock target per user and skill, and the low-water mark under which a shortage job is enqueued. */
export type PoolConfig = { target: number; threshold: number };
export const DEFAULT_POOL_CONFIG: PoolConfig = { target: 6, threshold: 3 };

export const SHORTAGE_PRIORITY = 100;
export const REFILL_PRIORITY = 10;
const MAX_ATTEMPTS = 3; // doc 03 section 8.3 table
const TIMEOUT_S = 120;

/** Reads the stock target from an environment-like record; invalid values fall back to the defaults. */
export function poolConfigFrom(env: Record<string, string | undefined>): PoolConfig {
  const int = (v: string | undefined, d: number): number => {
    const n = Number(v);
    return v !== undefined && Number.isInteger(n) && n >= 1 && n <= 50 ? n : d;
  };
  const target = int(env["POOL_STOCK_TARGET"], DEFAULT_POOL_CONFIG.target);
  const threshold = Math.min(int(env["POOL_STOCK_THRESHOLD"], DEFAULT_POOL_CONFIG.threshold), target);
  return { target, threshold };
}

/** Unserved verified practice items owned by the user, per skill (same rule as the worker's pool.py). */
export async function countStock(sql: Sql, userId: string, skillKeys: string[]): Promise<Map<string, number>> {
  const rows = await sql<{ skill_key: string; n: number }[]>`
    select t.skill_key, count(i.id)::int as n
      from public.item_templates t
      left join public.items i on i.template_key = t.key and i.template_version = t.version
           and i.user_id = ${userId} and i.status = 'verified' and i.retired_at is null
           and not exists (select 1 from public.session_tasks st where st.item_id = i.id)
           and not exists (select 1 from public.attempts a where a.item_id = i.id)
     where t.skill_key in ${sql(skillKeys)} and t.status = 'verified' and t.pool = 'practice'
     group by t.skill_key`;
  return new Map(skillKeys.map((k) => [k, rows.find((r) => r.skill_key === k)?.n ?? 0]));
}

function hourStamp(now: Date): string {
  return now.toISOString().slice(0, 13).replace(/\D/g, ""); // yyyymmddhh
}

async function enqueue(
  sql: Sql,
  userId: string,
  skillKeys: string[],
  want: number,
  priority: number,
  dedupeKey: string,
): Promise<boolean> {
  const payload = { user_id: userId, skill_keys: skillKeys, want };
  const rows = await sql`
    insert into public.jobs (kind, payload, priority, dedupe_key, user_id, max_attempts, timeout_s)
    values ('pregenerate_items', ${sql.json(payload)}, ${priority}, ${dedupeKey}, ${userId}, ${MAX_ATTEMPTS}, ${TIMEOUT_S})
    on conflict (dedupe_key) where dedupe_key is not null and status in ('queued', 'running') do nothing
    returning id`;
  return rows.length > 0;
}

export type PoolCheck = { shortSkills: string[]; stock: Map<string, number>; enqueued: "shortage" | "refill" | null };

/**
 * Counts the user's stock for the skills a session needs. Any skill under `threshold` enqueues a
 * priority-100 shortage job for those skills (dedupe `pregen:{user}:{yyyymmddhh}:short`); otherwise a
 * skill under `target` enqueues the priority-10 refill (dedupe `pregen:{user}:{yyyymmddhh}`).
 * `enqueued` is null when nothing was needed or an equal job is already queued or running.
 */
export async function ensurePoolStock(
  sql: Sql,
  userId: string,
  skillKeys: string[],
  now: Date,
  config: PoolConfig = DEFAULT_POOL_CONFIG,
): Promise<PoolCheck> {
  const keys = [...new Set(skillKeys)];
  if (keys.length === 0) return { shortSkills: [], stock: new Map(), enqueued: null };
  const stock = await countStock(sql, userId, keys);
  const shortSkills = keys.filter((k) => (stock.get(k) ?? 0) < config.threshold);
  const base = `pregen:${userId}:${hourStamp(now)}`;
  if (shortSkills.length > 0) {
    const ok = await enqueue(sql, userId, shortSkills, config.target, SHORTAGE_PRIORITY, `${base}:short`);
    return { shortSkills, stock, enqueued: ok ? "shortage" : null };
  }
  const low = keys.filter((k) => (stock.get(k) ?? 0) < config.target);
  if (low.length === 0) return { shortSkills, stock, enqueued: null };
  const ok = await enqueue(sql, userId, low, config.target, REFILL_PRIORITY, base);
  return { shortSkills, stock, enqueued: ok ? "refill" : null };
}
