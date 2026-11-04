// Privileged access for item reports, quarantine and retirement (BL-0056; doc 07 sections 7 (G6) and 8,
// 00a D5, H16). Every write here is one transaction, so a report, its quarantine, the attempt flag and
// the event land together (quarantine within 1 s). It never touches skill_state or review_log: a flagged
// attempt is excluded from mastery by `grade.disputed` (state-store ELIGIBLE), not by rewriting state.
import type { Sql } from "./db.ts";
import { insertEvents } from "./events-store.ts";

export type FileReportInput = {
  userId: string;
  itemId: string;
  reason: string;
  note: string | null;
  /** Validated by the caller: owned by `userId` and about `itemId`. */
  attemptId: string | null;
  reportedByAdmin: boolean;
  /** Already validated `item_reported` props. */
  eventProps: Record<string, unknown>;
};
export type FileReportResult = { created: boolean; quarantined: boolean };

export type RetireInput = { itemId: string; adminId: string; reason: string; retireTemplate: boolean };
export type RetireResult = { status: string; templateRetired: boolean; replacedTasks: number; poolItemsRetired: number };

export type ReportRow = {
  id: string;
  item_id: string | null;
  target_type: string;
  tutor_message_id: string | null;
  template_key: string | null;
  reason: string;
  note: string | null;
  attempt_id: string | null;
  status: string;
  created_at: Date;
  resolved_at: Date | null;
};

export type ResolveInput = { reportId: string; adminId: string; status: "confirmed" | "dismissed"; retireItem: boolean };
export type ResolveResult = { report: ReportRow; retired: RetireResult | null } | "not_found" | "no_item";

export type ReportStore = {
  isAdmin(userId: string): Promise<boolean>;
  /** The attempt's item id when the attempt belongs to `userId`, else null. */
  attemptItem(userId: string, attemptId: string): Promise<string | null>;
  /** True when the user answered the item or already reported it: they may report it even once it is withdrawn. */
  hasAttempt(userId: string, itemId: string): Promise<boolean>;
  fileReport(input: FileReportInput): Promise<FileReportResult>;
  retire(input: RetireInput): Promise<RetireResult | null>;
  list(q: { status?: string | undefined; itemId?: string | undefined; limit: number; before?: { createdAt: Date; id: string } | undefined }): Promise<ReportRow[]>;
  resolve(input: ResolveInput): Promise<ResolveResult>;
};

/** Distinct reporters that flag an item for a reason other than a wrong answer (api.openapi.yaml reportItem). */
export const REPORTER_THRESHOLD = 3;

const REPORT_COLUMNS = (db: Sql) => db`r.id, r.item_id, r.target_type, r.tutor_message_id, i.template_key, r.reason, r.note,
  r.attempt_id, r.status::text as status, r.created_at, r.resolved_at`;

/**
 * Pending tasks that point at `itemId` get a fresh verified variant of the same skill, kind, grader and pool
 * (same template first) that the user has not seen. With none left, the task is skipped rather than served broken.
 */
async function replacePendingTasks(tx: Sql, itemId: string): Promise<number> {
  const tasks = await tx<{ id: string; user_id: string }[]>`
    select id, user_id from public.session_tasks where item_id = ${itemId} and status = 'pending' for update`;
  let replaced = 0;
  for (const task of tasks) {
    const repl = (
      await tx<{ id: string }[]>`
        select i.id
          from public.items old
          join public.item_templates o on o.key = old.template_key and o.version = old.template_version
          join public.item_templates t on t.skill_key = o.skill_key and t.task_kind = o.task_kind
                                      and t.grader_type = o.grader_type and t.pool = o.pool and t.status = 'verified'
          join public.items i on i.template_key = t.key and i.template_version = t.version and i.status = 'verified'
         where old.id = ${itemId} and i.id <> old.id and (i.user_id is null or i.user_id = ${task.user_id})
           and not exists (select 1 from public.attempts a where a.user_id = ${task.user_id} and a.item_id = i.id)
           and not exists (select 1 from public.session_tasks s
                            where s.user_id = ${task.user_id} and s.item_id = i.id and s.status in ('pending', 'in_progress'))
         order by (i.template_key = old.template_key) desc, i.created_at, i.id
         limit 1`
    )[0];
    if (repl) {
      await tx`update public.session_tasks set item_id = ${repl.id} where id = ${task.id}`;
      replaced += 1;
    } else {
      await tx`update public.session_tasks set status = 'skipped' where id = ${task.id}`;
    }
  }
  return replaced;
}

