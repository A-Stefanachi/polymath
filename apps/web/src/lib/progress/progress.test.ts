// BL-0190 acceptance. Part 1 is pure (buildProgress boundaries: the 90 percent L1 rule, the 3-checkpoint gap line, the
// 5-checkpoint window). Part 2 runs through defineRoute on the local database (skipped without one unless REQUIRE_DB=1):
// AC-1 the response parses with the schema generated from api.openapi.yaml, AC-2 every number equals a direct SQL count
// for a seeded user and nobody else's rows leak, AC-3 no streak/XP/badge field and no answer/params field.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { DEFAULT_PARAMS } from "@polymath/scheduler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import { defineRoute, type ApiDeps } from "@/lib/api/route";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { sharedFsrsPort, type StateDeps } from "@/lib/state/apply-attempt.ts";
import { createStateStore } from "@/server/privileged/state-store";
import { createProgressStore, type ProgressData, type ProgressProject } from "@/server/privileged/progress-store";
import { buildProgress, getProgress, type ProgressDeps } from "./progress.ts";

// ---------- part 1: pure boundaries ----------

const NOW = new Date("2026-11-18T19:05:00Z");
const day = (n: number): Date => new Date(NOW.getTime() - n * 86_400_000);

function data(over: Partial<ProgressData> = {}): ProgressData {
  return {
    timezone: "Europe/Rome",
    today: "2026-11-18",
    weekStart: "2026-11-16",
    minutesTarget: 480,
    weeks: Array.from({ length: 8 }, (_, i) => ({ startDate: `w${i}`, minutes: i })),
    skills: [],
    states: [],
    checkpoints: [],
    aided: async () => ({ correct: 0, total: 0 }),
    projects: [],
    ...over,
  };
}
const cp = (n: number) => ({ id: `cp${n}`, completedAt: day(n), startedAt: day(n), correct: n, total: 10 });
const gate = (accepted: number): ProgressProject => ({
  userProjectId: "up",
  projectKey: "prj.L1.x",
  status: "active",
  startedAt: day(3),
  ladderLevel: 1,
  tierGate: "L1",
  stepsTotal: 3,
  currentPosition: 2,
  evidenceRequired: 3,
  evidenceAccepted: accepted,
  evidencePendingReview: 0,
  nodeSkillCounts: { elec: 2 },
});
/** 10 elec skills with tier_target L1; `atL1` of them have tier_attained L1. */
function elec(atL1: number, projects: ProgressProject[]): ProgressData {
  const skills = Array.from({ length: 10 }, (_, i) => ({ key: `elec.m.s${i}`, node: "elec", title: `s${i}`, tierTarget: "L1" }));
  const states = skills.slice(0, atL1).map((s) => ({
    skillKey: s.key, masteryState: "mastered", tierAttained: "L1", due: null, lastReview: day(1), loopStep: null, epochStart: null, dueDayOffset: null,
  }));
  return data({ skills, states, projects });
}
const elecNode = (p: ReturnType<typeof buildProgress>) => p.nodes.find((n) => n.node === "elec");

describe("buildProgress", () => {
  it("AC-2: l1_working needs 90 percent of the L1 scope at L1 and all required evidence accepted (9 of 10 and 3 of 3 passes; 8 of 10 or 2 of 3 does not)", () => {
    expect(elecNode(buildProgress(elec(9, [gate(3)]), 0, null, NOW))?.l1_working).toBe(true);
    expect(elecNode(buildProgress(elec(8, [gate(3)]), 0, null, NOW))?.l1_working).toBe(false);
    expect(elecNode(buildProgress(elec(9, [gate(2)]), 0, null, NOW))?.l1_working).toBe(false);
    expect(elecNode(buildProgress(elec(10, []), 0, null, NOW))?.l1_working).toBe(false);
    const n = elecNode(buildProgress(elec(9, [gate(2)]), 0, null, NOW));
    expect(n).toMatchObject({ l1_scope_skills: 10, l1_scope_at_l1: 9, l1_gate_project: { steps_done: 1, steps_total: 3, evidence_accepted: 2, evidence_required: 3 } });
  });

  it("AC-2: the aided versus unaided comparison is null with 2 completed checkpoints and present with 3; recent keeps the newest 5", () => {
    const aided = { correct: 8, total: 10 };
    expect(buildProgress(data({ checkpoints: [cp(1), cp(2)] }), 0, aided, NOW).checkpoints.aided_vs_unaided).toBeNull();
    const three = buildProgress(data({ checkpoints: [cp(1), cp(2), cp(3)] }), 0, aided, NOW).checkpoints;
    expect(three.aided_vs_unaided).toEqual({ aided, unaided: { correct: 6, total: 30 } });
    const six = buildProgress(data({ checkpoints: [1, 2, 3, 4, 5, 6].map(cp) }), 0, aided, NOW).checkpoints;
    expect(six.completed_count).toBe(6);
    expect(six.recent.map((c) => c.checkpoint_id)).toEqual(["cp1", "cp2", "cp3", "cp4", "cp5"]);
    expect(six.aided_vs_unaided?.unaided).toEqual({ correct: 15, total: 50 });
  });

  it("AC-2: the week history has 8 entries ending with the current week, and the 7 review days start today", () => {
    const p = buildProgress(data(), 2, null, NOW);
    expect(p.week.history).toHaveLength(8);
    expect(p.week.minutes_done).toBe(7);
    expect(p.week.end_date).toBe("2026-11-22");
    expect(p.totals.needs_applied).toBe(2);
    expect(p.review_load.days.map((d) => d.date)).toEqual(["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24"]);
  });
});

