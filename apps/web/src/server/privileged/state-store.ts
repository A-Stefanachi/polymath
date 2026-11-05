// Privileged access for the learner-state transaction (BL-0042; doc 06 sections 3.3 and 4; 00a H15).
// skill_state, review_log and attempts.state_applied_at are written only here and only from
// lib/state (CLAUDE.md rule 2.8: the worker reports grades through the signed callback and never
// writes learner state). Every method runs inside the one transaction opened by `run`.
// The multiple-choice option count is the only thing read from item_secrets: the key stays here.
import type { Sql } from "./db.ts";
import { insertEvents, type EventRow } from "./events-store.ts";

export type ClaimedAttempt = {
  id: string;
  userId: string;
  sessionId: string | null;
  itemId: string;
  skillKey: string;
  taskKind: string;
  graderType: string;
  templateKey: string;
  templateVersion: number;
  itemTier: string;
  score: number;
  masteryEligible: boolean;
  maxHintLevel: number;
  unaided: boolean;
  confidence: number | null;
  latencyMs: number | null;
  expectedMs: number | null;
  submittedAt: Date;
  verified: boolean;
  /** Number of shown options of a multiple-choice item (guessing floor), else null. */
  mcOptions: number | null;
  /** Elo-scale difficulty of the template (live estimate, else the prior). */
  difficulty: number;
};

export type ClaimResult = { kind: "claimed"; attempt: ClaimedAttempt } | { kind: "skipped"; reason: "not_found" | "not_graded" | "already_applied" };

export type SkillRow = {
  masteryState: string;
  elo: number;
  stability: number;
  difficulty: number;
  due: Date | null;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  fsrsState: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  fsrsExtra: Record<string, unknown>;
  tierAttained: string | null;
  masteryEvidence: Record<string, unknown>;
  firstSeenAt: Date | null;
  masteredAt: Date | null;
  nAttempts: number;
  epochStart: Date | null;
  everMastered: boolean;
  loopStep: string | null;
  tierTarget: string;
};

export type HistoryAttempt = {
  id: string;
  itemId: string;
  templateKey: string;
  itemTier: string;
  taskKind: string;
  graderType: string;
  score: number;
  maxHintLevel: number;
  unaided: boolean;
  verified: boolean;
  submittedAt: Date;
};

export type UnitAttempt = HistoryAttempt & {
  confidence: number | null;
  latencyMs: number | null;
  expectedMs: number | null;
  templateNObs: number;
};

export type TemplateStats = { nVerified: number; hasNonMc: boolean; hasApplied: boolean };

export type ReviewLogRow = {
  userId: string;
  skillKey: string;
  attemptId: string;
  attemptIds: string[];
  sessionId: string | null;
  rating: number;
  reviewedAt: Date;
  elapsedDays: number;
  scheduledDays: number;
  stateBefore: number;
  stabilityAfter: number;
  difficultyAfter: number;
  dueAfter: Date;
  paramsVersion: string;
  flags: string[];
};

export type ReplayReview = { rating: 1 | 2 | 3 | 4; reviewedAt: Date; allDisputed: boolean };

/** tierTarget is read-only context (skills.tier_target) and is ignored on write. */
export type SkillWrite = SkillRow;

/** A session task with its session's status and any stored outcome (completeTask, 00a J9). */
export type TaskLock = {
  id: string;
  sessionId: string;
  sessionStatus: string;
  position: number;
  taskKind: string;
  skillKey: string | null;
  projectStepKey: string | null;
  itemId: string | null;
  status: string;
  estSeconds: number;
  reason: string | null;
  assessmentKind: string | null;
  /** `sessions.plan.task_outcomes[task id]`, null when none is stored. */
  outcome: Record<string, unknown> | null;
};

