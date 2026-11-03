// public.profiles access for the profile routes (doc 04 profiles). Statements are scoped by the
// caller's id from the verified claims, and only the writable columns of ProfileUpdate are named,
// so a protected column (cohort_id, id, created_at, consents) can never be reached from a body.
import type { Sql } from "./db.ts";

export type ProfileRow = {
  id: string;
  display_name: string;
  timezone: string;
  weekly_minutes_target: number;
  target_retention: number;
  locale: string;
  reminder_time_local: string | null;
  bedtime_local: string | null;
  reminder_prefs: unknown;
  consents: unknown;
  onboarded_at: Date | null;
  cohort_key: string | null;
  adult_attested: boolean;
  created_at: Date;
};

/** The columns a learner may write, already validated; undefined means "leave unchanged". */
export type ProfileChanges = {
  display_name?: string;
  timezone?: string;
  weekly_minutes_target?: number;
  target_retention?: number;
  locale?: string;
  reminder_time_local?: string | null;
  bedtime_local?: string | null;
  reminder_prefs?: Record<string, unknown>;
  /** Sets adult_attested_at once (never unset). */
  attestAdult?: true;
  /** Sets onboarded_at once. */
  markOnboarded?: true;
};

export type ProfileStore = {
  get(userId: string): Promise<ProfileRow | null>;
  update(userId: string, changes: ProfileChanges): Promise<ProfileRow | null>;
};

const SELECT = (sql: Sql, userId: string) => sql<ProfileRow[]>`
  select p.id, p.display_name, p.timezone, p.weekly_minutes_target, p.target_retention::float8 as target_retention,
         p.locale, to_char(p.reminder_time_local, 'HH24:MI') as reminder_time_local,
         to_char(p.bedtime_local, 'HH24:MI') as bedtime_local, p.reminder_prefs, p.consents,
         p.onboarded_at, c.key as cohort_key, p.adult_attested_at is not null as adult_attested, p.created_at
    from public.profiles p left join public.cohorts c on c.id = p.cohort_id
   where p.id = ${userId}`;

export function createProfileStore(sql: Sql): ProfileStore {
  return {
    get: async (userId) => (await SELECT(sql, userId))[0] ?? null,
    update: (userId, c) =>
      sql.begin(async (tx) => {
        await tx`
          update public.profiles set
            display_name = coalesce(${c.display_name ?? null}, display_name),
            timezone = coalesce(${c.timezone ?? null}, timezone),
            weekly_minutes_target = coalesce(${c.weekly_minutes_target ?? null}::integer, weekly_minutes_target),
            target_retention = coalesce(${c.target_retention ?? null}::real, target_retention),
            locale = coalesce(${c.locale ?? null}, locale),
            reminder_time_local = case when ${"reminder_time_local" in c} then ${c.reminder_time_local ?? null}::time else reminder_time_local end,
            bedtime_local = case when ${"bedtime_local" in c} then ${c.bedtime_local ?? null}::time else bedtime_local end,
            reminder_prefs = coalesce(${c.reminder_prefs ? tx.json(c.reminder_prefs as Parameters<typeof tx.json>[0]) : null}, reminder_prefs),
            adult_attested_at = case when ${c.attestAdult === true} then coalesce(adult_attested_at, now()) else adult_attested_at end,
            onboarded_at = case when ${c.markOnboarded === true} then coalesce(onboarded_at, now()) else onboarded_at end
          where id = ${userId}`;
        return (await SELECT(tx as unknown as Sql, userId))[0] ?? null;
      }),
  };
}
