// Privileged access for submitAttempt (BL-0026; doc 04 attempts, item_secrets; CLAUDE.md rules 2.6, 2.8).
// This is the only module of the web app that reads item_secrets.answer_key. The key is returned to
// the grading code in lib/attempts and never to a response. It writes `attempts` and the
// `attempt_submitted` event in one transaction; it never touches skill_state or review_log (BL-0042).
import type { Sql } from "./db.ts";
import { insertEvents } from "./events-store.ts";

export type AttemptRow = {
  id: string;
  client_attempt_id: string;
  item_id: string;
  grade_status: string;
  grade: Record<string, unknown> | null;
  hints_used: number;
  max_hint_level: number;
  unaided: boolean;
};

export type NewAttempt = {
  userId: string;
  itemId: string;
  sessionId: string | null;
  sessionTaskId: string | null;
  clientAttemptId: string;
  startedAt: string;
  submittedAt: string;
  response: Record<string, unknown>;
  /** Null with `pending`: the attempt and a `grade_attempt` job are stored together (doc 03 section 7.2). */
  grade: Record<string, unknown> | null;
  gradeStatus: "graded" | "invalid_input" | "pending";
  graderVersion: string;
  latencyMs: number | null;
  activeMs: number | null;
  confidence: number | null;
  offline: boolean;
  clientGrade: Record<string, unknown> | null;
  assessmentKind: string | null;
  /** Already validated `attempt_submitted` props, without attempt_id (known only at insert). */
  eventProps: Record<string, unknown>;
};

export type AttemptStore = {
  /** The stored `item_secrets.answer_key`, or null when the item has none. */
  loadAnswerKey(itemId: string): Promise<unknown>;
  findByClientId(userId: string, clientAttemptId: string): Promise<AttemptRow | null>;
  /** True when the session exists and belongs to `userId`. */
  ownsSession(userId: string, sessionId: string): Promise<boolean>;
  /**
   * Inserts the attempt and its event atomically. Returns the stored row and whether this call
   * created it; on a concurrent duplicate of (user, client_attempt_id) the existing row is returned
   * with `created: false` and no second event is written (ST-API-07, ST-API-08).
   */
  insert(attempt: NewAttempt): Promise<{ row: AttemptRow; created: boolean }>;
};

const COLUMNS = (sql: Sql) => sql`id, client_attempt_id, item_id, grade_status::text as grade_status, grade,
  hints_used, max_hint_level::int as max_hint_level, unaided`;

export function createAttemptStore(sql: Sql): AttemptStore {
  const find = async (db: Sql, userId: string, clientAttemptId: string): Promise<AttemptRow | null> =>
    (
      await db<AttemptRow[]>`select ${COLUMNS(db)} from public.attempts
        where user_id = ${userId} and client_attempt_id = ${clientAttemptId}`
    )[0] ?? null;

  return {
    loadAnswerKey: async (itemId) =>
      (await sql<{ answer_key: unknown }[]>`select answer_key from public.item_secrets where item_id = ${itemId}`)[0]?.answer_key ?? null,
    findByClientId: (userId, clientAttemptId) => find(sql, userId, clientAttemptId),
    ownsSession: async (userId, sessionId) =>
      (await sql<{ ok: boolean }[]>`select exists (select 1 from public.sessions where id = ${sessionId} and user_id = ${userId}) as ok`)[0]?.ok === true,
    insert: (a) =>
      sql.begin(async (tx) => {
        const db = tx as unknown as Sql;
        // No tutor yet (BL-0043): hints are 0 and the attempt is unaided; the table checks agree.
        const inserted = await tx<{ id: string }[]>`
          insert into public.attempts (user_id, item_id, session_id, session_task_id, client_attempt_id, started_at,
                 submitted_at, response, grade, grade_status, graded_at, grader_version, latency_ms, active_ms, confidence,
                 offline, client_grade, assessment_kind, hints_used, max_hint_level, unaided)
          values (${a.userId}, ${a.itemId}, ${a.sessionId}, ${a.sessionTaskId}, ${a.clientAttemptId}, ${a.startedAt},
                 ${a.submittedAt}, ${tx.json(a.response as Parameters<typeof tx.json>[0])}, ${a.grade ? tx.json(a.grade as Parameters<typeof tx.json>[0]) : null},
                 ${a.gradeStatus}, ${a.gradeStatus === "pending" ? null : tx`now()`}, ${a.graderVersion}, ${a.latencyMs}, ${a.activeMs}, ${a.confidence}, ${a.offline},
                 ${a.clientGrade ? tx.json(a.clientGrade as Parameters<typeof tx.json>[0]) : null}, ${a.assessmentKind}, 0, 0, true)
          on conflict (user_id, client_attempt_id) do nothing
          returning id`;
        const id = inserted[0]?.id;
        if (id === undefined) {
          const existing = await find(db, a.userId, a.clientAttemptId);
          if (!existing) throw new Error("attempt conflict without a stored row");
          return { row: existing, created: false };
        }
        await insertEvents(db, [{ userId: a.userId, name: "attempt_submitted", props: { ...a.eventProps, attempt_id: id } }]);
        if (a.gradeStatus === "pending") {
          // Ids only in the payload (CLAUDE.md rule 5); the dedupe key makes a retry of this insert harmless.
          await tx`select public.enqueue_job('grade_attempt', ${tx.json({ attempt_id: id })}, ${a.userId}, ${`grade:${id}`})`;
        }
        const row = await find(db, a.userId, a.clientAttemptId);
        if (!row) throw new Error("inserted attempt not found");
        return { row, created: true };
      }),
  };
}
