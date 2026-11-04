// Privileged reads and writes for the session builder API (BL-0044; doc 06 sections 3.3 and 7, doc 03 5.1).
// `sessions` and `session_tasks` are written only here. skill_state and review_log are NOT touched:
// closing a session hands over to lib/state (commitSessionReviews). Selects never include
// items.params, verification_report or item_secrets; items are referenced by id only.
import type { Sql } from "./db.ts";
import { insertEvents } from "./events-store.ts";

export type SessionRow = {
  id: string;
  sessionType: string;
  context: string;
  status: string;
  availableMinutes: number;
  plannedMin: number;
  actualMin: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  builderVersion: string;
  graphVersion: string | null;
  planSlotId: string | null;
  createdAt: Date;
};

export type TaskRow = {
  id: string;
  sessionId: string;
  position: number;
  taskKind: string;
  skillKey: string | null;
  projectStepKey: string | null;
  itemId: string | null;
  status: string;
  estSeconds: number;
  reason: string | null;
  assessmentKind: string | null;
};

export type SessionWithTasks = SessionRow & { tasks: TaskRow[] };

export type SnapshotSkill = {
  key: string;
  node: string;
  module: string;
  estMinutes: number;
  tierTarget: string;
  confusableSet: string | null;
  status: string;
  /** At least one verified practice template exists, so the pool can ever hold an item for it. */
  templated: boolean;
};

export type SnapshotState = {
  skillKey: string;
  masteryState: string;
  elo: number;
  stability: number;
  difficulty: number;
  due: Date | null;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  fsrsState: number;
  scheduledDays: number;
  learningSteps: number;
  fsrsExtra: Record<string, unknown>;
  tierAttained: string | null;
  source: string;
  loopStep: string | null;
  blockedBy: string[];
  interleaveStage: number;
  firstSeenAt: Date | null;
  /** Start of the current evidence epoch (after a decay); the mastery rule reads attempts from here. */
  epochStart: Date | null;
};

/** An unserved, verified, user-owned practice item that could become a task. */
export type Candidate = {
  itemId: string;
  skillKey: string;
  taskKind: string;
  templateKey: string;
  phoneSuitable: boolean;
  /** items.seed as text (bigint). */
  seed: string;
  /** Elo-scale template difficulty: difficulty_est, else the prior converted (06 section 5.1). */
  difficulty: number;
  /** item_templates.tier; null means the skill's tier_target. */
  tier: string | null;
  /** Canonical answer string (item_secrets.answer_key as jsonb text); null when the item has none. Never sent to clients. */
  answer: string | null;
  /** When the template was last put in a task for this user. */
  lastUsed: Date | null;
};

/** What was already served to the user for one skill, most recent first (06 section 3.8 rule 2). */
export type ServedHistory = {
  /** `${template_key}|${seed}` of every served item. */
  seeds: string[];
  templates: string[];
  answers: string[];
};

export type BuildSnapshot = {
  timezone: string;
  graphVersion: string | null;
  skills: SnapshotSkill[];
  edges: { from: string; to: string; strength: string; minTier: string }[];
  states: SnapshotState[];
  candidates: Candidate[];
  history: Record<string, ServedHistory>;
  /** profiles.settings.max_new_skills_per_day as stored (validated by the builder); null when unset. */
  maxNewSkillsPerDay: unknown;
  /** Distinct skills introduced in the learner's local day: planned as `frontier` in a live session, or first seen today. */
  newSkillsToday: number;
  /** The latest built session carried the review-backlog flag (06 section 7.5 hysteresis). */
  previousBacklog: boolean;
  /** Attempt minutes per node over the last 7 days (06 section 6.3 load balancing). */
  nodeMinutes: Record<string, number>;
  /** Completion time of the latest node-wide checkpoint; null when none. */
  lastCheckpointAt: Date | null;
  /** Latest completed module checkpoint per module name. */
  moduleCheckpointAt: Record<string, Date>;
  /** Mean score of the learner's last interleaved sets per module, oldest first, at most 3 (06 section 7.6). */
  interleaveSets: Record<string, number[]>;
};

export type NewTask = {
  position: number;
  taskKind: string;
  skillKey: string | null;
  itemId: string | null;
  estSeconds: number;
  reason: string;
};

