// Domain code of the content review console (BL-0057; FR-124, US-031, ADR-018). The page and its server
// actions only call these; both re-check the admin row server-side. Input arrives from HTML forms, so
// every field is validated here and a bad one is a result code, not an exception.
import type { ReportStore } from "@/server/privileged/report-store";
import type { ReviewStore } from "@/server/privileged/review-store";

export const TEMPLATE_KEY = /^tpl\.[a-z]+\.[a-z0-9-]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const NOTE_MAX = 2000;
export const REASON_MIN = 5;

export type ReviewStores = { review: ReviewStore; reports: ReportStore };
// View types for the page, which may not import server/privileged itself.
export type TemplateView = NonNullable<Awaited<ReturnType<ReviewStore["template"]>>>;
export type ReviewItem = Awaited<ReturnType<ReviewStore["items"]>>[number];

export type ReviewOutcome =
  | "approved"
  | "retired"
  | "invalid"
  | "needs_hand_solve"
  | "not_found"
  | "not_reviewable"
  | "fuzz_not_passed"
  | "forbidden";

const text = (form: FormData, name: string): string => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

/** Approving a template records the G3 hand-solve (doc 07 checklist box 1): without it nothing is written. */
export async function approveTemplate(stores: ReviewStores, userId: string, form: FormData, now?: Date): Promise<ReviewOutcome> {
  if (!(await stores.reports.isAdmin(userId))) return "forbidden";
  const key = text(form, "template_key");
  const version = Number(text(form, "version"));
  const notes = text(form, "notes").trim();
  if (!TEMPLATE_KEY.test(key) || !Number.isInteger(version) || version < 1 || notes.length > NOTE_MAX) return "invalid";
  if (text(form, "hand_solve") !== "on") return "needs_hand_solve";
  const result = await stores.review.approveTemplate({ key, version, adminId: userId, notes: notes === "" ? null : notes, ...(now ? { now } : {}) });
  if (result.kind === "approved") return "approved";
  if (result.kind === "no_hash") return "not_reviewable";
  return result.kind;
}

/** Retires one item, and with `retire_template` its template and unserved pool items (operation retireItem). */
export async function retireFromConsole(stores: ReviewStores, userId: string, form: FormData): Promise<ReviewOutcome> {
  if (!(await stores.reports.isAdmin(userId))) return "forbidden";
  const itemId = text(form, "item_id");
  const reason = text(form, "reason").trim();
  if (!UUID.test(itemId) || reason.length < REASON_MIN || reason.length > NOTE_MAX) return "invalid";
  const result = await stores.reports.retire({ itemId, adminId: userId, reason, retireTemplate: text(form, "retire_template") === "on" });
  return result ? "retired" : "not_found";
}
