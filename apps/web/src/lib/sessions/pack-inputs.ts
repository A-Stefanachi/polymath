// Packer inputs derived from the database snapshot (BL-0046; doc 06 sections 7.1, 7.4 b2, 7.5, 7.6, 8; 01 FR-023,
// FR-024). Pure functions over the snapshot, except `appliedGapSkills`, which reads attempts through the state store.
// Project steps are not fed: the lean slice has no project-step feed yet, so a lab slot is served as focus (00a G4).
import {
  checkpointStatus,
  interleaveStage,
  needsApplied,
  type CheckpointFlag,
  type SchedulerParams,
  type Tier,
} from "@polymath/scheduler";
import { toMasteryAttempt, type StateDeps } from "@/lib/state/apply-attempt.ts";
import type { BuildSnapshot, SnapshotSkill, SnapshotState } from "@/server/privileged/session-store";

const DAY_MS = 86_400_000;
/** PRM-15 / LS-053: 3 new skills per local day, adjustable 1 to 6. */
export const DEFAULT_NEW_SKILLS_PER_DAY = 3;
export const NEW_SKILLS_PER_DAY_MIN = 1;
export const NEW_SKILLS_PER_DAY_MAX = 6;
/** Contract 7.2 / 06 section 7.5: minutes of one due review, and the backlog thresholds. */
export const REVIEW_MIN_PER_SKILL = 1.5;
export const BACKLOG_SUSPEND_MIN = 120;
/** FR-023, LS-055: a session running longer than this gets a break suggestion event. */
export const BREAK_AFTER_MIN = 120;
/** A global checkpoint draws on at most this many skills (06 section 9). */
const CHECKPOINT_MAX_SKILLS = 8;
/** A learner who never took a checkpoint and has this many reviewing or mastered skills starts the clock (06 section 9). */
const CHECKPOINT_MIN_READY_SKILLS = 5;

const isReady = (state: string | undefined): boolean => state === "reviewing" || state === "mastered";

/** The stored daily cap if it is an integer in 1..6, else the default 3. */
export function dailyCap(stored: unknown): number {
  return typeof stored === "number" && Number.isInteger(stored) && stored >= NEW_SKILLS_PER_DAY_MIN && stored <= NEW_SKILLS_PER_DAY_MAX
    ? stored
    : DEFAULT_NEW_SKILLS_PER_DAY;
}

/** New skills still allowed today; never below 0. Reviews are never capped. */
export const newSkillAllowance = (snap: Pick<BuildSnapshot, "maxNewSkillsPerDay" | "newSkillsToday">): number =>
  Math.max(0, dailyCap(snap.maxNewSkillsPerDay) - snap.newSkillsToday);

/**
 * Review backlog (06 section 7.5): due skills x 1.5 minutes above the threshold sets the flag; once set it holds
 * until the load falls below half the threshold (120 -> 60). `previous` is the flag of the last built session.
 */
export function backlogFlag(dueSkills: number, previous: boolean, thresholdMin = BACKLOG_SUSPEND_MIN): boolean {
  const minutes = dueSkills * REVIEW_MIN_PER_SKILL;
  return minutes > thresholdMin || (previous && minutes >= thresholdMin / 2);
}

/**
 * Skills that are `reviewing` with the applied attempt as the only open mastery condition (BL-0184). Reads the
 * mastery-eligible attempt history of each reviewing skill through the state store (read-only).
 */
export async function appliedGapSkills(
  userId: string,
  snap: {
    skills: readonly Pick<SnapshotSkill, "key" | "tierTarget">[];
    states: readonly Pick<SnapshotState, "skillKey" | "masteryState" | "epochStart">[];
    timezone: string;
  },
  state: StateDeps,
): Promise<Set<string>> {
  const skillOf = new Map(snap.skills.map((s) => [s.key, s]));
  const reviewing = snap.states.filter((s) => s.masteryState === "reviewing" && skillOf.has(s.skillKey));
  if (reviewing.length === 0) return new Set();
  return state.store.run(async (tx) => {
    const out = new Set<string>();
    for (const st of reviewing) {
      const skill = skillOf.get(st.skillKey) as Pick<SnapshotSkill, "key" | "tierTarget">;
      const [history, stats] = await Promise.all([tx.history(userId, st.skillKey, st.epochStart), tx.templateStats(st.skillKey)]);
      const attempts = history.map((h) => toMasteryAttempt(h, snap.timezone));
      const opts = { hasNonMc: stats.hasNonMc, hasApplied: stats.hasApplied, nVerifiedTemplates: stats.nVerified, params: state.params };
      if (needsApplied(attempts, skill.tierTarget as Tier, "reviewing", opts)) out.add(st.skillKey);
    }
    return out;
  });
}

