// The only file that imports ts-fsrs (06 section 3.7, 00a B7/H3). The rest of the scheduler sees the
// FsrsPort below, so the library can be swapped or pinned behind it. Pure: `now` is always an argument.
import { DefaultScheduler } from "ts-fsrs";
import { DEFAULT_PARAMS } from "./params.ts";

export type FsrsRating = 1 | 2 | 3 | 4;
export type FsrsState = "new" | "learning" | "review" | "relearning";

/** Maps 1:1 to skill_state columns (see toSkillStateColumns); `extra` goes to skill_state.fsrs_extra. */
export interface FsrsCard {
  readonly stability: number;
  readonly difficulty: number;
  readonly due: Date;
  readonly last_review: Date | null;
  readonly reps: number;
  readonly lapses: number;
  readonly fsrs_state: FsrsState;
  readonly scheduled_days: number;
  readonly learning_steps: number;
  readonly extra?: Readonly<Record<string, unknown>>;
}

export interface FsrsReviewResult {
  readonly card: FsrsCard;
  readonly log: { readonly rating: FsrsRating; readonly elapsed_days: number; readonly scheduled_days: number };
}

/**
 * `review` is asynchronous because ts-fsrs 6 runs its scheduler pipeline (middlewares, schema parsing)
 * as promises. An async port keeps the adapter honest and still pure: no clock, no I/O. Creating the
 * adapter is async for the same reason.
 */
export interface FsrsPort {
  newCard(now: Date): FsrsCard;
  review(card: FsrsCard, rating: FsrsRating, now: Date): Promise<FsrsReviewResult>;
  /** Probability of recall in [0, 1] at `now`; 0 for a card never reviewed. */
  retrievability(card: FsrsCard, now: Date): number;
  /** Name of the model the library runs; must equal "fsrs-6" (stored in skill_state.fsrs_model). */
  readonly modelName: string;
  readonly weightCount: number;
}

export interface FsrsConfig {
  readonly desiredRetention: number;
  readonly maximumIntervalDays: number;
  readonly enableFuzz: boolean;
  readonly enableShortTerm: false;
  readonly version: "FSRS-6";
}

/** 06 section 3.5: interval cap of 180 days. */
export const FSRS_MAX_INTERVAL_DAYS = 180;
/** Value of skill_state.fsrs_model for this adapter (00a B7). */
export const FSRS_MODEL = "fsrs-6";

/** Desired retention for a learner's first weeks (G5); the 0.90 switch is BL-0187. Fuzz stays off. */
export const DEFAULT_FSRS_CONFIG: FsrsConfig = {
  desiredRetention: DEFAULT_PARAMS.desired_retention_initial,
  maximumIntervalDays: FSRS_MAX_INTERVAL_DAYS,
  enableFuzz: false,
  enableShortTerm: false,
  version: "FSRS-6",
};

const STATE_NAMES: readonly FsrsState[] = ["new", "learning", "review", "relearning"];
// ts-fsrs requires a card id; skill_state is keyed by (user, skill), so one constant is enough.
const CARD_ID = "skill_state";

function stateIndex(s: FsrsState): number {
  return STATE_NAMES.indexOf(s);
}

function checkRating(rating: number): asserts rating is FsrsRating {
  if (!Number.isInteger(rating) || rating < 1 || rating > 4) {
    throw new RangeError(`FSRS rating must be an integer 1 to 4, got ${String(rating)}`);
  }
}

function checkDate(d: Date, what: string): void {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) throw new TypeError(`${what} must be a valid Date`);
}

