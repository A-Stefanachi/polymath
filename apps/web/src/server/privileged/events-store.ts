// public.events inserts (doc 11 section 9). `at` is never passed: the column default now() makes the
// server clock authoritative (FR-110). Replays of a client_event_id are ignored (unique per user).
import type { Sql } from "./db.ts";

export type EventRow = { userId: string; name: string; props: Record<string, unknown>; clientEventId?: string | undefined };
export type EventStore = { insert(rows: EventRow[]): Promise<void> };

/** Inserts inside whatever transaction or connection `sql` is. */
export async function insertEvents(sql: Sql, rows: EventRow[]): Promise<void> {
  if (rows.length === 0) return;
  const values = rows.map((r) => ({
    user_id: r.userId,
    name: r.name,
    props: sql.json(r.props as Parameters<Sql["json"]>[0]),
    client_event_id: r.clientEventId ?? null,
  }));
  await sql`
    insert into public.events ${sql(values, "user_id", "name", "props", "client_event_id")}
    on conflict (user_id, client_event_id) where client_event_id is not null do nothing`;
}

export function createEventStore(sql: Sql): EventStore {
  return { insert: (rows) => insertEvents(sql, rows) };
}