// ---------- part 2: database ----------

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");
const silent = { ...logger.child({}), info: () => undefined, error: () => undefined } as typeof logger;
type Json = ReturnType<typeof JSON.parse>;

const apiDeps = (userId: string): ApiDeps => ({
  authenticate: async () => ({ userId }),
  idempotency: () => {
    throw new Error("getProgress takes no idempotency store");
  },
  rateLimit: () => ({ take: async () => 0 }),
  logger: silent,
});
const now = new Date();
const stateDeps = async (): Promise<StateDeps> => ({ store: createStateStore(sql), fsrs: await sharedFsrsPort(), params: DEFAULT_PARAMS });
const deps: ProgressDeps = { store: createProgressStore(sql), state: stateDeps, now: () => now };
const progress = (userId: string, query = "") =>
  defineRoute("getProgress", (c) => getProgress(c, deps), apiDeps(userId))(new Request(`http://localhost/api/v1/progress${query}`));

/** The Progress schema of api.openapi.yaml as a strict zod schema (extra fields fail). */
function progressSchema(): z.ZodType {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
  const yaml = createRequire(path.join(root, "package.json"))("yaml") as { parse: (s: string) => { components: { schemas: Record<string, unknown> } } };
  const doc = yaml.parse(readFileSync(path.join(root, "polymath-app-spec/schemas/api.openapi.yaml"), "utf8"));
  const strict = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(strict);
    if (v === null || typeof v !== "object") return v;
    const o = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, strict(x)]));
    if (o["properties"] && o["additionalProperties"] === undefined) o["additionalProperties"] = false;
    return o;
  };
  const defs = strict(JSON.parse(JSON.stringify(doc.components.schemas).replaceAll("#/components/schemas/", "#/$defs/"))) as Record<string, unknown>;
  return z.fromJSONSchema({ $ref: "#/$defs/Progress", $defs: defs } as Parameters<typeof z.fromJSONSchema>[0]);
}

const tag = randomUUID().slice(0, 8).replaceAll(/[^a-f0-9]/g, "a");
const mod = `bl90${tag}`;
const key = (n: string) => `math.${mod}.${n}`;
const [P1, P2, P3, P4, P5, PS] = ["p1", "p2", "p3", "p4", "p5", "stub"].map(key) as [string, string, string, string, string, string];
const KINDS = ["retrieval", "worked_example", "faded_problem", "problem"];
const tpl = (kind: string) => `tpl.math.bl90-${kind.replaceAll("_", "")}-${tag}`;
const tplAlt = `tpl.math.bl90-retrievalalt-${tag}`;
/** Checkpoint and aided-practice answers use P5's template, so they add no evidence to P2 (which must stay at "only the applied attempt missing"). */
const tplOther = `tpl.math.bl90-retrievalp5-${tag}`;
const projectKey = `prj.L1.bl90${tag}`;
const stepKey = (n: number) => `${projectKey}#s0${n}`;
let learner = "";
let other = "";
let seed = 1;
const DAY = 86_400_000;

