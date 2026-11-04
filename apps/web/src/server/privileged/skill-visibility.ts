// Which skills a caller may see through privileged reads. The privileged connection bypasses RLS, so the
// `skills_select` policy (schema.sql: status in stub/verified/retired, or public.is_admin()) is applied here
// by hand, in one place, for the graph endpoints (BL-0048) and the session builder snapshot (BL-0044).
// A learner never sees or is offered a `draft` or `needs_human_review` skill (CLAUDE.md rule 2.3).
import type { Sql } from "./db.ts";

/** Statuses `skills_select` shows to every authenticated user. */
export const LEARNER_VISIBLE_SKILL_STATUSES: readonly string[] = ["stub", "verified", "retired"];

/** True when the caller has a row in `admin_users` (what `public.is_admin()` checks for auth.uid()). */
export async function isAdminUser(sql: Sql, userId: string): Promise<boolean> {
  const rows = await sql<{ admin: boolean }[]>`select exists (select 1 from public.admin_users where user_id = ${userId}) as admin`;
  return rows[0]?.admin === true;
}

/** SQL predicate for `<alias>.status`: the same rule as `skills_select`. `alias` is a fixed table alias, never input. */
export function skillVisibleSql(sql: Sql, alias: string, admin: boolean) {
  return sql`(${admin}::boolean or ${sql(alias)}.status::text = any(${sql.array([...LEARNER_VISIBLE_SKILL_STATUSES])}))`;
}