export type NewSession = {
  sessionType: string;
  context: string;
  availableMinutes: number;
  plannedMin: number;
  graphVersion: string | null;
  planSlotId: string | null;
  plan: Record<string, unknown>;
  tasks: NewTask[];
  builderMs: number;
  fill: number;
};

export type CloseInput = { status: "completed" | "abandoned"; endedAt: Date; reason: string; perceivedDifficulty?: number | undefined };
export type CloseResult = "closed" | "already_closed" | "not_found";
export type StartResult = "started" | "already_active" | "not_startable" | "not_found";

export type SummaryRow = {
  sessionId: string;
  status: string;
  actualMin: number;
  tasksDone: number;
  tasksSkipped: number;
  attempts: number;
  correct: number;
  skillsTouched: string[];
  nextDueAt: Date | null;
};

export type ListQuery = { status?: string | undefined; limit: number; before?: { createdAt: Date; id: string } | undefined };

export type SessionStore = {
  /**
   * Abandons planned sessions older than `plannedMaxAgeMin` and active sessions idle past
   * max(idleMin, planned_min) (06 section 3.3). Returns the ids of the idle-closed ones: their
   * review units still have to be committed by the caller.
   */
  sweep(userId: string, now: Date, idleMin: number, plannedMaxAgeMin: number): Promise<string[]>;
  snapshot(userId: string, now: Date): Promise<BuildSnapshot>;
  /**
   * Writes one `break_suggested` event when the active session has run longer than `afterMin` minutes and none
   * was written for it yet (FR-023, LS-055). It never ends or changes the session. True when written.
   */
  suggestBreak(userId: string, sessionId: string, now: Date, afterMin: number): Promise<boolean>;
  ownsPlanSlot(userId: string, planSlotId: string): Promise<boolean>;
  /** Inserts session, tasks and the session_built event; null when the user already has an open session. */
  create(userId: string, input: NewSession, now: Date): Promise<string | null>;
  hasOpenSession(userId: string): Promise<boolean>;
  find(userId: string, sessionId: string): Promise<SessionWithTasks | null>;
  list(userId: string, query: ListQuery): Promise<SessionWithTasks[]>;
  start(userId: string, sessionId: string, now: Date): Promise<StartResult>;
  close(userId: string, sessionId: string, input: CloseInput): Promise<CloseResult>;
  summary(userId: string, sessionId: string): Promise<SummaryRow | null>;
};

type Row = Record<string, unknown>;
const num = (v: unknown): number => Number(v);
const optNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const str = (v: unknown): string => String(v);
const optStr = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const optDate = (v: unknown): Date | null => (v === null || v === undefined ? null : (v as Date));

const MINUTE_MS = 60_000;

function toSession(r: Row): SessionRow {
  return {
    id: str(r["id"]),
    sessionType: str(r["session_type"]),
    context: str(r["context"]),
    status: str(r["status"]),
    availableMinutes: num(r["available_minutes"]),
    plannedMin: num(r["planned_min"]),
    actualMin: optNum(r["actual_min"]),
    startedAt: optDate(r["started_at"]),
    endedAt: optDate(r["ended_at"]),
    builderVersion: str(r["builder_version"]),
    graphVersion: optStr(r["graph_version"]),
    planSlotId: optStr(r["plan_slot_id"]),
    createdAt: r["created_at"] as Date,
  };
}

function toTask(r: Row): TaskRow {
  return {
    id: str(r["id"]),
    sessionId: str(r["session_id"]),
    position: num(r["position"]),
    taskKind: str(r["task_kind"]),
    skillKey: optStr(r["skill_key"]),
    projectStepKey: optStr(r["project_step_key"]),
    itemId: optStr(r["item_id"]),
    status: str(r["status"]),
    estSeconds: num(r["est_seconds"]),
    reason: optStr(r["reason"]),
    assessmentKind: optStr(r["assessment_kind"]),
  };
}

const SESSION_COLS = (db: Sql) => db`s.id, s.session_type::text as session_type, s.context::text as context, s.status::text as status,
  s.available_minutes, s.planned_min, s.actual_min, s.started_at, s.ended_at, s.builder_version, s.graph_version,
  s.plan_slot_id, s.created_at`;