async function addItem(userId: string, template: string): Promise<string> {
  const row = await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
    values (${template}, 1, ${seed++}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified', ${userId}) returning id`;
  return row[0]?.id ?? "";
}
async function attempt(userId: string, template: string, at: Date, opts: { sessionId?: string; correct?: boolean; unaided?: boolean } = {}): Promise<void> {
  const correct = opts.correct ?? true;
  const unaided = opts.unaided ?? true; // the schema ties unaided to max_hint_level <= 1
  const item = await addItem(userId, template);
  await sql`insert into public.attempts (user_id, item_id, session_id, client_attempt_id, started_at, submitted_at, response, grade, grade_status, graded_at,
              active_ms, unaided, max_hint_level, hints_used, state_applied_at)
    values (${userId}, ${item}, ${opts.sessionId ?? null}, ${randomUUID()}, ${at}, ${at}, ${sql.json({ kind: "numeric", value: 1 })},
            ${sql.json({ status: "graded", score: correct ? 1 : 0, correct, graders: [] })}, 'graded', ${at}, 30000, ${unaided}, ${unaided ? 0 : 2}, ${unaided ? 0 : 2}, ${at})`;
}
async function session(userId: string, status: string, actualMin: number | null, endedAt: Date): Promise<string> {
  const row = await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, actual_min, started_at, ended_at, status, available_minutes)
    values (${userId}, 'focus', 'desktop', 60, ${actualMin}, ${new Date(endedAt.getTime() - 3_600_000)}, ${endedAt}, ${status}, 60) returning id`;
  return row[0]?.id ?? "";
}

describe.skipIf(!reachable)("getProgress (database)", () => {
  beforeAll(async () => {
    [learner, other] = [await createTestUser(sql), await createTestUser(sql)];
    await sql`update public.profiles set timezone = 'Europe/Rome', weekly_minutes_target = 300 where id in ${sql([learner, other])}`;
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${mod}`}, 'math', ${mod}, 'BL-0190 test', 0)`;
    for (const [k, tier, stub] of [[P1, "L1", false], [P2, "L1", false], [P3, "L2", false], [P4, "L1", false], [P5, "L1", false], [PS, "L1", true]] as const) {
      await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
        values (${k}, 'math', ${mod}, ${`Skill ${k.slice(-4)}`}, ${tier}, ${stub ? 0 : 10}, 'CC0-1.0', 'bl0190-test', ${stub ? "stub" : "verified"},
                ${sql.array(stub ? [] : KINDS)}::public.task_kind[], ${sql.array(stub ? [] : ["exact_numeric"])}::public.grader_type[], false)`;
    }
    for (const [key, kind] of [...KINDS.map((k) => [tpl(k), k] as const), [tplAlt, "retrieval"] as const]) {
      await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
        values (${key}, ${P2}, ${kind}, 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0190-test', false)`;
    }

    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
      values (${tplOther}, ${P5}, 'retrieval', 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0190-test', false)`;

    const st = (u: string, skill: string, ms: string, due: Date | null, review: Date | null, tier: string | null) =>
      sql`insert into public.skill_state (user_id, skill_key, mastery_state, due, last_review, stability, difficulty, reps, fsrs_state, tier_attained, first_seen_at)
        values (${u}, ${skill}, ${ms}, ${due}, ${review}, 5, 5, 3, 2, ${tier}, ${new Date(now.getTime() - 60 * DAY)})`;
    await st(learner, P1, "mastered", new Date(now.getTime() + 3 * DAY), new Date(now.getTime() - DAY), "L1");
    await st(learner, P2, "reviewing", new Date(now.getTime() + 20 * DAY), new Date(now.getTime() - DAY), "L0");
    await st(learner, P3, "decayed", new Date(now.getTime() - 2 * DAY), new Date(now.getTime() - 30 * DAY), "L0");
    await st(learner, P4, "learning", new Date(now.getTime() - 3_600_000), new Date(now.getTime() - 2 * DAY), null);
    await st(other, P1, "mastered", new Date(now.getTime() + DAY), new Date(now.getTime() - DAY), "L2");
    // P2: three qualifying retrievals on two templates, no applied attempt -> needs_applied (same shape as caps.test AC-4).
    for (const [t, ago] of [[tpl("retrieval"), 6], [tplAlt, 4], [tpl("retrieval"), 1]] as const) await attempt(learner, t, new Date(now.getTime() - ago * DAY));

    // Sessions: this week 30 + 20 completed (an abandoned one and another user's do not count), last week 45, 70 days ago 100 (outside the 8 weeks).
    await session(learner, "completed", 30, new Date(now.getTime() - 60_000));
    await session(learner, "completed", 20, new Date(now.getTime() - 120_000));
    await session(learner, "abandoned", 55, new Date(now.getTime() - 180_000));
    await session(learner, "completed", 45, new Date(now.getTime() - 8 * DAY));
    await session(learner, "completed", 100, new Date(now.getTime() - 70 * DAY));
    await session(other, "completed", 99, new Date(now.getTime() - 60_000));

    // Four completed checkpoints (9, 6, 7 and 3 days ago; the first has 2 of 3 correct) and aided practice inside their window.
    for (const [ago, correctN, total] of [[20, 2, 3], [14, 3, 4], [7, 4, 4], [3, 1, 2]] as const) {
      const at = new Date(now.getTime() - ago * DAY);
      const sid = await session(learner, "completed", 25, at);
      for (let i = 0; i < total; i += 1) await attempt(learner, tplOther, at, { sessionId: sid, correct: i < correctN });
      await sql`insert into public.checkpoints (user_id, scope_node, reason, status, session_id, score, started_at, completed_at)
        values (${learner}, 'math', 'manual', 'completed', ${sid}, ${correctN / total}, ${new Date(at.getTime() - 1_800_000)}, ${at})`;
    }
    await sql`insert into public.checkpoints (user_id, scope_node, reason, status) values (${learner}, 'math', 'manual', 'due')`;
    await attempt(learner, tplOther, new Date(now.getTime() - 5 * DAY), { unaided: false, correct: true });
    await attempt(learner, tplOther, new Date(now.getTime() - 4 * DAY), { unaided: false, correct: false });
    await attempt(learner, tplOther, new Date(now.getTime() - 4 * DAY), { unaided: true, correct: true });
    await attempt(learner, tplOther, new Date(now.getTime() - 40 * DAY), { unaided: false, correct: true }); // before the window

    // One L1 gate project: 3 steps, 3 required evidence pairs, 1 accepted, 1 waiting for review, current step 2.
    await sql`insert into public.projects (key, title, ladder_level, tier_gate, est_hours, license, source) values (${projectKey}, 'BL-0190 gate', 1, 'L1', 2, 'CC0-1.0', 'bl0190-test')`;
    const steps: [number, string[]][] = [[1, ["measurement"]], [2, ["measurement", "note"]], [3, []]];
    for (const [n, ev] of steps) {
      await sql`insert into public.project_steps (key, project_key, position, title, est_min, session_type, skill_keys, evidence_required)
        values (${stepKey(n)}, ${projectKey}, ${n}, 'step', 10, 'micro', ${sql.array([P1])}, ${sql.array(ev)}::public.evidence_kind[])`;
    }
    const up = await sql<{ id: string }[]>`insert into public.user_projects (user_id, project_key, status, current_step_key) values (${learner}, ${projectKey}, 'active', ${stepKey(2)}) returning id`;
    const upId = up[0]?.id ?? "";
    for (const [step, kind, status] of [[1, "measurement", "accepted"], [2, "measurement", "needs_review"], [2, "note", "rejected"]] as const) {
      await sql`insert into public.project_evidence (user_project_id, step_key, evidence_kind, evidence_status, user_id) values (${upId}, ${stepKey(step)}, ${kind}, ${status}, ${learner})`;
    }
  });

  afterAll(async () => {
    const users = [learner, other];
    await sql`delete from public.project_evidence where user_id in ${sql(users)}`;
    await sql`delete from public.user_projects where user_id in ${sql(users)}`;
    await sql`delete from public.project_steps where project_key = ${projectKey}`;
    await sql`delete from public.projects where key = ${projectKey}`;
    await sql`delete from public.checkpoints where user_id in ${sql(users)}`;
    await sql`delete from public.attempts where user_id in ${sql(users)}`;
    await sql`delete from public.items where template_key like ${`tpl.math.bl90-%-${tag}`}`;
    await sql`delete from public.sessions where user_id in ${sql(users)}`;
    await sql`delete from public.item_templates where key like ${`tpl.math.bl90-%-${tag}`}`;
    await sql`delete from public.skill_state where user_id in ${sql(users)}`;
    await sql`delete from public.skills where key in ${sql([P1, P2, P3, P4, P5, PS])}`;
    await sql`delete from public.modules where key = ${`math.${mod}`}`;
    for (const u of users) await deleteTestUser(sql, u);
    await sql.end();
  });

  it("AC-1: the response parses with the Progress schema generated from api.openapi.yaml, with no extra fields", async () => {
    const res = await progress(learner);
    expect(res.status).toBe(200);
    const parsed = progressSchema().safeParse(await res.json());
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
  });

  it("AC-2: every number equals a direct SQL count over skill_state, attempts, sessions, checkpoints and project_evidence", async () => {
    const one = async <T>(q: Promise<T[]>): Promise<T> => (await q)[0] as T;
    const sqlTotals = await one(sql<Json[]>`
      select count(*)::int as skills,
             count(*) filter (where coalesce(ss.mastery_state::text, 'unseen') = 'unseen')::int as unseen,
             count(*) filter (where ss.mastery_state = 'learning')::int as learning,
             count(*) filter (where ss.mastery_state = 'reviewing')::int as reviewing,
             count(*) filter (where ss.mastery_state = 'mastered')::int as mastered,
             count(*) filter (where ss.mastery_state = 'decayed')::int as decayed
        from public.skills s left join public.skill_state ss on ss.skill_key = s.key and ss.user_id = ${learner}
       where s.retired_at is null and s.status in ('verified')`);
    const sqlMath = await one(sql<Json[]>`
      select count(*)::int as n,
             count(*) filter (where s.tier_target in ('L0', 'L1'))::int as scope,
             count(*) filter (where s.tier_target in ('L0', 'L1') and ss.tier_attained in ('L1', 'L2', 'L3'))::int as at_l1,
             count(*) filter (where ss.tier_attained is null)::int as tier_none,
             count(*) filter (where ss.tier_attained = 'L0')::int as tier_l0
        from public.skills s left join public.skill_state ss on ss.skill_key = s.key and ss.user_id = ${learner}
       where s.retired_at is null and s.status = 'verified' and s.node = 'math'`);
    const sqlWeek = await one(sql<Json[]>`
      select coalesce(sum(actual_min), 0)::int as done from public.sessions
       where user_id = ${learner} and status = 'completed'
         and date_trunc('week', ended_at at time zone 'Europe/Rome') = date_trunc('week', ${now}::timestamptz at time zone 'Europe/Rome')`);
    const sqlPrev = await one(sql<Json[]>`
      select coalesce(sum(actual_min), 0)::int as done from public.sessions
       where user_id = ${learner} and status = 'completed'
         and date_trunc('week', ended_at at time zone 'Europe/Rome') = date_trunc('week', ${now}::timestamptz at time zone 'Europe/Rome') - interval '7 days'`);
    const sqlHistory = await one(sql<Json[]>`
      select coalesce(sum(actual_min), 0)::int as done from public.sessions
       where user_id = ${learner} and status = 'completed'
         and date_trunc('week', ended_at at time zone 'Europe/Rome') >= date_trunc('week', ${now}::timestamptz at time zone 'Europe/Rome') - interval '49 days'`);
    const sqlOverdue =await one(sql<Json[]>`
      select count(*)::int as n from public.skill_state ss join public.skills s on s.key = ss.skill_key
       where ss.user_id = ${learner} and s.status = 'verified' and ss.mastery_state in ('learning', 'reviewing', 'mastered', 'decayed')
         and ss.due <= ${now} and not (ss.mastery_state = 'learning' and ss.loop_step is not null and ss.loop_step <> 'done')`);
    const sqlCheckpoints = await sql<Json[]>`
      select c.id, count(a.id)::int as total, count(a.id) filter (where a.grade ->> 'correct' = 'true')::int as correct
        from public.checkpoints c join public.attempts a on a.session_id = c.session_id
       where c.user_id = ${learner} and c.status = 'completed' group by c.id, c.completed_at order by c.completed_at desc`;
    const sqlAided = await one(sql<Json[]>`
      select count(*)::int as total, count(*) filter (where grade ->> 'correct' = 'true')::int as correct
        from public.attempts where user_id = ${learner} and unaided = false and session_id is null
         and submitted_at >= ${new Date(now.getTime() - 20 * DAY - 1_800_000)}`);
    const sqlEvidence = await one(sql<Json[]>`
      select count(*) filter (where evidence_status = 'accepted')::int as accepted, count(*) filter (where evidence_status = 'needs_review')::int as pending
        from public.project_evidence where user_id = ${learner}`);

    const body = (await (await progress(learner)).json()) as Json;
    expect(body.totals.skills).toBe(sqlTotals["skills"]);
    expect(body.totals.by_mastery_state).toEqual({ unseen: sqlTotals["unseen"], learning: sqlTotals["learning"], reviewing: sqlTotals["reviewing"], mastered: sqlTotals["mastered"], decayed: sqlTotals["decayed"] });
    expect(body.totals.needs_applied).toBe(1); // P2: only the applied attempt is missing
    const math = body.nodes.find((n: Json) => n.node === "math");
    expect(math).toMatchObject({ skills_total: sqlMath["n"], l1_scope_skills: sqlMath["scope"], l1_scope_at_l1: sqlMath["at_l1"], l1_working: false });
    expect(math.tier_counts.none).toBe(sqlMath["tier_none"]);
    expect(math.tier_counts.L0).toBe(sqlMath["tier_l0"]);
    expect(math.l1_gate_project).toMatchObject({ project_key: projectKey, steps_done: 1, steps_total: 3, evidence_accepted: sqlEvidence["accepted"], evidence_required: 3 });
    expect(body.projects).toEqual([expect.objectContaining({ project_key: projectKey, steps_done: 1, steps_total: 3, evidence_pending_review: sqlEvidence["pending"] })]);

    expect(body.week.minutes_done).toBe(sqlWeek["done"]);
    expect(body.week.minutes_target).toBe(300);
    expect(body.week.history).toHaveLength(8);
    expect(body.week.history[7].minutes_done).toBe(sqlWeek["done"]);
    expect(body.week.history[6].minutes_done).toBe(sqlPrev["done"]);
    expect(body.week.history.map((w: Json) => w.start_date)).toEqual([...body.week.history.map((w: Json) => w.start_date)].sort());
    expect(body.week.history[7].start_date).toBe(body.week.start_date);
    expect(body.week.history.reduce((a: number, w: Json) => a + w.minutes_done, 0)).toBe(sqlHistory["done"]); // the 70-day-old session is outside

    expect(body.review_load.overdue_now).toBe(sqlOverdue["n"]);
    expect(body.review_load.total_due).toBe(body.review_load.days.reduce((a: number, d: Json) => a + d.due, 0));
    expect(body.review_load.days).toHaveLength(7);

    expect(body.checkpoints.completed_count).toBe(sqlCheckpoints.length);
    expect(body.checkpoints.recent.map((c: Json) => [c.checkpoint_id, c.correct, c.total])).toEqual(sqlCheckpoints.map((c) => [c["id"], c["correct"], c["total"]]));
    expect(body.checkpoints.aided_vs_unaided.aided).toEqual({ correct: sqlAided["correct"], total: sqlAided["total"] });
    expect(body.checkpoints.aided_vs_unaided.unaided).toEqual({
      correct: sqlCheckpoints.reduce((a, c) => a + Number(c["correct"]), 0),
      total: sqlCheckpoints.reduce((a, c) => a + Number(c["total"]), 0),
    });
    expect(body.decayed.map((d: Json) => d.skill_key)).toEqual([P3]);
    expect(body.decayed[0].last_review_at).not.toBeNull();
  });

  it("AC-2: another user sees only their own rows; a user_id query parameter is rejected, never honoured", async () => {
    const body = (await (await progress(other)).json()) as Json;
    expect(body.totals.needs_applied).toBe(0);
    expect(body.totals.by_mastery_state.mastered).toBeGreaterThanOrEqual(1);
    expect(body.projects).toEqual([]);
    expect(body.checkpoints).toEqual({ completed_count: 0, recent: [], aided_vs_unaided: null });
    expect(body.decayed).toEqual([]);
    expect(body.week.minutes_done).toBe(99);
    const spoof = await progress(other, `?user_id=${learner}`);
    expect(spoof.status).toBe(400);
    expect(JSON.stringify(await spoof.json())).toContain("user_id");
  });

  it("AC-3: the response has no streak, XP or badge field and no answer, params or key-material field", async () => {
    const names = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v !== null && typeof v === "object")
        for (const [k, x] of Object.entries(v)) {
          names.add(k);
          walk(x);
        }
    };
    walk(await (await progress(learner)).json());
    // skill_key and project_key are identifiers of public content, not key material.
    const banned = [...names].filter((n) => /streak|^xp$|badge|answer|params|solution|secret|hidden|^key$|_key$/.test(n) && !["skill_key", "project_key"].includes(n));
    expect(banned).toEqual([]);
    expect(names.has("skill_key")).toBe(true);
  });
});
