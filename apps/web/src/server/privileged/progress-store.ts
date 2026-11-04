// Read-only privileged queries for getProgress (BL-0190; docs/09 S15, 00a J8). Everything is selected for one
// user id: skill_state, sessions, weekly_plans, checkpoints, attempts and the project tables. Only counts, titles and
// keys are selected (no answer, key, params or template columns; CLAUDE.md rule 2.6). The privileged connection
// bypasses RLS, so every query filters by user_id and skill visibility is applied by hand (skill-visibility.ts).
import type { Sql } from "./db.ts";
import { isAdminUser, skillVisibleSql } from "./skill-visibility.ts";

export type ProgressSkill = { key: string; node: string; title: string; tierTarget: string };
export type ProgressState = {
  skillKey: string;
  masteryState: string;
  tierAttained: string | null;
  due: Date | null;
  lastReview: Date | null;
  loopStep: string | null;
  epochStart: Date | null;
  /** Local calendar days from today to the due date (negative: overdue), in the learner's time zone. */
  dueDayOffset: number | null;
};
export type ProgressCheckpoint = { id: string; completedAt: Date; startedAt: Date | null; correct: number; total: number };
export type ProgressProject = {
  userProjectId: string;
  projectKey: string;
  status: string;
  startedAt: Date;
  ladderLevel: number;
  tierGate: string;
  stepsTotal: number;
  /** Position of the current step, null when none is set. */
  currentPosition: number | null;
  evidenceRequired: number;
  evidenceAccepted: number;
  evidencePendingReview: number;
  /** Skills named by the project's steps, counted per node. */
  nodeSkillCounts: Record<string, number>;
};

export type ProgressData = {
  timezone: string;
  /** Local calendar date of `now` (yyyy-mm-dd) and the Monday of its ISO week. */
  today: string;
  weekStart: string;
  minutesTarget: number;
  /** 8 local ISO weeks, oldest first, ending with the current week. */
  weeks: { startDate: string; minutes: number }[];
  skills: ProgressSkill[];
  states: ProgressState[];
  checkpoints: ProgressCheckpoint[];
  /** Graded answers outside checkpoint sessions with unaided = false, from `since`. */
  aided: (since: Date) => Promise<{ correct: number; total: number }>;
  projects: ProgressProject[];
};

export type ProgressStore = { load(userId: string, now: Date): Promise<ProgressData> };

type Row = Record<string, unknown>;
const optDate = (v: unknown): Date | null => (v === null || v === undefined ? null : new Date(v as string | Date));