export type StateTx = {
  /** The user's own task, locked with its session row; null for another user's or a missing task. */
  lockTask(userId: string, taskId: string): Promise<TaskLock | null>;
  /** Closes a task and stores the outcome under `sessions.plan.task_outcomes` (a skip is not an attempt, 06 section 10). */
  closeTask(taskId: string, sessionId: string, status: "done" | "skipped", at: Date, outcome: Record<string, unknown>): Promise<void>;
  /** Compare-and-set of attempts.state_applied_at (00a H15): the idempotency guard. */
  claim(attemptId: string, now: Date): Promise<ClaimResult>;
  /** Creates the skill_state row when missing, then returns it locked for the transaction. */
  lockSkill(userId: string, skillKey: string, eloInit: number): Promise<SkillRow>;
  writeSkill(userId: string, skillKey: string, row: SkillWrite): Promise<void>;
  /** Template row locked: the live difficulty and observation count. */
  lockTemplate(key: string, version: number): Promise<{ difficulty: number; nObs: number } | null>;
  writeTemplate(key: string, version: number, difficulty: number, nObs: number): Promise<void>;
  /** Applied, graded, mastery-eligible attempts of the skill since `since`, chronological. */
  history(userId: string, skillKey: string, since: Date | null): Promise<HistoryAttempt[]>;
  templateStats(skillKey: string): Promise<TemplateStats>;
  profileTimezone(userId: string): Promise<string>;
  lastRating(userId: string, skillKey: string): Promise<number | null>;
  lapsesSince(userId: string, skillKey: string, since: Date): Promise<number>;
  sessionStatus(userId: string, sessionId: string): Promise<string | null>;
  /** Review-eligible, applied attempts of one skill in one session that no review row covers yet. */
  sessionUnit(userId: string, sessionId: string, skillKey: string): Promise<UnitAttempt[]>;
  /** Skills with uncommitted review-eligible applied attempts in the session. */
  sessionSkills(userId: string, sessionId: string): Promise<string[]>;
  sessionReviewed(sessionId: string, skillKey: string): Promise<boolean>;
  reviewedSameLocalDay(userId: string, skillKey: string, at: Date, timezone: string): Promise<boolean>;
  insertReview(row: ReviewLogRow): Promise<void>;
  /** The skill's review_log rows in order, each flagged when every attempt it covers is disputed (00a J2, BL-0197). */
  reviewsForReplay(userId: string, skillKey: string): Promise<ReplayReview[]>;
  /** Owner check for the session-close entry point. */
  ownsSession(userId: string, sessionId: string): Promise<boolean>;
  events(rows: EventRow[]): Promise<void>;
};

export type StateStore = { run<T>(fn: (tx: StateTx) => Promise<T>): Promise<T> };

type Row = Record<string, unknown>;
const num = (v: unknown): number => Number(v);
const optNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

const ATTEMPT_FROM = (db: Sql) => db`
  public.attempts a
  join public.items i on i.id = a.item_id
  join public.item_templates t on t.key = i.template_key and t.version = i.template_version
  join public.skills s on s.key = t.skill_key
  left join public.session_tasks st on st.id = a.session_task_id`;

// 00a H1: one template serves every loop stage, so an attempt's kind is the kind of the session task it
// answered (a `problem` template served as a faded problem is a faded problem). Without a session task
// (a standalone item) the template's kind stands. Needs `st` and `t` from ATTEMPT_FROM.
const KIND = (db: Sql) => db`coalesce(st.task_kind, t.task_kind)`;

const SCORE = (db: Sql) => db`(a.grade ->> 'score')::float8`;
// A reported attempt (`grade.disputed`, doc 07 section 8.2) is out of mastery evidence until triage clears it.
const ELIGIBLE = (db: Sql) =>
  db`(coalesce((a.grade ->> 'mastery_eligible')::boolean, true) and t.mastery_eligible and not coalesce((a.grade ->> 'disputed')::boolean, false))`;

// A review_log row whose attempts are all disputed is out of FSRS evidence until triage (00a J2).
const REVIEW_DISPUTED = (db: Sql) => db`(cardinality(r.attempt_ids) > 0 and not exists (
  select 1 from public.attempts da where da.id = any(r.attempt_ids) and not coalesce((da.grade ->> 'disputed')::boolean, false)))`;