/** Builds the adapter. Throws RangeError for a config outside the pinned model (FSRS-6, no short-term). */
export async function createFsrsAdapter(config: Partial<FsrsConfig> = {}): Promise<FsrsPort> {
  const cfg = { ...DEFAULT_FSRS_CONFIG, ...config };
  if (cfg.version !== "FSRS-6" || cfg.enableShortTerm !== false) {
    throw new RangeError("the adapter is pinned to FSRS-6 without short-term mode (00a B7, H3)");
  }
  if (!(cfg.desiredRetention > 0 && cfg.desiredRetention < 1)) {
    throw new RangeError("desiredRetention must be in (0, 1)");
  }
  if (!Number.isInteger(cfg.maximumIntervalDays) || cfg.maximumIntervalDays < 1) {
    throw new RangeError("maximumIntervalDays must be a positive integer");
  }
  const scheduler = await DefaultScheduler({
    version: "FSRS-6",
    desiredRetention: cfg.desiredRetention,
    maximumInterval: cfg.maximumIntervalDays,
    enableFuzz: cfg.enableFuzz,
    enableShortTerm: false,
  });
  const modelName = scheduler.definition.model.name;
  const weightCount = scheduler.model.config.weights.length;
  if (modelName !== FSRS_MODEL) throw new Error(`ts-fsrs selected model ${modelName}, expected ${FSRS_MODEL}`);

  const toLib = (c: FsrsCard) => {
    const idx = stateIndex(c.fsrs_state);
    if (idx < 0) throw new RangeError(`unknown fsrs_state ${String(c.fsrs_state)}`);
    const state = idx as 0 | 1 | 2 | 3;
    return {
      cardId: CARD_ID,
      stability: c.stability,
      difficulty: c.difficulty,
      state,
      // The library has no "relearning" status; with short-term mode off a card never enters it.
      scheduleStatus: c.fsrs_state === "relearning" ? ("learning" as const) : c.fsrs_state,
      dueAt: c.due,
      lastReviewAt: c.last_review,
      reps: c.reps,
      lapses: c.lapses,
      scheduledDays: c.scheduled_days,
      learningStep: c.learning_steps,
    };
  };
  // Whole days between two instants, never negative (a clock skew must not throw inside the library).
  const elapsedDays = (from: Date | null, now: Date): number =>
    from === null ? 0 : Math.max(0, scheduler.chrono.difference(from, now));

  return {
    modelName,
    weightCount,
    newCard(now) {
      checkDate(now, "now");
      return {
        stability: 0,
        difficulty: 0,
        due: now,
        last_review: null,
        reps: 0,
        lapses: 0,
        fsrs_state: "new",
        scheduled_days: 0,
        learning_steps: 0,
        extra: {},
      };
    },
    async review(card, rating, now) {
      checkRating(rating);
      checkDate(now, "now");
      const elapsed = card.fsrs_state === "new" ? 0 : elapsedDays(card.last_review, now);
      // A review earlier than last_review is treated as at last_review (elapsed 0), never an error.
      const at = card.last_review !== null && now < card.last_review ? card.last_review : now;
      const out = await scheduler.review({ card: toLib(card), grade: rating, now: at });
      const next = out.card;
      return {
        card: {
          stability: next.stability,
          difficulty: next.difficulty,
          due: next.dueAt,
          last_review: next.lastReviewAt,
          reps: next.reps,
          lapses: next.lapses,
          fsrs_state: STATE_NAMES[next.state] ?? "review",
          scheduled_days: next.scheduledDays,
          learning_steps: next.learningStep,
          extra: card.extra ?? {},
        },
        log: { rating, elapsed_days: elapsed, scheduled_days: next.scheduledDays },
      };
    },
    retrievability(card, now) {
      checkDate(now, "now");
      if (card.fsrs_state === "new" || card.last_review === null || card.stability <= 0) return 0;
      const r = scheduler.model.forgettingCurve(
        { stability: card.stability, difficulty: card.difficulty },
        elapsedDays(card.last_review, now),
      );
      return Number.isFinite(r) ? Math.min(1, Math.max(0, r)) : 0;
    },
  };
}

/** skill_state columns written for a card (06 section 2); the caller adds user_id and skill_key. */
export interface SkillStateFsrsColumns {
  readonly stability: number;
  readonly difficulty: number;
  readonly due: string;
  readonly last_review: string | null;
  readonly reps: number;
  readonly lapses: number;
  readonly fsrs_state: 0 | 1 | 2 | 3;
  readonly elapsed_days: number;
  readonly scheduled_days: number;
  readonly learning_steps: number;
  readonly fsrs_model: typeof FSRS_MODEL;
  readonly fsrs_extra: Readonly<Record<string, unknown>>;
}

export function toSkillStateColumns(card: FsrsCard, log?: FsrsReviewResult["log"]): SkillStateFsrsColumns {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due.toISOString(),
    last_review: card.last_review === null ? null : card.last_review.toISOString(),
    reps: card.reps,
    lapses: card.lapses,
    fsrs_state: stateIndex(card.fsrs_state) as 0 | 1 | 2 | 3,
    elapsed_days: log?.elapsed_days ?? 0,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    fsrs_model: FSRS_MODEL,
    fsrs_extra: card.extra ?? {},
  };
}

export function fromSkillStateColumns(row: Omit<SkillStateFsrsColumns, "elapsed_days" | "fsrs_model"> & Partial<SkillStateFsrsColumns>): FsrsCard {
  const state = STATE_NAMES[row.fsrs_state];
  if (state === undefined) throw new RangeError(`fsrs_state must be 0 to 3, got ${String(row.fsrs_state)}`);
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    due: new Date(row.due),
    last_review: row.last_review === null ? null : new Date(row.last_review),
    reps: row.reps,
    lapses: row.lapses,
    fsrs_state: state,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    extra: row.fsrs_extra,
  };
}
