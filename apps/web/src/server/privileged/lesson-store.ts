// Privileged access to concept primers (public.skill_lessons; 00a K6 to K9, FR-124): the review console's queue,
// approval and retirement, and the read of the newest verified version that getTask serves (BL-0202).
// A lesson body is learner-readable by design (checks are never graded), but the console also sees versions
// that are not verified yet, so this module stays behind the callers' admin check.
import type { Sql } from "./db.ts";

export type LessonQueueRow = { skill_key: string; version: number; content_hash: string; created_at: Date };
export type LessonRow = {
  skill_key: string;
  version: number;
  status: string;
  body: unknown;
  content_hash: string;
  reviewed_by: string | null;
  reviewed_at: Date | null;
};
export type LessonStore = {
  /** Versions waiting for review, oldest first. */
  queue(): Promise<LessonQueueRow[]>;
  /** One version with its body, whatever its status. */
  get(skillKey: string, version: number): Promise<LessonRow | null>;
  /** Sets verified, reviewed_by and reviewed_at for that version only (K9). Verified already: a no-op. */
  approve(input: { skillKey: string; version: number; adminId: string; now: Date }): Promise<{ kind: "approved" | "not_found" | "not_reviewable" }>;
  /** Retires that version only; an older verified version is then the one learners get. */
  retire(input: { skillKey: string; version: number; now: Date }): Promise<{ kind: "retired" | "not_found" }>;
  /** The newest verified version of a skill, or null (what a learner receives). */
  newestVerified(skillKey: string): Promise<{ version: number; body: unknown } | null>;
  /** True when the user has a graded attempt on an item of the skill: the primer is then served as a recap (K8). */
  hasGradedAttempt(userId: string, skillKey: string): Promise<boolean>;
};

/** What getTask needs: the two reads, nothing that writes. */
export type LessonSource = Pick<LessonStore, "newestVerified" | "hasGradedAttempt">;

export function createLessonStore(sql: Sql): LessonStore {
  return {
    queue: () =>
      sql<LessonQueueRow[]>`
        select skill_key, version, content_hash, created_at from public.skill_lessons
         where status = 'needs_human_review' order by created_at, skill_key, version`,

    get: async (skillKey, version) =>
      (
        await sql<LessonRow[]>`
          select skill_key, version, status::text as status, body, content_hash, reviewed_by, reviewed_at
            from public.skill_lessons where skill_key = ${skillKey} and version = ${version}`
      )[0] ?? null,

    approve: async ({ skillKey, version, adminId, now }) => {
      const updated = await sql`
        update public.skill_lessons set status = 'verified', reviewed_by = ${adminId}, reviewed_at = ${now}
         where skill_key = ${skillKey} and version = ${version} and status = 'needs_human_review' returning version`;
      if (updated.length > 0) return { kind: "approved" as const };
      const row = (await sql<{ status: string }[]>`select status::text as status from public.skill_lessons where skill_key = ${skillKey} and version = ${version}`)[0];
      if (!row) return { kind: "not_found" as const };
      return { kind: row.status === "verified" ? ("approved" as const) : ("not_reviewable" as const) };
    },

    retire: async ({ skillKey, version, now }) => {
      const updated = await sql`
        update public.skill_lessons set status = 'retired', retired_at = coalesce(retired_at, ${now})
         where skill_key = ${skillKey} and version = ${version} returning version`;
      return { kind: updated.length > 0 ? ("retired" as const) : ("not_found" as const) };
    },

    newestVerified: async (skillKey) =>
      (
        await sql<{ version: number; body: unknown }[]>`
          select version, body from public.skill_lessons
           where skill_key = ${skillKey} and status = 'verified' order by version desc limit 1`
      )[0] ?? null,

    hasGradedAttempt: async (userId, skillKey) =>
      (
        await sql<{ ok: boolean }[]>`
          select exists (
            select 1 from public.attempts a
              join public.items i on i.id = a.item_id
              join public.item_templates t on t.key = i.template_key and t.version = i.template_version
             where a.user_id = ${userId} and a.grade_status = 'graded' and t.skill_key = ${skillKey}) as ok`
      )[0]?.ok === true,
  };
}
