// Session builder glue (BL-0044; doc 06 section 7, 00a A1/G4): turns a database snapshot into the pure
// scheduler's input, and the scheduler's task list into rows with verified items. No I/O and no clock here.
import {
  fromSkillStateColumns,
  microWindow,
  packSession,
  type FsrsPort,
  type PackedTask,
  type PackInput,
  type PackResult,
  type PackSkillState,
  type SchedulerParams,
  type SessionType,
  type Tier,
} from "@polymath/scheduler";
import { tzOffsetMinutes } from "@/lib/state/apply-attempt.ts";
import type { BuildSnapshot, Candidate, NewTask, ServedHistory } from "@/server/privileged/session-store";
import { dropSkippedWorkedExamples, enforceRetrievalGap, selectItem } from "./select-item.ts";

type SkillGraph = PackInput["graph"];

const DAY_MS = 86_400_000;
/** States that carry an FSRS card and so can be due (06 section 4.3). */
const CARD_STATES: readonly string[] = ["learning", "reviewing", "mastered", "decayed"];

export class BuildInputError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

/** Contract 7.2 / 00a A1: 1-44 micro (at most 20 minutes are used), 45-120 focus, 121 or more lab. */
export function sessionTypeFor(availableMinutes: number, requested?: SessionType): SessionType {
  if (requested === undefined) {
    return availableMinutes <= 44 ? "micro" : availableMinutes <= 120 ? "focus" : "lab";
  }
  if (requested === "focus" && availableMinutes < 45) throw new BuildInputError("session_type", "focus needs at least 45 minutes");
  if (requested === "lab" && availableMinutes < 120) throw new BuildInputError("session_type", "lab needs at least 120 minutes");
  return requested;
}

/** Minutes the first session of a window may use: a 21-44 minute window is one micro session of at most 20. */
export function usableMinutes(type: SessionType, availableMinutes: number): number {
  return type === "micro" ? microWindow(availableMinutes).first : availableMinutes;
}

/** End of the learner's local calendar day containing `now`, as an instant (06 section 7.1 `due` flag). */
export function endOfLocalDay(now: Date, timezone: string): Date {
  const offsetMs = tzOffsetMinutes(timezone, now) * 60_000;
  const localDayStart = Math.floor((now.getTime() + offsetMs) / DAY_MS) * DAY_MS;
  return new Date(localDayStart + DAY_MS - offsetMs);
}

export type PackSetup = {
  graph: SkillGraph;
  states: Record<string, PackSkillState>;
  interleave: Record<string, number>;
};

/**
 * Graph and state snapshot for packSession. A skill with no verified practice template is marked `stub`
 * (never offered), so a plan only contains skills the pool can ever serve. `focusSkill` keeps the new-skill
 * slot for that skill by stubbing every other skill the learner has not started.
 */
export function buildPackSetup(snap: BuildSnapshot, now: Date, fsrs: FsrsPort, focusSkill?: string): PackSetup {
  const stateOf = new Map(snap.states.map((s) => [s.skillKey, s]));
  const skills: Record<string, SkillGraph["skills"][string]> = {};
  for (const s of snap.skills) {
    const started = (stateOf.get(s.key)?.masteryState ?? "unseen") !== "unseen";
    const offered = s.templated && (focusSkill === undefined || started || s.key === focusSkill);
    skills[s.key] = {
      node: s.node,
      module: s.module,
      est_minutes: s.estMinutes,
      tier_target: s.tierTarget as Tier,
      ...(s.confusableSet === null ? {} : { confusable_set: s.confusableSet }),
      status: offered ? s.status : "stub",
    };
  }
  const graph: SkillGraph = {
    skills,
    edges: snap.edges.map((e) => ({
      from: e.from,
      to: e.to,
      strength: e.strength === "soft" ? "soft" : "hard",
      min_tier: e.minTier as Tier,
    })),
  };
  const dayEnd = endOfLocalDay(now, snap.timezone);
  const states: Record<string, PackSkillState> = {};
  const interleave: Record<string, number> = {};
  for (const st of snap.states) {
    const skill = skills[st.skillKey];
    if (!skill) continue; // a retired skill keeps its history but leaves the plan
    const reviewed = !(st.fsrsState === 0 && st.lastReview === null);
    const retrievability = reviewed
      ? fsrs.retrievability(
          fromSkillStateColumns({
            stability: st.stability,
            difficulty: st.difficulty,
            due: (st.due ?? now).toISOString(),
            last_review: st.lastReview === null ? null : st.lastReview.toISOString(),
            reps: st.reps,
            lapses: st.lapses,
            fsrs_state: st.fsrsState as 0 | 1 | 2 | 3,
            scheduled_days: st.scheduledDays,
            learning_steps: st.learningSteps,
            fsrs_extra: st.fsrsExtra,
          }),
          now,
        )
      : undefined;
    const inLoop = st.masteryState === "learning" && st.loopStep !== null && st.loopStep !== "done";
    const due = st.due !== null && st.due <= dayEnd && CARD_STATES.includes(st.masteryState) && !inLoop;
    const ageDays = st.source === "placement" && st.firstSeenAt ? (now.getTime() - st.firstSeenAt.getTime()) / DAY_MS : undefined;
    states[st.skillKey] = {
      mastery_state: st.masteryState,
      ...(st.tierAttained === null ? {} : { tier_attained: st.tierAttained as Tier }),
      ...(retrievability === undefined ? {} : { retrievability }),
      elo: st.elo,
      source: st.source,
      ...(ageDays === undefined ? {} : { placement_age_days: ageDays }),
      due,
      loop_step: st.loopStep,
      blocked_by: st.blockedBy,
    };
    interleave[skill.module] = Math.max(interleave[skill.module] ?? 0, st.interleaveStage);
  }
  return { graph, states, interleave };
}

