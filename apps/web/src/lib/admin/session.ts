// The signed-in user for admin pages and actions. The proxy already answers 403 for non-admins; this
// re-checks against the admin_users table with the privileged connection (ADR-018).
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { privilegedDb } from "@/server/privileged/db";
import { createReportStore, type ReportStore } from "@/server/privileged/report-store";
import { createReviewStore, type ReviewStore } from "@/server/privileged/review-store";
import type { ReviewStores } from "./review.ts";

export function reviewStores(): ReviewStores & { review: ReviewStore; reports: ReportStore } {
  const sql = privilegedDb();
  return { review: createReviewStore(sql), reports: createReportStore(sql) };
}

/** The caller's user id from the session cookie, or null when signed out. */
export async function sessionUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}