export function createProgressStore(sql: Sql): ProgressStore {
  return {
    async load(userId, now) {
      const admin = await isAdminUser(sql, userId);
      const profile = (
        await sql<Row[]>`
          select timezone,
                 weekly_minutes_target,
                 (${now}::timestamptz at time zone timezone)::date::text as today,
                 date_trunc('week', ${now}::timestamptz at time zone timezone)::date::text as week_start
            from public.profiles where id = ${userId}`
      )[0];
      if (!profile) throw new Error("profile row missing for the authenticated user");
      const tz = String(profile["timezone"]);
      const weekStart = String(profile["week_start"]);

      const [target, weeks, skills, states, checkpoints, projects] = await Promise.all([
        sql<Row[]>`select target_minutes from public.weekly_plans where user_id = ${userId} and week_start = ${weekStart}::date`,
        sql<Row[]>`
          select g.d::date::text as start_date,
                 coalesce(sum(s.actual_min), 0)::int as minutes
            from generate_series((${weekStart}::date - 49)::timestamp, ${weekStart}::timestamp, interval '7 days') as g(d)
            left join public.sessions s
              on s.user_id = ${userId} and s.status = 'completed' and s.actual_min is not null
             and date_trunc('week', coalesce(s.ended_at, s.started_at, s.created_at) at time zone ${tz})::date = g.d::date
           group by g.d order by g.d`,
        sql<Row[]>`
          select s.key, s.node::text as node, s.title, s.tier_target::text as tier_target
            from public.skills s
           where s.retired_at is null and s.status not in ('retired', 'stub') and ${skillVisibleSql(sql, "s", admin)}
           order by s.key`,
        sql<Row[]>`
          select skill_key, mastery_state::text as mastery_state, tier_attained::text as tier_attained, due, last_review,
                 loop_step, epoch_start,
                 case when due is null then null
                      else (due at time zone ${tz})::date - (${now}::timestamptz at time zone ${tz})::date end as due_day_offset
            from public.skill_state where user_id = ${userId}`,
        sql<Row[]>`
          select c.id, c.completed_at, c.started_at,
                 count(a.id) filter (where a.grade_status = 'graded')::int as total,
                 count(a.id) filter (where a.grade_status = 'graded' and a.grade ->> 'correct' = 'true')::int as correct
            from public.checkpoints c
            left join public.attempts a on a.session_id = c.session_id and a.user_id = c.user_id
           where c.user_id = ${userId} and c.status = 'completed' and c.completed_at is not null
           group by c.id order by c.completed_at desc, c.id`,
        sql<Row[]>`
          select up.id, up.project_key, up.status::text as status, up.started_at, p.ladder_level, p.tier_gate::text as tier_gate,
                 (select count(*) from public.project_steps ps where ps.project_key = p.key)::int as steps_total,
                 (select ps.position from public.project_steps ps where ps.key = up.current_step_key) as current_position,
                 (select coalesce(sum(cardinality(ps.evidence_required)), 0) from public.project_steps ps where ps.project_key = p.key)::int as evidence_required,
                 (select count(*) from (
                    select distinct e.step_key, e.evidence_kind
                      from public.project_evidence e
                      join public.project_steps ps on ps.key = e.step_key
                     where e.user_project_id = up.id and e.user_id = ${userId} and e.evidence_status = 'accepted'
                       and e.evidence_kind = any (ps.evidence_required)) x)::int as evidence_accepted,
                 (select count(*) from public.project_evidence e
                   where e.user_project_id = up.id and e.user_id = ${userId} and e.evidence_status = 'needs_review')::int as evidence_pending_review,
                 (select coalesce(jsonb_object_agg(t.n, t.c), '{}'::jsonb) from (
                    select split_part(k, '.', 1) as n, count(*) as c
                      from public.project_steps ps, unnest(ps.skill_keys) k
                     where ps.project_key = p.key group by 1) t) as node_counts
            from public.user_projects up
            join public.projects p on p.key = up.project_key
           where up.user_id = ${userId}
           order by p.ladder_level, up.project_key, up.id`,
      ]);

      return {
        timezone: tz,
        today: String(profile["today"]),
        weekStart,
        minutesTarget: Number(target[0]?.["target_minutes"] ?? profile["weekly_minutes_target"]),
        weeks: weeks.map((r) => ({ startDate: String(r["start_date"]), minutes: Number(r["minutes"]) })),
        skills: skills.map((r) => ({ key: String(r["key"]), node: String(r["node"]), title: String(r["title"]), tierTarget: String(r["tier_target"]) })),
        states: states.map((r) => ({
          skillKey: String(r["skill_key"]),
          masteryState: String(r["mastery_state"]),
          tierAttained: r["tier_attained"] === null ? null : String(r["tier_attained"]),
          due: optDate(r["due"]),
          lastReview: optDate(r["last_review"]),
          loopStep: r["loop_step"] === null ? null : String(r["loop_step"]),
          epochStart: optDate(r["epoch_start"]),
          dueDayOffset: r["due_day_offset"] === null ? null : Number(r["due_day_offset"]),
        })),
        checkpoints: checkpoints.map((r) => ({
          id: String(r["id"]),
          completedAt: new Date(r["completed_at"] as string | Date),
          startedAt: optDate(r["started_at"]),
          correct: Number(r["correct"]),
          total: Number(r["total"]),
        })),
        aided: async (since) => {
          const rows = await sql<Row[]>`
            select count(*)::int as total, count(*) filter (where a.grade ->> 'correct' = 'true')::int as correct
              from public.attempts a
             where a.user_id = ${userId} and a.grade_status = 'graded' and a.unaided = false and a.submitted_at >= ${since}
               and not exists (select 1 from public.checkpoints c where c.user_id = ${userId} and c.session_id = a.session_id)`;
          return { correct: Number(rows[0]?.["correct"] ?? 0), total: Number(rows[0]?.["total"] ?? 0) };
        },
        projects: projects.map((r) => ({
          userProjectId: String(r["id"]),
          projectKey: String(r["project_key"]),
          status: String(r["status"]),
          startedAt: new Date(r["started_at"] as string | Date),
          ladderLevel: Number(r["ladder_level"]),
          tierGate: String(r["tier_gate"]),
          stepsTotal: Number(r["steps_total"]),
          currentPosition: r["current_position"] === null ? null : Number(r["current_position"]),
          evidenceRequired: Number(r["evidence_required"]),
          evidenceAccepted: Number(r["evidence_accepted"]),
          evidencePendingReview: Number(r["evidence_pending_review"]),
          nodeSkillCounts: r["node_counts"] as Record<string, number>,
        })),
      };
    },
  };
}
