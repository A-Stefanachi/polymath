// needs_applied (doc 06 sections 4.3 and 7.4 b2; 00a G2). Derived at read time, never stored. Ports
// reference/scheduler_reference.py `needs_applied`; the packer reads the result as `PackSkillState.needs_applied`.
import { masteryRule, type MasteryAttempt, type MasteryRuleOptions, type MasteryStateName } from "./mastery.ts";
import type { Tier } from "./params.ts";

/**
 * True iff the skill is `reviewing` and the applied attempt is the ONLY unmet mastery condition
 * (`masteryRule(...).checks.applied` false, every other check true).
 */
export function needsApplied(
  attempts: readonly MasteryAttempt[],
  tier: Tier,
  masteryStateNow: MasteryStateName,
  opts: MasteryRuleOptions = {},
): boolean {
  if (masteryStateNow !== "reviewing") return false;
  const { checks } = masteryRule(attempts, tier, opts);
  const unmet = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  return unmet.length === 1 && unmet[0] === "applied";
}