async function attachTasks(db: Sql, sessions: SessionRow[]): Promise<SessionWithTasks[]> {
  if (sessions.length === 0) return [];
  const rows = await db<Row[]>`
    select id, session_id, position, task_kind::text as task_kind, skill_key, project_step_key, item_id,
           status::text as status, est_seconds, reason, assessment_kind
      from public.session_tasks where session_id in ${db(sessions.map((s) => s.id))}
     order by session_id, position`;
  const bySession = new Map<string, TaskRow[]>();
  for (const t of rows.map(toTask)) bySession.set(t.sessionId, [...(bySession.get(t.sessionId) ?? []), t]);
  return sessions.map((s) => ({ ...s, tasks: bySession.get(s.id) ?? [] }));
}

/** Closes one session inside the caller's transaction (complete, abandon, idle timeout, planned expiry). */
async function closeIn(tx: Sql, userId: string, sessionId: string, input: CloseInput): Promise<CloseResult> {
  const found = (
    await tx<Row[]>`select status::text as status, started_at, plan_slot_id from public.sessions
      where id = ${sessionId} and user_id = ${userId} for update`
  )[0];
  if (!found) return "not_found";
  if (found["status"] === "completed" || found["status"] === "abandoned") return "already_closed";
  // The server has no per-task "done" write yet: a task with an attempt is done at the attempt's time.
  await tx`
    update public.session_tasks st set status = 'done', completed_at = coalesce(st.completed_at, a.last_at)
      from (select session_task_id, max(submitted_at) as last_at from public.attempts
             where session_id = ${sessionId} and session_task_id is not null group by session_task_id) a
     where st.id = a.session_task_id and st.session_id = ${sessionId} and st.status <> 'done'`;
  await tx`update public.session_tasks set status = 'skipped' where session_id = ${sessionId} and status in ('pending', 'in_progress')`;
  const started = optDate(found["started_at"]);
  const endedAt = started && input.endedAt < started ? started : input.endedAt;
  const actualMin = started ? Math.round((endedAt.getTime() - started.getTime()) / MINUTE_MS) : 0;
  const plan = input.perceivedDifficulty === undefined ? {} : { perceived_difficulty: input.perceivedDifficulty };
  await tx`
    update public.sessions set status = ${input.status}, ended_at = ${endedAt}, actual_min = ${actualMin},
           plan = plan || ${tx.json(plan)}
     where id = ${sessionId}`;
  const planSlot = optStr(found["plan_slot_id"]);
  if (input.status === "completed" && planSlot !== null) {
    await tx`update public.plan_slots set status = 'done' where id = ${planSlot} and user_id = ${userId} and status = 'planned'`;
  }
  const counts = (
    await tx<{ done: number; active_ms: number }[]>`
      select (select count(*)::int from public.session_tasks where session_id = ${sessionId} and status = 'done') as done,
             (select coalesce(sum(active_ms), 0)::bigint from public.attempts where session_id = ${sessionId}) as active_ms`
  )[0];
  await insertEvents(tx, [
    {
      userId,
      name: "session_ended",
      props: {
        session_id: sessionId,
        actual_min: actualMin,
        active_min: Math.min(actualMin, Math.round(num(counts?.active_ms ?? 0) / MINUTE_MS)),
        tasks_done: num(counts?.done ?? 0),
        ended_reason: input.reason,
      },
    },
  ]);
  return "closed";
}

