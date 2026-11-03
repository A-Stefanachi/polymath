// getProfile / updateProfile domain code (doc 09 S02, FR-002). The route handlers only call these.
import type { components } from "@polymath/shared-types";
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { privilegedDb } from "@/server/privileged/db";
import { createProfileStore, type ProfileChanges, type ProfileRow, type ProfileStore } from "@/server/privileged/profile-store";

type ProfileUpdate = components["schemas"]["ProfileUpdate"];
type Profile = components["schemas"]["Profile"];

/** FR-002: "values 60-1200 are accepted (default 480) and others are rejected". The OpenAPI file and
 *  the database allow 0-5000; the narrower product range is enforced here. */
export const WEEKLY_MINUTES_MIN = 60;
export const WEEKLY_MINUTES_MAX = 1200;

function fail(field: string, message: string): never {
  throw new ApiError("validation_failed", { errors: [{ field, message }] });
}

/** An IANA zone name the runtime knows; offsets and abbreviations are refused. */
export function isTimeZone(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)*$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Turns a validated-by-schema body into column changes, applying the product rules the schema cannot. */
export function toChanges(body: ProfileUpdate): ProfileChanges {
  if (body.consents !== undefined) fail("consents", "consents are recorded on the consent screen, not through this route");
  if (body.weekly_minutes_target !== undefined && (body.weekly_minutes_target < WEEKLY_MINUTES_MIN || body.weekly_minutes_target > WEEKLY_MINUTES_MAX)) {
    fail("weekly_minutes_target", `must be between ${String(WEEKLY_MINUTES_MIN)} and ${String(WEEKLY_MINUTES_MAX)} minutes`);
  }
  if (body.timezone !== undefined && !isTimeZone(body.timezone)) fail("timezone", "must be an IANA time zone such as Europe/Rome");
  if (body.locale !== undefined && !/^[a-z]{2}(-[A-Z]{2})?$/.test(body.locale)) fail("locale", "must look like en or en-GB");
  const displayName = body.display_name?.trim();
  const changes: ProfileChanges = {};
  if (displayName !== undefined) changes.display_name = displayName;
  if (body.timezone !== undefined) changes.timezone = body.timezone;
  if (body.weekly_minutes_target !== undefined) changes.weekly_minutes_target = body.weekly_minutes_target;
  if (body.target_retention !== undefined) changes.target_retention = body.target_retention;
  if (body.locale !== undefined) changes.locale = body.locale;
  if (body.reminder_time_local !== undefined) changes.reminder_time_local = body.reminder_time_local;
  if (body.bedtime_local !== undefined) changes.bedtime_local = body.bedtime_local;
  if (body.reminder_prefs !== undefined) changes.reminder_prefs = body.reminder_prefs;
  if (body.adult_attested === true) changes.attestAdult = true;
  if (body.onboarded === true) changes.markOnboarded = true;
  return changes;
}

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    display_name: row.display_name,
    timezone: row.timezone,
    weekly_minutes_target: row.weekly_minutes_target,
    target_retention: row.target_retention,
    locale: row.locale,
    reminder_time_local: row.reminder_time_local,
    bedtime_local: row.bedtime_local,
    reminder_prefs: row.reminder_prefs as NonNullable<Profile["reminder_prefs"]>,
    consents: row.consents as NonNullable<Profile["consents"]>,
    onboarded_at: row.onboarded_at ? row.onboarded_at.toISOString() : null,
    cohort_key: row.cohort_key,
    adult_attested: row.adult_attested,
    created_at: row.created_at.toISOString(),
  };
}

function userId(ctx: ApiContext): string {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  return ctx.caller.userId;
}

const defaultStore = (): ProfileStore => createProfileStore(privilegedDb());

export async function readProfile(ctx: ApiContext, store: ProfileStore = defaultStore()): Promise<Response> {
  const row = await store.get(userId(ctx));
  if (!row) throw new ApiError("not_found");
  return json(toProfile(row));
}

export async function writeProfile(ctx: ApiContext, store: ProfileStore = defaultStore()): Promise<Response> {
  const changes = toChanges(ctx.body as ProfileUpdate);
  const row = await store.update(userId(ctx), changes);
  if (!row) throw new ApiError("not_found");
  return json(toProfile(row));
}
