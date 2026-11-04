// Reads for the serve gate (BL-0025; doc 04 items, AR-DM-4, FR-060). This is the only module of the
// web app that selects `items.rendered` with privileges. It never selects params,
// verification_report or item_secrets, so those columns cannot reach a response by accident.
import type { Sql } from "./db.ts";
import { insertEvents } from "./events-store.ts";

export type ServeItemRow = {
  id: string;
  template_key: string;
  skill_key: string;
  task_kind: string;
  grader_type: string;
  rendered: unknown;
  difficulty_est: number | null;
  status: string;
  template_status: string;
  pool: string;
  /** null = shared pool item. */
  owner_id: string | null;
  est_seconds: number | null;
};

export type ServeTaskRow = {
  id: string;
  session_id: string;
  position: number;
  task_kind: string;
  skill_key: string | null;
  project_step_key: string | null;
  item_id: string | null;
  status: string;
  est_seconds: number;
  reason: string | null;
  assessment_kind: string | null;
};

export type ServeStore = {
  isAdmin(userId: string): Promise<boolean>;
  findItem(itemId: string): Promise<ServeItemRow | null>;
  /** Only a task owned by `userId`; another user's task is null. */
  findTask(userId: string, taskId: string): Promise<ServeTaskRow | null>;
  /** Writes the `task_shown` event (doc 11 section 9) that the serve audit counts. */
  recordShown(userId: string, props: Record<string, unknown>): Promise<void>;
};

export function createServeStore(sql: Sql): ServeStore {
  return {
    isAdmin: async (userId) =>
      (await sql<{ ok: boolean }[]>`select exists (select 1 from public.admin_users where user_id = ${userId}) as ok`)[0]?.ok === true,
    findItem: async (itemId) =>
      (
        await sql<ServeItemRow[]>`
          select i.id, i.template_key, t.skill_key, t.task_kind::text as task_kind, t.grader_type::text as grader_type,
                 i.rendered, i.difficulty_est, i.status::text as status, t.status::text as template_status,
                 t.pool, i.user_id as owner_id, t.est_seconds
            from public.items i
            join public.item_templates t on t.key = i.template_key and t.version = i.template_version
           where i.id = ${itemId}`
      )[0] ?? null,
    findTask: async (userId, taskId) =>
      (
        await sql<ServeTaskRow[]>`
          select id, session_id, position, task_kind::text as task_kind, skill_key, project_step_key, item_id,
                 status::text as status, est_seconds, reason, assessment_kind
            from public.session_tasks
           where id = ${taskId} and user_id = ${userId}`
      )[0] ?? null,
    recordShown: (userId, props) => insertEvents(sql, [{ userId, name: "task_shown", props }]),
  };
}

/**
 * SM-06 / BL-0025: "served items with status<>verified". A serve is a `task_shown` event, which
 * getTask writes in the same request that passed the gate. Rows counted are events whose item is
 * not verified, except the founder's own preview of an unreviewed item (admin + draft or
 * needs_human_review), and an item retired after it was served (retired_at after the event).
 * Expected result: 0. BL-0032 calls this.
 */
export async function countUnverifiedServes(sql: Sql, since?: Date): Promise<number> {
  const rows = await sql<{ n: number }[]>`
    select count(*)::int as n
      from public.events e
      join public.items i on i.id = (e.props->>'item_id')::uuid
     where e.name = 'task_shown'
       and i.status <> 'verified'
       and (${since ?? null}::timestamptz is null or e.at >= ${since ?? null}::timestamptz)
       and not (i.status in ('draft', 'needs_human_review')
                and exists (select 1 from public.admin_users a where a.user_id = e.user_id))
       and not (i.status = 'retired' and i.retired_at is not null and e.at <= i.retired_at)`;
  return rows[0]?.n ?? 0;
}