export function createSessionStore(sql: Sql): SessionStore {
  return {
    async sweep(userId, now, idleMin, plannedMaxAgeMin) {
      const idle: string[] = [];
      await sql.begin(async (t) => {
        const tx = t as unknown as Sql;
        const stale = await tx<{ id: string }[]>`
          select id from public.sessions where user_id = ${userId} and status = 'planned'
             and created_at < ${now}::timestamptz - make_interval(mins => ${plannedMaxAgeMin}) for update`;
        for (const s of stale) await closeIn(tx, userId, s.id, { status: "abandoned", endedAt: now, reason: "planned_expired" });
        const active = await tx<{ id: string; last_at: Date }[]>`
          select s.id, greatest(s.started_at, max(a.submitted_at), max(st.completed_at)) as last_at
            from public.sessions s
            left join public.attempts a on a.session_id = s.id
            left join public.session_tasks st on st.session_id = s.id
           where s.user_id = ${userId} and s.status = 'active'
           group by s.id, s.started_at, s.planned_min
          having greatest(s.started_at, max(a.submitted_at), max(st.completed_at))
                 < ${now}::timestamptz - make_interval(mins => greatest(${idleMin}, s.planned_min))`;
        for (const s of active) {
          const r = await closeIn(tx, userId, s.id, { status: "abandoned", endedAt: s.last_at, reason: "idle_timeout" });
          if (r === "closed") idle.push(s.id);
        }
      });
      return idle;
    },

    async snapshot(userId, now) {
      const [profile, version, skills, edges, states, candidates, served, extras] = await Promise.all([
        sql<{ timezone: string; cap: unknown }[]>`
          select timezone, settings -> 'max_new_skills_per_day' as cap from public.profiles where id = ${userId}`,
        sql<{ v: string }[]>`select left(git_sha, 12) as v from public.content_sync_runs
          where status = 'succeeded' order by finished_at desc nulls last limit 1`,
        sql<Row[]>`
          select s.key, s.node::text as node, s.module, s.est_minutes, s.tier_target::text as tier_target, s.confusable_set,
                 s.status::text as status,
                 exists (select 1 from public.item_templates t where t.skill_key = s.key and t.status = 'verified'
                          and t.pool = 'practice' and t.retired_at is null) as templated
            from public.skills s where s.retired_at is null`,
        sql<Row[]>`
          select e.from_skill_key, e.to_skill_key, e.strength::text as strength, e.min_tier::text as min_tier
            from public.skill_edges e
            join public.skills f on f.key = e.from_skill_key and f.retired_at is null
            join public.skills t on t.key = e.to_skill_key and t.retired_at is null`,
        sql<Row[]>`
          select skill_key, mastery_state::text as mastery_state, elo, stability, difficulty, due, last_review, reps, lapses,
                 fsrs_state, scheduled_days, learning_steps, fsrs_extra, tier_attained::text as tier_attained, source,
                 loop_step, blocked_by, interleave_stage, first_seen_at, epoch_start
            from public.skill_state where user_id = ${userId}`,
        sql<Row[]>`
          with c as (
            select i.id as item_id, t.skill_key, t.task_kind::text as task_kind, t.key as template_key, t.phone_suitable, i.created_at,
                   i.seed::text as seed, coalesce(t.difficulty_est, 1200 + 600 * t.difficulty_prior) as difficulty,
                   t.tier::text as tier, (select k.answer_key::text from public.item_secrets k where k.item_id = i.id) as answer,
                   (select max(st.created_at) from public.session_tasks st join public.items i2 on i2.id = st.item_id
                     where st.user_id = ${userId} and i2.template_key = t.key) as last_used
              from public.items i
              join public.item_templates t on t.key = i.template_key and t.version = i.template_version
             where i.user_id = ${userId} and i.status = 'verified' and i.retired_at is null
               and t.status = 'verified' and t.pool = 'practice' and t.retired_at is null
               and not exists (select 1 from public.session_tasks st where st.item_id = i.id)
               and not exists (select 1 from public.attempts a where a.item_id = i.id))
          select item_id, skill_key, task_kind, template_key, phone_suitable, seed, difficulty, tier, answer, last_used
            from (select c.*, row_number() over (partition by skill_key, task_kind
                                                  order by last_used asc nulls first, created_at, item_id) as rn from c) x
           where rn <= 40
           order by skill_key, task_kind, rn`,
        sql<Row[]>`
          select skill_key, template_key, seed, answer
            from (select t.skill_key, i.template_key, i.seed::text as seed,
                         (select k.answer_key::text from public.item_secrets k where k.item_id = i.id) as answer,
                         row_number() over (partition by t.skill_key order by greatest(
                           (select max(st.created_at) from public.session_tasks st where st.item_id = i.id and st.user_id = ${userId}),
                           (select max(a.created_at) from public.attempts a where a.item_id = i.id and a.user_id = ${userId})) desc) as rn
                    from public.items i
                    join public.item_templates t on t.key = i.template_key and t.version = i.template_version
                   where i.user_id = ${userId}
                     and (exists (select 1 from public.session_tasks st where st.item_id = i.id and st.user_id = ${userId})
                          or exists (select 1 from public.attempts a where a.item_id = i.id and a.user_id = ${userId}))) x
           where rn <= 200
           order by skill_key, rn`,
        Promise.all([
          sql<{ n: number }[]>`
            with p as (select timezone from public.profiles where id = ${userId}),
                 d as (select (date_trunc('day', ${now}::timestamptz at time zone p.timezone) at time zone p.timezone) as day_start from p)
            select count(*)::int as n from (
              select st.skill_key from public.session_tasks st
                join public.sessions s on s.id = st.session_id, d
               where st.user_id = ${userId} and st.reason = 'frontier' and st.skill_key is not null
                 and s.status <> 'abandoned' and s.created_at >= d.day_start
              union
              select ss.skill_key from public.skill_state ss, d
               where ss.user_id = ${userId} and ss.source <> 'placement' and ss.first_seen_at >= d.day_start) x`,
          sql<{ b: string | null }[]>`select plan ->> 'backlog' as b from public.sessions where user_id = ${userId} order by created_at desc limit 1`,
          sql<{ node: string; minutes: number }[]>`
            select s.node::text as node, sum(coalesce(a.active_ms, a.latency_ms, 0)) / 60000.0 as minutes
              from public.attempts a
              join public.items i on i.id = a.item_id
              join public.item_templates t on t.key = i.template_key and t.version = i.template_version
              join public.skills s on s.key = t.skill_key
             where a.user_id = ${userId} and a.submitted_at <= ${now}::timestamptz
               and a.submitted_at >= ${now}::timestamptz - interval '7 days'
             group by s.node`,
          sql<{ scope_module: string | null; at: Date }[]>`
            select scope_module, max(completed_at) as at from public.checkpoints
             where user_id = ${userId} and status = 'completed' and completed_at is not null group by scope_module`,
          sql<{ module: string; accs: number[] }[]>`
            select module, array_agg(acc order by at) as accs from (
              select sk.module, avg((a.grade ->> 'score')::float8) as acc, max(s.created_at) as at,
                     row_number() over (partition by sk.module order by max(s.created_at) desc) as rn
                from public.session_tasks st
                join public.sessions s on s.id = st.session_id
                join public.skills sk on sk.key = st.skill_key
                join public.attempts a on a.session_task_id = st.id and a.grade_status = 'graded'
               where st.user_id = ${userId} and st.reason = 'interleave'
               group by sk.module, st.session_id) x
             where rn <= 3 group by module`,
        ]),
      ]);
      const [today, backlog, minutes, checkpoints, sets] = extras;
      const history: Record<string, ServedHistory> = {};
      for (const r of served) {
        const h = (history[str(r["skill_key"])] ??= { seeds: [], templates: [], answers: [] });
        h.seeds.push(`${str(r["template_key"])}|${str(r["seed"])}`);
        h.templates.push(str(r["template_key"]));
        if (r["answer"] !== null && r["answer"] !== undefined) h.answers.push(str(r["answer"]));
      }
      return {
        timezone: profile[0]?.timezone ?? "UTC",
        graphVersion: version[0]?.v ?? null,
        skills: skills.map((r) => ({
          key: str(r["key"]),
          node: str(r["node"]),
          module: str(r["module"]),
          estMinutes: num(r["est_minutes"]),
          tierTarget: str(r["tier_target"]),
          confusableSet: optStr(r["confusable_set"]),
          status: str(r["status"]),
          templated: r["templated"] === true,
        })),
        edges: edges.map((r) => ({
          from: str(r["from_skill_key"]),
          to: str(r["to_skill_key"]),
          strength: str(r["strength"]),
          minTier: str(r["min_tier"]),
        })),
        states: states.map((r) => ({
          skillKey: str(r["skill_key"]),
          masteryState: str(r["mastery_state"]),
          elo: num(r["elo"]),
          stability: num(r["stability"]),
          difficulty: num(r["difficulty"]),
          due: optDate(r["due"]),
          lastReview: optDate(r["last_review"]),
          reps: num(r["reps"]),
          lapses: num(r["lapses"]),
          fsrsState: num(r["fsrs_state"]),
          scheduledDays: num(r["scheduled_days"]),
          learningSteps: num(r["learning_steps"]),
          fsrsExtra: (r["fsrs_extra"] ?? {}) as Record<string, unknown>,
          tierAttained: optStr(r["tier_attained"]),
          source: str(r["source"]),
          loopStep: optStr(r["loop_step"]),
          blockedBy: (r["blocked_by"] as string[] | null) ?? [],
          interleaveStage: num(r["interleave_stage"]),
          firstSeenAt: optDate(r["first_seen_at"]),
          epochStart: optDate(r["epoch_start"]),
        })),
        candidates: candidates.map((r) => ({
          itemId: str(r["item_id"]),
          skillKey: str(r["skill_key"]),
          taskKind: str(r["task_kind"]),
          templateKey: str(r["template_key"]),
          phoneSuitable: r["phone_suitable"] === true,
          seed: str(r["seed"]),
          difficulty: num(r["difficulty"]),
          tier: optStr(r["tier"]),
          answer: optStr(r["answer"]),
          lastUsed: optDate(r["last_used"]),
        })),
        history,
        maxNewSkillsPerDay: profile[0]?.cap ?? null,
        newSkillsToday: today[0]?.n ?? 0,
        previousBacklog: backlog[0]?.b === "true",
        nodeMinutes: Object.fromEntries(minutes.map((r) => [r.node, num(r.minutes)])),
        lastCheckpointAt: checkpoints.find((r) => r.scope_module === null)?.at ?? null,
        moduleCheckpointAt: Object.fromEntries(checkpoints.flatMap((r) => (r.scope_module === null ? [] : [[r.scope_module, r.at] as const]))),
        interleaveSets: Object.fromEntries(sets.map((r) => [r.module, r.accs.map(Number)])),
      };
    },

    suggestBreak: (userId, sessionId, now, afterMin) =>
      sql.begin(async (t) => {
        const tx = t as unknown as Sql;
        const row = (
          await tx<{ status: string; started_at: Date | null }[]>`
            select status::text as status, started_at from public.sessions where id = ${sessionId} and user_id = ${userId} for update`
        )[0];
        if (!row || row.status !== "active" || row.started_at === null) return false;
        const elapsedMs = now.getTime() - row.started_at.getTime();
        if (elapsedMs <= afterMin * MINUTE_MS) return false;
        const done = await tx`select 1 from public.events where user_id = ${userId} and name = 'break_suggested' and props ->> 'session_id' = ${sessionId} limit 1`;
        if (done.length > 0) return false;
        await insertEvents(tx, [{ userId, name: "break_suggested", props: { session_id: sessionId, minutes_in: Math.floor(elapsedMs / MINUTE_MS) } }]);
        return true;
      }),

    ownsPlanSlot: async (userId, planSlotId) =>
      (await sql<{ ok: boolean }[]>`select exists (select 1 from public.plan_slots where id = ${planSlotId} and user_id = ${userId}) as ok`)[0]?.ok === true,

    hasOpenSession: async (userId) =>
      (await sql<{ ok: boolean }[]>`select exists (select 1 from public.sessions where user_id = ${userId} and status in ('planned', 'active')) as ok`)[0]?.ok === true,

    create: (userId, input, now) =>
      sql.begin(async (t) => {
        const tx = t as unknown as Sql;
        // One open session per user: the advisory lock serialises concurrent builds of the same user.
        await tx`select pg_advisory_xact_lock(hashtextextended(${`session-build:${userId}`}, 0))`;
        const open = await tx`select 1 from public.sessions where user_id = ${userId} and status in ('planned', 'active') limit 1`;
        if (open.length > 0) return null;
        const row = (
          await tx<{ id: string }[]>`
            insert into public.sessions (user_id, session_type, context, planned_min, available_minutes, graph_version, plan_slot_id, plan, created_at)
            values (${userId}, ${input.sessionType}, ${input.context}, ${input.plannedMin}, ${input.availableMinutes}, ${input.graphVersion},
                    ${input.planSlotId}, ${tx.json(input.plan as Parameters<typeof tx.json>[0])}, ${now})
            returning id`
        )[0];
        if (!row) throw new Error("session insert returned no row");
        const values = input.tasks.map((k) => ({
          session_id: row.id,
          user_id: userId,
          position: k.position,
          task_kind: k.taskKind,
          skill_key: k.skillKey,
          item_id: k.itemId,
          est_seconds: k.estSeconds,
          reason: k.reason,
        }));
        await tx`insert into public.session_tasks ${tx(values, "session_id", "user_id", "position", "task_kind", "skill_key", "item_id", "est_seconds", "reason")}`;
        await insertEvents(tx, [
          {
            userId,
            name: "session_built",
            props: {
              session_id: row.id,
              session_type: input.sessionType,
              context: input.context,
              available_minutes: input.availableMinutes,
              fill: input.fill,
              builder_ms: input.builderMs,
            },
          },
        ]);
        return row.id;
      }),

    async find(userId, sessionId) {
      const rows = await sql<Row[]>`select ${SESSION_COLS(sql)} from public.sessions s where s.id = ${sessionId} and s.user_id = ${userId}`;
      return (await attachTasks(sql, rows.map(toSession)))[0] ?? null;
    },

    async list(userId, query) {
      const before = query.before;
      const rows = await sql<Row[]>`
        select ${SESSION_COLS(sql)} from public.sessions s
         where s.user_id = ${userId}
           ${query.status === undefined ? sql`` : sql`and s.status = ${query.status}`}
           ${before === undefined ? sql`` : sql`and (s.created_at, s.id) < (${before.createdAt}::timestamptz, ${before.id}::uuid)`}
         order by s.created_at desc, s.id desc limit ${query.limit}`;
      return attachTasks(sql, rows.map(toSession));
    },

    start: (userId, sessionId, now) =>
      sql.begin(async (t) => {
        const tx = t as unknown as Sql;
        const row = (
          await tx<{ status: string; session_type: string; context: string; planned_min: number }[]>`
            select status::text as status, session_type::text as session_type, context::text as context, planned_min
              from public.sessions where id = ${sessionId} and user_id = ${userId} for update`
        )[0];
        if (!row) return "not_found" as const;
        if (row.status === "active") return "already_active" as const;
        if (row.status !== "planned") return "not_startable" as const;
        await tx`update public.sessions set status = 'active', started_at = ${now} where id = ${sessionId}`;
        await insertEvents(tx, [
          {
            userId,
            name: "session_started",
            props: { session_id: sessionId, session_type: row.session_type, context: row.context, planned_min: row.planned_min },
          },
        ]);
        return "started" as const;
      }),

    close: (userId, sessionId, input) => sql.begin((t) => closeIn(t as unknown as Sql, userId, sessionId, input)),

    async summary(userId, sessionId) {
      const r = (
        await sql<Row[]>`
          select s.id, s.status::text as status, coalesce(s.actual_min, 0) as actual_min,
                 (select count(*)::int from public.session_tasks where session_id = s.id and status = 'done') as tasks_done,
                 (select count(*)::int from public.session_tasks where session_id = s.id and status = 'skipped') as tasks_skipped,
                 (select count(*)::int from public.attempts where session_id = s.id) as attempts,
                 (select count(*)::int from public.attempts where session_id = s.id and grade ->> 'correct' = 'true') as correct,
                 (select coalesce(array_agg(distinct skill_key order by skill_key), '{}') from public.session_tasks
                   where session_id = s.id and status = 'done' and skill_key is not null) as skills_touched,
                 (select min(due) from public.skill_state where user_id = s.user_id and due is not null
                    and mastery_state in ('learning', 'reviewing', 'mastered', 'decayed')) as next_due_at
            from public.sessions s where s.id = ${sessionId} and s.user_id = ${userId}`
      )[0];
      if (!r) return null;
      return {
        sessionId: str(r["id"]),
        status: str(r["status"]),
        actualMin: num(r["actual_min"]),
        tasksDone: num(r["tasks_done"]),
        tasksSkipped: num(r["tasks_skipped"]),
        attempts: num(r["attempts"]),
        correct: num(r["correct"]),
        skillsTouched: (r["skills_touched"] as string[]) ?? [],
        nextDueAt: optDate(r["next_due_at"]),
      };
    },
  };
}