const toHistory = (r: Row): HistoryAttempt => ({
  id: String(r["id"]),
  itemId: String(r["item_id"]),
  templateKey: String(r["template_key"]),
  itemTier: String(r["item_tier"]),
  taskKind: String(r["task_kind"]),
  graderType: String(r["grader_type"]),
  score: num(r["score"]),
  maxHintLevel: num(r["max_hint_level"]),
  unaided: r["unaided"] === true,
  verified: r["verified"] === true,
  submittedAt: r["submitted_at"] as Date,
});

export function createStateStore(sql: Sql): StateStore {
  return {
    run: (fn) =>
      sql.begin(async (tx) => {
        const db = tx as unknown as Sql;
        const json = (v: unknown) => db.json(v as Parameters<Sql["json"]>[0]);
        const api: StateTx = {
          async lockTask(userId, taskId) {
            const r = (
              await db<Row[]>`
                select st.id, st.session_id, s.status::text as session_status, st.position, st.task_kind::text as task_kind,
                       st.skill_key, st.project_step_key, st.item_id, st.status::text as status, st.est_seconds, st.reason,
                       st.assessment_kind, s.plan -> 'task_outcomes' -> st.id::text as outcome
                  from public.session_tasks st join public.sessions s on s.id = st.session_id
                 where st.id = ${taskId} and st.user_id = ${userId} and s.user_id = ${userId}
                   for update of st, s`
            )[0];
            if (!r) return null;
            const outcome = r["outcome"];
            return {
              id: String(r["id"]),
              sessionId: String(r["session_id"]),
              sessionStatus: String(r["session_status"]),
              position: num(r["position"]),
              taskKind: String(r["task_kind"]),
              skillKey: (r["skill_key"] as string | null) ?? null,
              projectStepKey: (r["project_step_key"] as string | null) ?? null,
              itemId: (r["item_id"] as string | null) ?? null,
              status: String(r["status"]),
              estSeconds: num(r["est_seconds"]),
              reason: (r["reason"] as string | null) ?? null,
              assessmentKind: (r["assessment_kind"] as string | null) ?? null,
              outcome: typeof outcome === "object" && outcome !== null ? (outcome as Record<string, unknown>) : null,
            };
          },
          async closeTask(taskId, sessionId, status, at, outcome) {
            await db`update public.session_tasks set status = ${status}::public.session_task_status,
              completed_at = ${at.toISOString()}::timestamptz where id = ${taskId}`;
            await db`update public.sessions set plan = jsonb_set(plan, '{task_outcomes}',
              coalesce(plan -> 'task_outcomes', '{}'::jsonb) || jsonb_build_object(${taskId}::text, ${json(outcome)}::jsonb), true)
              where id = ${sessionId}`;
          },
          async claim(attemptId, now) {
            const rows = await db<Row[]>`
              with c as (
                update public.attempts set state_applied_at = ${now.toISOString()}::timestamptz
                where id = ${attemptId} and state_applied_at is null and grade_status = 'graded'
                returning *)
              select a.id, a.user_id, a.session_id, a.item_id, t.skill_key, ${KIND(db)}::text as task_kind,
                     t.grader_type::text as grader_type, t.key as template_key, t.version as template_version,
                     coalesce(t.tier, s.tier_target)::text as item_tier,
                     (a.grade ->> 'score')::float8 as score, ${ELIGIBLE(db)} as mastery_eligible,
                     a.max_hint_level::int as max_hint_level, a.unaided, a.confidence, coalesce(a.active_ms, a.latency_ms) as latency_ms,
                     coalesce(a.expected_ms, t.reference_time_s * 1000, t.est_seconds * 1000) as expected_ms,
                     a.submitted_at, (i.status = 'verified') as verified,
                     case when t.grader_type = 'multiple_choice' and jsonb_typeof(k.answer_key #> '{reference,option_ids}') = 'array'
                          then jsonb_array_length(k.answer_key #> '{reference,option_ids}') end as mc_options,
                     coalesce(t.difficulty_est, 1200 + 600 * t.difficulty_prior) as difficulty
              from c a
              join public.items i on i.id = a.item_id
              join public.item_templates t on t.key = i.template_key and t.version = i.template_version
              join public.skills s on s.key = t.skill_key
              left join public.session_tasks st on st.id = a.session_task_id
              left join public.item_secrets k on k.item_id = a.item_id`;
            const r = rows[0];
            if (!r) {
              const cur = (await db<{ grade_status: string; state_applied_at: Date | null }[]>`
                select grade_status::text as grade_status, state_applied_at from public.attempts where id = ${attemptId}`)[0];
              if (!cur) return { kind: "skipped", reason: "not_found" };
              return { kind: "skipped", reason: cur.grade_status !== "graded" ? "not_graded" : "already_applied" };
            }
            return {
              kind: "claimed",
              attempt: {
                id: String(r["id"]),
                userId: String(r["user_id"]),
                sessionId: (r["session_id"] as string | null) ?? null,
                itemId: String(r["item_id"]),
                skillKey: String(r["skill_key"]),
                taskKind: String(r["task_kind"]),
                graderType: String(r["grader_type"]),
                templateKey: String(r["template_key"]),
                templateVersion: num(r["template_version"]),
                itemTier: String(r["item_tier"]),
                score: num(r["score"]),
                masteryEligible: r["mastery_eligible"] === true,
                maxHintLevel: num(r["max_hint_level"]),
                unaided: r["unaided"] === true,
                confidence: optNum(r["confidence"]),
                latencyMs: optNum(r["latency_ms"]),
                expectedMs: optNum(r["expected_ms"]),
                submittedAt: r["submitted_at"] as Date,
                verified: r["verified"] === true,
                mcOptions: optNum(r["mc_options"]),
                difficulty: num(r["difficulty"]),
              },
            };
          },
          async lockSkill(userId, skillKey, eloInit) {
            await db`insert into public.skill_state (user_id, skill_key, elo) values (${userId}, ${skillKey}, ${eloInit})
              on conflict (user_id, skill_key) do nothing`;
            const r = (
              await db<Row[]>`
                select ss.*, ss.mastery_state::text as mastery_state_text, ss.tier_attained::text as tier_text, s.tier_target::text as tier_target
                from public.skill_state ss join public.skills s on s.key = ss.skill_key
                where ss.user_id = ${userId} and ss.skill_key = ${skillKey} for update of ss`
            )[0];
            if (!r) throw new Error("skill_state row missing after insert");
            return {
              masteryState: String(r["mastery_state_text"]),
              elo: num(r["elo"]),
              stability: num(r["stability"]),
              difficulty: num(r["difficulty"]),
              due: (r["due"] as Date | null) ?? null,
              lastReview: (r["last_review"] as Date | null) ?? null,
              reps: num(r["reps"]),
              lapses: num(r["lapses"]),
              fsrsState: num(r["fsrs_state"]),
              elapsedDays: num(r["elapsed_days"]),
              scheduledDays: num(r["scheduled_days"]),
              learningSteps: num(r["learning_steps"]),
              fsrsExtra: (r["fsrs_extra"] as Record<string, unknown>) ?? {},
              tierAttained: (r["tier_text"] as string | null) ?? null,
              masteryEvidence: (r["mastery_evidence"] as Record<string, unknown>) ?? {},
              firstSeenAt: (r["first_seen_at"] as Date | null) ?? null,
              masteredAt: (r["mastered_at"] as Date | null) ?? null,
              nAttempts: num(r["n_attempts"]),
              epochStart: (r["epoch_start"] as Date | null) ?? null,
              everMastered: r["ever_mastered"] === true,
              loopStep: (r["loop_step"] as string | null) ?? null,
              tierTarget: String(r["tier_target"]),
            };
          },
          async writeSkill(userId, skillKey, w) {
            await db`
              update public.skill_state set
                mastery_state = ${w.masteryState}::public.mastery_state, elo = ${w.elo}, stability = ${w.stability},
                difficulty = ${w.difficulty}, due = ${w.due?.toISOString() ?? null}::timestamptz,
                last_review = ${w.lastReview?.toISOString() ?? null}::timestamptz, reps = ${w.reps}, lapses = ${w.lapses},
                fsrs_state = ${w.fsrsState}, elapsed_days = ${w.elapsedDays}, scheduled_days = ${w.scheduledDays},
                learning_steps = ${w.learningSteps}, fsrs_extra = ${json(w.fsrsExtra)},
                tier_attained = ${w.tierAttained}::public.tier, mastery_evidence = ${json(w.masteryEvidence)},
                first_seen_at = ${w.firstSeenAt?.toISOString() ?? null}::timestamptz,
                mastered_at = ${w.masteredAt?.toISOString() ?? null}::timestamptz, n_attempts = ${w.nAttempts},
                epoch_start = ${w.epochStart?.toISOString() ?? null}::timestamptz, ever_mastered = ${w.everMastered},
                loop_step = ${w.loopStep}
              where user_id = ${userId} and skill_key = ${skillKey}`;
          },
          async lockTemplate(key, version) {
            const r = (
              await db<{ d: number; n: number }[]>`
                select coalesce(difficulty_est, 1200 + 600 * difficulty_prior) as d, n_obs as n
                from public.item_templates where key = ${key} and version = ${version} for update`
            )[0];
            return r ? { difficulty: num(r.d), nObs: num(r.n) } : null;
          },
          async writeTemplate(key, version, difficulty, nObs) {
            await db`update public.item_templates set difficulty_est = ${difficulty}, n_obs = ${nObs}
              where key = ${key} and version = ${version}`;
          },
          async history(userId, skillKey, since) {
            const rows = await db<Row[]>`
              select a.id, a.item_id, t.key as template_key, coalesce(t.tier, s.tier_target)::text as item_tier,
                     ${KIND(db)}::text as task_kind, t.grader_type::text as grader_type, ${SCORE(db)} as score,
                     a.max_hint_level::int as max_hint_level, a.unaided, (i.status = 'verified') as verified, a.submitted_at
              from ${ATTEMPT_FROM(db)}
              where a.user_id = ${userId} and t.skill_key = ${skillKey} and a.state_applied_at is not null
                and a.grade_status = 'graded' and ${ELIGIBLE(db)}
                and (${since?.toISOString() ?? null}::timestamptz is null or a.submitted_at >= ${since?.toISOString() ?? null}::timestamptz)
              order by a.submitted_at, a.created_at, a.id`;
            return rows.map(toHistory);
          },
          async templateStats(skillKey) {
            const r = (
              await db<{ n: number; non_mc: boolean | null; applied: boolean | null }[]>`
                select count(distinct key)::int as n, bool_or(grader_type <> 'multiple_choice') as non_mc,
                       bool_or(task_kind in ('problem', 'debug_case', 'checkpoint')) as applied
                from public.item_templates where skill_key = ${skillKey} and status = 'verified' and retired_at is null`
            )[0];
            return { nVerified: r?.n ?? 0, hasNonMc: r?.non_mc === true, hasApplied: r?.applied === true };
          },
          async profileTimezone(userId) {
            return (await db<{ timezone: string }[]>`select timezone from public.profiles where id = ${userId}`)[0]?.timezone ?? "UTC";
          },
          async lastRating(userId, skillKey) {
            const r = (
              await db<{ rating: number }[]>`select r.rating from public.review_log r where r.user_id = ${userId} and r.skill_key = ${skillKey}
                and not ${REVIEW_DISPUTED(db)} order by r.reviewed_at desc, r.id limit 1`
            )[0];
            return r ? r.rating : null;
          },
          async lapsesSince(userId, skillKey, since) {
            return (
              await db<{ n: number }[]>`select count(*)::int as n from public.review_log r
                where r.user_id = ${userId} and r.skill_key = ${skillKey} and r.rating = 1
                  and r.reviewed_at >= ${since.toISOString()}::timestamptz and not ${REVIEW_DISPUTED(db)}`
            )[0]?.n ?? 0;
          },
          async sessionStatus(userId, sessionId) {
            return (
              await db<{ status: string }[]>`select status::text as status from public.sessions where id = ${sessionId} and user_id = ${userId}`
            )[0]?.status ?? null;
          },
          async sessionUnit(userId, sessionId, skillKey) {
            const rows = await db<Row[]>`
              select a.id, a.item_id, t.key as template_key, coalesce(t.tier, s.tier_target)::text as item_tier,
                     ${KIND(db)}::text as task_kind, t.grader_type::text as grader_type, ${SCORE(db)} as score,
                     a.max_hint_level::int as max_hint_level, a.unaided, (i.status = 'verified') as verified, a.submitted_at,
                     a.confidence, coalesce(a.active_ms, a.latency_ms) as latency_ms,
                     coalesce(a.expected_ms, t.reference_time_s * 1000, t.est_seconds * 1000) as expected_ms, t.n_obs as template_n_obs
              from ${ATTEMPT_FROM(db)}
              where a.user_id = ${userId} and a.session_id = ${sessionId} and t.skill_key = ${skillKey}
                and a.state_applied_at is not null and a.grade_status = 'graded' and ${ELIGIBLE(db)}
                and ${KIND(db)} in ('retrieval', 'problem', 'perceptual_drill', 'debug_case', 'explain_back', 'checkpoint')
              order by a.submitted_at, a.created_at, a.id`;
            return rows.map((r) => ({
              ...toHistory(r),
              confidence: optNum(r["confidence"]),
              latencyMs: optNum(r["latency_ms"]),
              expectedMs: optNum(r["expected_ms"]),
              templateNObs: num(r["template_n_obs"]),
            }));
          },
          async sessionSkills(userId, sessionId) {
            const rows = await db<{ skill_key: string }[]>`
              select distinct t.skill_key from ${ATTEMPT_FROM(db)}
              where a.user_id = ${userId} and a.session_id = ${sessionId} and a.state_applied_at is not null
                and a.grade_status = 'graded' and ${ELIGIBLE(db)}
                and ${KIND(db)} in ('retrieval', 'problem', 'perceptual_drill', 'debug_case', 'explain_back', 'checkpoint')
              order by t.skill_key`;
            return rows.map((r) => r.skill_key);
          },
          async sessionReviewed(sessionId, skillKey) {
            return (
              await db<{ ok: boolean }[]>`select exists (select 1 from public.review_log where session_id = ${sessionId} and skill_key = ${skillKey}) as ok`
            )[0]?.ok === true;
          },
          async reviewedSameLocalDay(userId, skillKey, at, timezone) {
            return (
              await db<{ ok: boolean }[]>`
                select exists (select 1 from public.review_log
                  where user_id = ${userId} and skill_key = ${skillKey}
                    and (reviewed_at at time zone ${timezone})::date = (${at.toISOString()}::timestamptz at time zone ${timezone})::date) as ok`
            )[0]?.ok === true;
          },
          async insertReview(r) {
            await db`
              insert into public.review_log (user_id, skill_key, attempt_id, attempt_ids, session_id, rating, reviewed_at, elapsed_days,
                scheduled_days, state_before, stability_after, difficulty_after, due_after, fsrs_params_version, flags)
              values (${r.userId}, ${r.skillKey}, ${r.attemptId}, ${db.array(r.attemptIds)}::uuid[], ${r.sessionId}, ${r.rating},
                ${r.reviewedAt.toISOString()}::timestamptz, ${r.elapsedDays}, ${r.scheduledDays}, ${r.stateBefore}, ${r.stabilityAfter},
                ${r.difficultyAfter}, ${r.dueAfter.toISOString()}::timestamptz, ${r.paramsVersion}, ${db.array(r.flags)}::text[])`;
          },
          async reviewsForReplay(userId, skillKey) {
            const rows = await db<{ rating: number; reviewed_at: Date; all_disputed: boolean }[]>`
              select r.rating::int as rating, r.reviewed_at, ${REVIEW_DISPUTED(db)} as all_disputed
              from public.review_log r where r.user_id = ${userId} and r.skill_key = ${skillKey}
              order by r.reviewed_at, r.id`;
            return rows.map((r) => ({ rating: r.rating as 1 | 2 | 3 | 4, reviewedAt: r.reviewed_at, allDisputed: r.all_disputed }));
          },
          async ownsSession(userId, sessionId) {
            return (
              await db<{ ok: boolean }[]>`select exists (select 1 from public.sessions where id = ${sessionId} and user_id = ${userId}) as ok`
            )[0]?.ok === true;
          },
          events: (rows) => insertEvents(db, rows),
        };
        return fn(api) as never;
      }),
  };
}