async function retireTx(tx: Sql, input: RetireInput, confirmedWrong: boolean): Promise<RetireResult | null> {
  const item = (
    await tx<{ template_key: string; status: string }[]>`
      select template_key, status::text as status from public.items where id = ${input.itemId} for update`
  )[0];
  if (!item) return null;
  if (item.status === "retired" && !input.retireTemplate) {
    return { status: "retired", templateRetired: false, replacedTasks: 0, poolItemsRetired: 0 };
  }
  await tx`update public.items set status = 'retired', retired_at = coalesce(retired_at, now()),
                  retired_reason = coalesce(retired_reason, ${input.reason}) where id = ${input.itemId}`;
  let poolItemsRetired = 0;
  if (input.retireTemplate) {
    await tx`update public.item_templates set status = 'retired', retired_at = coalesce(retired_at, now()),
                    retired_reason = coalesce(retired_reason, ${input.reason})
              where key = ${item.template_key} and status <> 'retired'`;
    poolItemsRetired = (
      await tx`update public.items set status = 'retired', retired_at = now(), retired_reason = ${input.reason}
                where template_key = ${item.template_key} and user_id is null and status <> 'retired'
                  and not exists (select 1 from public.attempts a where a.item_id = items.id)
                returning id`
    ).length;
  }
  const replacedTasks = await replacePendingTasks(tx, input.itemId);
  if (item.status !== "retired") {
    await insertEvents(tx, [
      {
        userId: input.adminId,
        name: "item_retired",
        props: { template_key: item.template_key, item_id: input.itemId, confirmed_wrong: confirmedWrong, reason: input.reason },
      },
    ]);
  }
  return { status: "retired", templateRetired: input.retireTemplate, replacedTasks, poolItemsRetired };
}

