// Domain code of the console's lesson tab (BL-0201; 00a K9, FR-124, ADR-018). The page and its server actions
// only call these; both re-check the admin row server-side. Input arrives from HTML forms, so a bad field is
// a result code, not an exception. The console records approval in the database only; it never writes files.
import type { LessonStore } from "@/server/privileged/lesson-store";
import type { ReportStore } from "@/server/privileged/report-store";
import type { ReviewOutcome } from "./review.ts";

export const SKILL_KEY = /^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$/;

export type LessonStores = { lessons: LessonStore; reports: Pick<ReportStore, "isAdmin"> };
export type LessonQueueRow = Awaited<ReturnType<LessonStore["queue"]>>[number];
export type LessonDetail = NonNullable<Awaited<ReturnType<LessonStore["get"]>>>;

const text = (form: FormData, name: string): string => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

/** `skill_key` and `version` of the form, or null when either is not a valid reference to one version. */
export function lessonRef(form: FormData): { skillKey: string; version: number } | null {
  const skillKey = text(form, "skill_key");
  const raw = text(form, "version");
  const version = /^[0-9]+$/.test(raw) ? Number(raw) : 0;
  return SKILL_KEY.test(skillKey) && Number.isSafeInteger(version) && version >= 1 ? { skillKey, version } : null;
}

/** Approves one needs_human_review version: verified, reviewed_by = the admin, reviewed_at = now (K9). */
export async function approveLesson(stores: LessonStores, userId: string, form: FormData, now: Date = new Date()): Promise<ReviewOutcome> {
  if (!(await stores.reports.isAdmin(userId))) return "forbidden";
  const ref = lessonRef(form);
  if (!ref) return "invalid";
  const result = await stores.lessons.approve({ ...ref, adminId: userId, now });
  return result.kind === "approved" ? "lesson_approved" : result.kind;
}

/** Retires one version; an older verified version then stays the one learners get. */
export async function retireLesson(stores: LessonStores, userId: string, form: FormData, now: Date = new Date()): Promise<ReviewOutcome> {
  if (!(await stores.reports.isAdmin(userId))) return "forbidden";
  const ref = lessonRef(form);
  if (!ref) return "invalid";
  const result = await stores.lessons.retire({ ...ref, now });
  return result.kind === "retired" ? "lesson_retired" : result.kind;
}