/** Runs the pure packer for one window. */
export function planSession(
  setup: PackSetup,
  type: SessionType,
  context: "phone" | "desktop" | "bench",
  availableMinutes: number,
  params: SchedulerParams,
): PackResult {
  return packSession(
    {
      available_minutes: usableMinutes(type, availableMinutes),
      context,
      session_type: type,
      graph: setup.graph,
      states: setup.states,
      interleave: setup.interleave,
    },
    params,
  );
}

/** Scheduler reasons (06 section 7.4) to the API enum (api.openapi.yaml SessionTask.reason). */
export function apiReason(reason: string): string {
  switch (reason) {
    case "due_review":
    case "due_review_interleaved":
    case "verify_inferred":
      return "due_review";
    case "new_frontier":
      return "frontier";
    case "interleaved_practice":
      return "interleave";
    case "checkpoint_overdue":
    case "checkpoint_due":
      return "checkpoint";
    case "project_step":
    case "lab_review":
      return "project";
    default:
      return "continue"; // continue, applied_gap, practice, same_day_retrieval
  }
}

/** The scheduler's short problem is a `problem` task of the contract's task_kind enum. */
export const dbTaskKind = (kind: string): string => (kind === "problem_short" ? "problem" : kind);

export type SelectionSetup = {
  states: PackSetup["states"];
  graph: SkillGraph;
  history: BuildSnapshot["history"];
  params: SchedulerParams;
};

/**
 * Gives each packed task one distinct verified, unserved item of its skill and kind (phone: only templates
 * flagged `phone_suitable`, 06 section 7.3). The item comes from `selectItem` (difficulty match, tier, no
 * repeated seed or answer; 06 section 3.8). A worked example is skipped on placement evidence and a same-day
 * retrieval without the PRM-04 gap is carried to the next session (select-item.ts). A task without an item is
 * dropped: an unverified or missing item is never substituted (CLAUDE.md rule 3). Positions are 1..n.
 */
export function assignItems(
  packed: readonly PackedTask[],
  candidates: readonly Candidate[],
  context: string,
  sel: SelectionSetup,
): { tasks: NewTask[]; dropped: number } {
  const tasks = enforceRetrievalGap(dropSkippedWorkedExamples(packed, sel.states));
  const pools = new Map<string, Candidate[]>();
  for (const c of candidates) {
    if (context === "phone" && !c.phoneSuitable) continue;
    const k = `${c.skillKey}|${c.taskKind}`;
    pools.set(k, [...(pools.get(k) ?? []), c]);
  }
  const history = new Map<string, ServedHistory>();
  const out: NewTask[] = [];
  let dropped = 0;
  for (const t of tasks) {
    const kind = dbTaskKind(t.task_kind);
    const skill = t.skill_key;
    const pool = skill === null ? undefined : pools.get(`${skill}|${kind}`);
    let item: Candidate | undefined;
    if (skill !== null && pool) {
      let h = history.get(skill);
      if (!h) {
        const prior = sel.history[skill];
        h = { seeds: [...(prior?.seeds ?? [])], templates: [...(prior?.templates ?? [])], answers: [...(prior?.answers ?? [])] };
        history.set(skill, h);
      }
      const state = sel.states[skill];
      item = selectItem(
        pool,
        {
          theta: state?.elo ?? sel.params.elo_init_default,
          tierTarget: sel.graph.skills[skill]?.tier_target ?? "L0",
          belowMastered: state?.mastery_state !== "mastered",
          history: h,
        },
        sel.params,
      );
      if (item) {
        pool.splice(pool.indexOf(item), 1);
        h.seeds.unshift(`${item.templateKey}|${item.seed}`);
        h.templates.unshift(item.templateKey);
        if (item.answer !== null) h.answers.unshift(item.answer);
      }
    }
    if (!item) {
      dropped += 1;
      continue;
    }
    out.push({
      position: out.length + 1,
      taskKind: kind,
      skillKey: t.skill_key,
      itemId: item.itemId,
      estSeconds: Math.max(1, Math.round(t.est_min * 60)),
      reason: apiReason(t.reason),
    });
  }
  return { tasks: out, dropped };
}

const PLANNED_RANGE: Record<string, { lo: number; hi: number }> = {
  micro: { lo: 1, hi: 20 },
  focus: { lo: 45, hi: 120 },
  lab: { lo: 120, hi: 240 },
};

/** sessions.planned_min must sit inside the type's range (schema check sessions_planned_min_by_type). */
export function plannedMinutes(type: string, tasks: readonly NewTask[], availableMinutes: number): number {
  const range = PLANNED_RANGE[type] ?? { lo: 1, hi: 240 };
  const sum = Math.ceil(tasks.reduce((s, t) => s + t.estSeconds, 0) / 60);
  return Math.min(Math.max(sum, range.lo), Math.min(range.hi, Math.max(availableMinutes, range.lo)));
}
