// Where a signed-in learner goes next. Order (decision recorded in BL-0028): consent first, because
// FR-004 puts the consent screen at "first signing in" and onboarding already stores profile data;
// then onboarding (doc 09 S01 AC-2: onboarded_at null goes to /onboarding); then home.
// Read through the learner's own session (RLS), no privileged access.
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileGate = { onboarded_at: string | null; consents: Record<string, unknown> | null };

export function hasConsentRecord(consents: ProfileGate["consents"]): boolean {
  return Boolean(consents && typeof consents === "object" && "research" in consents);
}

export function pathFor(profile: ProfileGate | null): string {
  if (!profile) return "/";
  if (!hasConsentRecord(profile.consents)) return "/consent";
  return profile.onboarded_at === null ? "/onboarding" : "/";
}

export async function nextPath(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.from("profiles").select("onboarded_at, consents").maybeSingle();
  return pathFor(data as ProfileGate | null);
}
