// Rebuild of one learner's skill_state for one skill without the disputed reviews (BL-0197; 00a J2,
// doc 07 section 8.2). review_log is append-only, so a disputed attempt cannot be un-reviewed in place:
// the FSRS card is replayed from the skill's review_log rows in order through the same adapter and the
// same card/column helpers as the live review (apply-attempt.ts), skipping rows whose attempts are all
// disputed. Mastery, tier and loop step are re-derived by the live `settle`, which already ignores disputed
// attempts. No review_log row is written, changed or deleted. Time is the `now` argument (rule 2.9).
import { toSkillStateColumns } from "@polymath/scheduler";
import type { ReplayReview } from "@/server/privileged/state-store";
import { applyCardColumns, cardOf, defaultStateDeps, settle, type Ctx, type StateDeps } from "./apply-attempt.ts";

/** skill_state defaults of a skill nobody has reviewed (schema.sql skill_state card columns). */
const UNREVIEWED = {
  stability: 0,
  difficulty: 0,
  due: null,
  lastReview: null,
  reps: 0,
  lapses: 0,
  fsrsState: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 0,
  fsrsExtra: {},
} as const;

export type RebuildResult = { reviewsReplayed: number; reviewsSkipped: number };

/** Replays `reviews` (already ordered) into the locked `skill` row; returns the ratings that were applied. */
async function replayCard(deps: StateDeps, skill: Parameters<typeof cardOf>[1], reviews: readonly ReplayReview[]): Promise<number[]> {
  Object.assign(skill, UNREVIEWED, { fsrsExtra: {} });
  const applied: number[] = [];
  for (const r of reviews) {
    if (r.allDisputed) continue;
    const out = await deps.fsrs.review(cardOf(deps.fsrs, skill, r.reviewedAt), r.rating, r.reviewedAt);
    applyCardColumns(skill, toSkillStateColumns(out.card, out.log));
    applied.push(r.rating);
  }
  return applied;
}

export async function rebuildSkillState(userId: string, skillKey: string, now: Date, deps: StateDeps): Promise<RebuildResult> {
  return deps.store.run(async (tx) => {
    // Nothing reviewed means FSRS never saw the disputed attempt; do not create a skill_state row for it.
    const reviews = await tx.reviewsForReplay(userId, skillKey);
    if (reviews.length === 0) return { reviewsReplayed: 0, reviewsSkipped: 0 };
    const timezone = await tx.profileTimezone(userId);
    const ctx: Ctx = { tx, deps, userId, skillKey, now, timezone };
    const skill = await tx.lockSkill(userId, skillKey, deps.params.elo_init_default);
    const ratings = await replayCard(deps, skill, reviews);
    const last = ratings[ratings.length - 1] ?? null;
    const prior = ratings[ratings.length - 2] ?? null;
    await settle(ctx, skill, now, last, prior, null);
    // A decayed skill is due now (06 section 4.3); the replayed card's own due date must not hide it.
    if (skill.masteryState === "decayed" && (skill.due === null || skill.due.getTime() > now.getTime())) skill.due = now;
    await tx.writeSkill(userId, skillKey, skill);
    return { reviewsReplayed: ratings.length, reviewsSkipped: reviews.length - ratings.length };
  });
}

/** Rebuilds with the production store and FSRS adapter. */
export async function rebuildSkillStateDefault(userId: string, skillKey: string, now: Date): Promise<RebuildResult> {
  return rebuildSkillState(userId, skillKey, now, await defaultStateDeps());
}
