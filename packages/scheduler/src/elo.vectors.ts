// Vector handlers for the Elo model and the rating map (BL-0034). Mirrors run_vector in the reference.
import { coldStartTheta, diagnosticInit, expectedScore, kFactor, mapRating, targetItemDifficulty, updateElo } from "./elo.ts";
import type { EloAttempt } from "./elo.ts";
import { resolveParams } from "./params.ts";
import type { SchedulerParams } from "./params.ts";
import type { VectorHandlers } from "./vector-registry.ts";

const num = (v: unknown): number => v as number;
const att = (v: unknown): EloAttempt => v as EloAttempt;
const withParams = (v: unknown): SchedulerParams => resolveParams(v as Partial<SchedulerParams> | undefined);
const round4 = (x: number): number => Number(x.toFixed(4)) + 0;

export const vectorHandlers: VectorHandlers = {
  expected_score: (i) => round4(expectedScore(num(i.theta), num(i.d), (i.guess as number | undefined) ?? 0, withParams(i.params))),
  k_factor: (i) => round4(kFactor(num(i.n))),
  update_elo: (i) =>
    updateElo(num(i.theta), num(i.n_skill), num(i.d), num(i.n_item), att(i.att), (i.guess as number | undefined) ?? 0, withParams(i.params)),
  diagnostic_init: (i) => diagnosticInit(num(i.d), num(i.score)),
  cold_start_theta: (i) => coldStartTheta(i.prereq_thetas as number[]),
  target_item_difficulty: (i) => targetItemDifficulty(num(i.theta)),
  map_rating: (i) => {
    // The log-only latencyRatio is not part of the oracle's output.
    const { rating, flags } = mapRating(att(i.att), (i.reps as number | undefined) ?? 0, withParams(i.params));
    return { rating, flags };
  },
};
