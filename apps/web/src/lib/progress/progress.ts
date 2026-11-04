// getProgress (BL-0190; FR-090, US-041, docs/09 S15, 00a J8, doc 06 section 4.6). Read-only: every number is a count
// derived from the caller's own skill_state, attempts, sessions, checkpoints and project rows. No percentages, no
// streak, no XP and no badge; the UI prints any percentage from the counts. Nothing here writes learner state.
import type { components } from "@polymath/shared-types";
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { appliedGapSkills, REVIEW_MIN_PER_SKILL } from "@/lib/sessions/pack-inputs.ts";
import { defaultStateDeps, type StateDeps } from "@/lib/state/apply-attempt.ts";
import { privilegedDb } from "@/server/privileged/db";
import { createProgressStore, type ProgressData, type ProgressProject, type ProgressStore } from "@/server/privileged/progress-store";

type Progress = components["schemas"]["Progress"];
type NodeProgress = components["schemas"]["NodeProgress"];
type Counts = components["schemas"]["MasteryCounts"];

export type ProgressDeps = { store: ProgressStore; state: () => Promise<StateDeps>; now: () => Date };
export const defaultProgressDeps = (): ProgressDeps => ({ store: createProgressStore(privilegedDb()), state: defaultStateDeps, now: () => new Date() });

const MASTERY_STATES = ["unseen", "learning", "reviewing", "mastered", "decayed"] as const;
const AT_L1_OR_HIGHER: readonly string[] = ["L1", "L2", "L3"];
const L1_OR_BELOW: readonly string[] = ["L0", "L1"];
/** Section 4.6 of doc 06 and the OpenAPI description: a node is L1 working from this share of its L1-scope skills. */
const L1_WORKING_SHARE = 0.9;
const HORIZON_DAYS = 7;
const CHECKPOINTS_SHOWN = 5;
const GAP_LINE_MIN_CHECKPOINTS = 3;
/** States that carry an FSRS card and so can be due (06 section 4.3). */
const CARD_STATES: readonly string[] = ["learning", "reviewing", "mastered", "decayed"];

const emptyCounts = (): Counts => ({ unseen: 0, learning: 0, reviewing: 0, mastered: 0, decayed: 0 });

/** yyyy-mm-dd plus whole days (calendar arithmetic, no time zone involved). */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The project that counts as the node's L1 gate: most skills of the node in its steps, then lowest ladder level. */
function gateProject(projects: readonly ProgressProject[], node: string): ProgressProject | undefined {
  let best: ProgressProject | undefined;
  for (const p of projects) {
    const n = p.nodeSkillCounts[node] ?? 0;
    if (p.tierGate !== "L1" || n === 0) continue;
    if (!best || n > (best.nodeSkillCounts[node] ?? 0)) best = p;
  }
  return best;
}

function stepsDone(p: ProgressProject): number {
  if (p.status === "completed") return p.stepsTotal;
  return p.currentPosition === null ? 0 : Math.min(p.stepsTotal, Math.max(0, p.currentPosition - 1));
}