export function createReportStore(sql: Sql): ReportStore {
  const asSql = (tx: unknown) => tx as Sql;
  return {
    isAdmin: async (userId) =>
      (await sql<{ ok: boolean }[]>`select exists (select 1 from public.admin_users where user_id = ${userId}) as ok`)[0]?.ok === true,
    attemptItem: async (userId, attemptId) =>
      (await sql<{ item_id: string }[]>`select item_id from public.attempts where id = ${attemptId} and user_id = ${userId}`)[0]?.item_id ?? null,
    hasAttempt: async (userId, itemId) =>
      (
        await sql<{ ok: boolean }[]>`select (exists (select 1 from public.attempts where user_id = ${userId} and item_id = ${itemId})
          or exists (select 1 from public.item_reports where user_id = ${userId} and item_id = ${itemId})) as ok`
      )[0]?.ok === true,

    fileReport: (input) =>
      sql.begin(async (t) => {
        const tx = asSql(t);
        // Without an explicit attempt, the reporter's latest graded attempt on the item is the one reported.
        const attemptId =
          input.attemptId ??
          (
            await tx<{ id: string }[]>`select id from public.attempts where user_id = ${input.userId} and item_id = ${input.itemId}
              and grade_status = 'graded' order by submitted_at desc, created_at desc limit 1`
          )[0]?.id ??
          null;
        const inserted = await tx<{ id: string }[]>`
          insert into public.item_reports (user_id, item_id, reason, note, attempt_id, target_type)
          values (${input.userId}, ${input.itemId}, ${input.reason}, ${input.note}, ${attemptId}, 'item')
          on conflict (user_id, item_id, reason) do nothing returning id`;
        if (inserted.length === 0) return { created: false, quarantined: false };
        await insertEvents(tx, [{ userId: input.userId, name: "item_reported", props: input.eventProps }]);

        let quarantine = input.reason === "wrong_answer" || input.reportedByAdmin;
        if (!quarantine) {
          const n = (
            await tx<{ n: number }[]>`select count(distinct user_id)::int as n from public.item_reports
              where item_id = ${input.itemId} and status = 'open' and target_type = 'item'`
          )[0]?.n;
          quarantine = (n ?? 0) >= REPORTER_THRESHOLD;
        }
        if (!quarantine) return { created: true, quarantined: false };
        const moved = await tx`update public.items set status = 'needs_human_review' where id = ${input.itemId} and status = 'verified' returning id`;
        if (moved.length > 0) await replacePendingTasks(tx, input.itemId);
        if (input.reason === "wrong_answer" && attemptId) {
          await tx`update public.attempts set grade = jsonb_set(grade, '{disputed}', 'true'::jsonb)
                    where id = ${attemptId} and user_id = ${input.userId} and grade is not null`;
        }
        return { created: true, quarantined: true };
      }),

    retire: (input) =>
      sql.begin(async (t) => {
        const tx = asSql(t);
        const confirmedWrong =
          (
            await tx<{ ok: boolean }[]>`select exists (select 1 from public.item_reports
              where item_id = ${input.itemId} and reason = 'wrong_answer' and status = 'confirmed') as ok`
          )[0]?.ok === true;
        return retireTx(tx, input, confirmedWrong);
      }),

    list: async (q) =>
      sql<ReportRow[]>`
        select ${REPORT_COLUMNS(sql)}
          from public.item_reports r left join public.items i on i.id = r.item_id
         where (${q.status ?? null}::text is null or r.status::text = ${q.status ?? null})
           and (${q.itemId ?? null}::uuid is null or r.item_id = ${q.itemId ?? null})
           and (${q.before?.createdAt.toISOString() ?? null}::timestamptz is null
                or (r.created_at, r.id) < (${q.before?.createdAt.toISOString() ?? null}::timestamptz, ${q.before?.id ?? null}::uuid))
         order by r.created_at desc, r.id desc
         limit ${q.limit}`,

    resolve: (input) =>
      sql.begin(async (t) => {
        const tx = asSql(t);
        const cur = (
          await tx<{ id: string; item_id: string | null; status: string; attempt_id: string | null }[]>`
            select id, item_id, status::text as status, attempt_id from public.item_reports where id = ${input.reportId} for update`
        )[0];
        if (!cur) return "not_found" as const;
        if (input.retireItem && !cur.item_id) return "no_item" as const;
        if (cur.status === "open") {
          await tx`update public.item_reports set status = ${input.status}, resolved_by = ${input.adminId}, resolved_at = now() where id = ${cur.id}`;
          // A dismissed report returns the attempt to the learner's record (doc 07 section 8.2, learner_error).
          if (input.status === "dismissed" && cur.attempt_id) {
            await tx`update public.attempts set grade = grade - 'disputed' where id = ${cur.attempt_id} and grade ? 'disputed'`;
          }
        }
        const retired =
          input.retireItem && cur.item_id
            ? await retireTx(tx, { itemId: cur.item_id, adminId: input.adminId, reason: "Confirmed from a learner report", retireTemplate: false }, input.status === "confirmed")
            : null;
        const report = (
          await tx<ReportRow[]>`select ${REPORT_COLUMNS(tx)} from public.item_reports r left join public.items i on i.id = r.item_id where r.id = ${cur.id}`
        )[0];
        if (!report) throw new Error("resolved report not found");
        return { report, retired };
      }),
  };
}