/** Stage per module (06 section 7.6): eligible = the most reviewing/mastered skills in one confusable set of the module. */
export function interleaveStages(
  skills: readonly SnapshotSkill[],
  states: readonly SnapshotState[],
  sets: BuildSnapshot["interleaveSets"],
  params: SchedulerParams,
): Record<string, number> {
  const stateOf = new Map(states.map((s) => [s.skillKey, s]));
  const eligible = new Map<string, Map<string, number>>(); // module -> confusable set -> ready skills
  const current: Record<string, number> = {};
  for (const sk of skills) {
    const st = stateOf.get(sk.key);
    if (!st) continue;
    current[sk.module] = Math.max(current[sk.module] ?? 0, st.interleaveStage);
    if (sk.confusableSet === null || !isReady(st.masteryState)) continue;
    const bySet = eligible.get(sk.module) ?? new Map<string, number>();
    bySet.set(sk.confusableSet, (bySet.get(sk.confusableSet) ?? 0) + 1);
    eligible.set(sk.module, bySet);
  }
  const out: Record<string, number> = {};
  for (const mod of Object.keys(current)) {
    const n = Math.max(0, ...(eligible.get(mod)?.values() ?? []));
    out[mod] = interleaveStage(n, sets[mod] ?? [], current[mod] ?? 0, params);
  }
  return out;
}

export type CheckpointInput = { status: CheckpointFlag; skills: string[] };

/**
 * Checkpoint flag and its skills (06 section 9). Only skills that have a verified `checkpoint` item to serve are
 * offered, so a reserved slot is never wasted on tasks that cannot get an item (rule 3); without any, the flag is none.
 */
export function checkpointInput(snap: BuildSnapshot, now: Date, params: SchedulerParams): CheckpointInput {
  const stateOf = new Map(snap.states.map((s) => [s.skillKey, s]));
  const ready = snap.skills.filter((s) => isReady(stateOf.get(s.key)?.masteryState));
  const days = (at: Date): number => (now.getTime() - at.getTime()) / DAY_MS;
  const sinceLast =
    snap.lastCheckpointAt !== null
      ? days(snap.lastCheckpointAt)
      : ready.length >= CHECKPOINT_MIN_READY_SKILLS
        ? params.checkpoint_reserve_after_days
        : null;
  const fraction: Record<string, number> = {};
  for (const mod of new Set(snap.skills.map((s) => s.module))) {
    const inModule = snap.skills.filter((s) => s.module === mod);
    fraction[mod] = inModule.filter((s) => isReady(stateOf.get(s.key)?.masteryState)).length / inModule.length;
  }
  const sinceModule = Object.fromEntries(Object.entries(snap.moduleCheckpointAt).map(([m, at]) => [m, days(at)]));
  const cp = checkpointStatus(sinceLast, fraction, sinceModule, params);
  if (cp.status === "none") return { status: "none", skills: [] };
  const served = new Set(snap.candidates.filter((c) => c.taskKind === "checkpoint").map((c) => c.skillKey));
  const global = cp.status === "overdue" || sinceLast !== null && sinceLast >= params.checkpoint_reserve_after_days;
  const skills = ready
    .filter((s) => served.has(s.key) && (global || cp.module_checkpoints.includes(s.module)))
    .map((s) => s.key)
    .sort()
    .slice(0, CHECKPOINT_MAX_SKILLS);
  return skills.length === 0 ? { status: "none", skills: [] } : { status: cp.status, skills };
}
