// public.idempotency_keys access (doc 03 section 11.1, IR-2). The table has no RLS policy, so only
// this privileged module can touch it; every statement is scoped by user_id.
import type { Sql } from "./db.ts";

/** A claim with no stored response younger than this is another request still running. */
export const IN_PROGRESS_WINDOW_S = 60;

export type IdempotencyClaim =
  | { kind: "new" }
  | { kind: "replay"; status: number; response: unknown }
  | { kind: "in_progress" }
  | { kind: "reuse" };

export type IdempotencyStore = {
  claim(userId: string, key: string, method: string, path: string, hash: string): Promise<IdempotencyClaim>;
  complete(userId: string, key: string, status: number, response: unknown): Promise<void>;
  /** Drops an unfinished claim (after a 5xx) so a retry with the same key runs again. */
  release(userId: string, key: string): Promise<void>;
};

type Existing = { request_hash: string; status_code: number | null; response: unknown; age_s: number };

export function createIdempotencyStore(sql: Sql): IdempotencyStore {
  return {
    claim: (userId, key, method, path, hash) =>
      sql.begin(async (tx): Promise<IdempotencyClaim> => {
        await tx`delete from public.idempotency_keys where user_id = ${userId} and key = ${key} and expires_at < now()`;
        const inserted = await tx`
          insert into public.idempotency_keys (user_id, key, method, path, request_hash)
          values (${userId}, ${key}, ${method}, ${path}, ${hash})
          on conflict do nothing returning key`;
        if (inserted.length > 0) return { kind: "new" };
        const rows = await tx<Existing[]>`
          select request_hash, status_code, response, extract(epoch from now() - created_at)::float8 as age_s
            from public.idempotency_keys where user_id = ${userId} and key = ${key} for update`;
        const row = rows[0];
        if (!row) return { kind: "in_progress" }; // released a moment ago; the client retries
        if (row.request_hash !== hash) return { kind: "reuse" };
        if (row.status_code !== null) return { kind: "replay", status: row.status_code, response: row.response };
        if (row.age_s < IN_PROGRESS_WINDOW_S) return { kind: "in_progress" };
        await tx`update public.idempotency_keys set created_at = now() where user_id = ${userId} and key = ${key}`;
        return { kind: "new" };
      }),
    complete: async (userId, key, status, response) => {
      await sql`
        update public.idempotency_keys set status_code = ${status}, response = ${sql.json(response as never)}
         where user_id = ${userId} and key = ${key}`;
    },
    release: async (userId, key) => {
      await sql`delete from public.idempotency_keys where user_id = ${userId} and key = ${key} and status_code is null`;
    },
  };
}