export function buildProgress(data: ProgressData, needsApplied: number, aided: { correct: number; total: number } | null, now: Date): Progress {
  const stateOf = new Map(data.states.map((s) => [s.skillKey, s]));
  const stateName = (key: string): keyof Counts => (stateOf.get(key)?.masteryState as keyof Counts | undefined) ?? "unseen";

  const totals = emptyCounts();
  const byNode = new Map<string, { counts: Counts; tiers: NodeProgress["tier_counts"]; skills: number; scope: number; atL1: number }>();
  for (const sk of data.skills) {
    const st = stateOf.get(sk.key);
    const name = MASTERY_STATES.includes(stateName(sk.key)) ? stateName(sk.key) : "unseen";
    totals[name]++;
    const n = byNode.get(sk.node) ?? { counts: emptyCounts(), tiers: { none: 0, L0: 0, L1: 0, L2: 0, L3: 0 }, skills: 0, scope: 0, atL1: 0 };
    n.skills++;
    n.counts[name]++;
    const tier = st?.tierAttained ?? null;
    n.tiers[(tier ?? "none") as keyof NodeProgress["tier_counts"]]++;
    if (L1_OR_BELOW.includes(sk.tierTarget)) {
      n.scope++;
      if (tier !== null && AT_L1_OR_HIGHER.includes(tier)) n.atL1++;
    }
    byNode.set(sk.node, n);
  }

  const nodes: NodeProgress[] = [...byNode.keys()].sort().map((node) => {
    const n = byNode.get(node) as NonNullable<ReturnType<typeof byNode.get>>;
    const gate = gateProject(data.projects, node);
    const evidenceOk = gate !== undefined && gate.evidenceAccepted >= gate.evidenceRequired;
    return {
      node: node as NodeProgress["node"],
      skills_total: n.skills,
      by_mastery_state: n.counts,
      tier_counts: n.tiers,
      l1_scope_skills: n.scope,
      l1_scope_at_l1: n.atL1,
      l1_gate_project: gate
        ? {
            project_key: gate.projectKey as NonNullable<NodeProgress["l1_gate_project"]>["project_key"],
            status: gate.status as NonNullable<NodeProgress["l1_gate_project"]>["status"],
            steps_done: stepsDone(gate),
            steps_total: gate.stepsTotal,
            evidence_accepted: gate.evidenceAccepted,
            evidence_required: gate.evidenceRequired,
          }
        : null,
      l1_working: n.scope > 0 && n.atL1 / n.scope >= L1_WORKING_SHARE && evidenceOk,
    };
  });

  // Review load: the review queue's rule (card state, not mid-loop, a due date), by local day over the next 7 days.
  const skillKeys = new Set(data.skills.map((s) => s.key));
  const dueDays = Array.from({ length: HORIZON_DAYS }, () => 0);
  let overdueNow = 0;
  for (const st of data.states) {
    const inLoop = st.masteryState === "learning" && st.loopStep !== null && st.loopStep !== "done";
    if (!skillKeys.has(st.skillKey) || !CARD_STATES.includes(st.masteryState) || inLoop || st.due === null || st.dueDayOffset === null) continue;
    if (st.due <= now) overdueNow++;
    const day = Math.max(0, st.dueDayOffset); // overdue reviews count on today
    if (day < HORIZON_DAYS) dueDays[day] = (dueDays[day] ?? 0) + 1;
  }
  const totalDue = dueDays.reduce((a, b) => a + b, 0);

  const recent = data.checkpoints.slice(0, CHECKPOINTS_SHOWN);
  const titleOf = new Map(data.skills.map((s) => [s.key, s.title]));
  const decayed = data.states
    .filter((s) => s.masteryState === "decayed" && skillKeys.has(s.skillKey))
    .sort((a, b) => (a.lastReview?.getTime() ?? -Infinity) - (b.lastReview?.getTime() ?? -Infinity) || (a.skillKey < b.skillKey ? -1 : 1));

  const week = data.weeks[data.weeks.length - 1];
  return {
    generated_at: now.toISOString(),
    timezone: data.timezone,
    week: {
      start_date: data.weekStart,
      end_date: addDays(data.weekStart, 6),
      minutes_done: week?.minutes ?? 0,
      minutes_target: data.minutesTarget,
      history: data.weeks.map((w) => ({ start_date: w.startDate, minutes_done: w.minutes })),
    },
    totals: { skills: data.skills.length, needs_applied: needsApplied, by_mastery_state: totals },
    nodes,
    review_load: {
      horizon_days: 7,
      overdue_now: overdueNow,
      total_due: totalDue,
      estimated_minutes: Math.ceil(totalDue * REVIEW_MIN_PER_SKILL),
      days: dueDays.map((due, i) => ({ date: addDays(data.today, i), due })),
    },
    projects: data.projects.map((p) => ({
      user_project_id: p.userProjectId,
      project_key: p.projectKey as Progress["projects"][number]["project_key"],
      status: p.status as Progress["projects"][number]["status"],
      steps_done: stepsDone(p),
      steps_total: p.stepsTotal,
      evidence_pending_review: p.evidencePendingReview,
    })),
    checkpoints: {
      completed_count: data.checkpoints.length,
      recent: recent.map((c) => ({ checkpoint_id: c.id, completed_at: c.completedAt.toISOString(), correct: c.correct, total: c.total })),
      aided_vs_unaided:
        data.checkpoints.length >= GAP_LINE_MIN_CHECKPOINTS && aided
          ? {
              aided,
              unaided: recent.reduce((a, c) => ({ correct: a.correct + c.correct, total: a.total + c.total }), { correct: 0, total: 0 }),
            }
          : null,
    },
    decayed: decayed.map((s) => ({
      skill_key: s.skillKey as Progress["decayed"][number]["skill_key"],
      title: titleOf.get(s.skillKey) ?? s.skillKey,
      last_review_at: s.lastReview === null ? null : s.lastReview.toISOString(),
    })),
  };
}

export async function getProgress(ctx: ApiContext, deps: ProgressDeps = defaultProgressDeps()): Promise<Response> {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  const user = ctx.caller.userId;
  // The operation takes no parameters; a user_id (or anything else) is refused, never honoured (ST-API-01).
  for (const name of new URL(ctx.request.url).searchParams.keys())
    throw new ApiError("validation_failed", { errors: [{ field: name, message: "is not a parameter of this operation" }] });
  const now = deps.now();
  const data = await deps.store.load(user, now);
  const applied = await appliedGapSkills(user, data, await deps.state());
  const recent = data.checkpoints.slice(0, CHECKPOINTS_SHOWN);
  const since = recent.map((c) => c.startedAt ?? c.completedAt).sort((a, b) => a.getTime() - b.getTime())[0];
  const aided = data.checkpoints.length >= GAP_LINE_MIN_CHECKPOINTS && since ? await data.aided(since) : null;
  return json(buildProgress(data, applied.size, aided, now));
}
