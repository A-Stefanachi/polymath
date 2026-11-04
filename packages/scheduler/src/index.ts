// Package identity; the package's real API is added by its own backlog tasks (doc 03 section 13).
export const PACKAGE_NAME = "@polymath/scheduler" as const;

export * from "./elo.ts";
export {
  aggregateAttempts,
  isQualifying,
  masteryRule,
  masteryState,
  tierAttained,
  type MasteryAttempt,
  type MasteryRuleChecks,
  type MasteryRuleOptions,
  type MasteryRuleResult,
  type MasteryStateInput,
  type MasteryStateName,
  type TierAttainedInput,
} from "./mastery.ts";
