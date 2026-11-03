// Where a signed-in learner goes next (doc 09 S01 AC-2): a profile with onboarded_at null goes to
// /onboarding, otherwise to /. Read through the learner's own session (RLS), no privileged access.
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileGate = { onboarded_at: string | null };

export function pathFor(profile: ProfileGate | null): string {
  return profile && profile.onboarded_at === null ? "/onboarding" : "/";
}

export async function nextPath(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.from("profiles").select("onboarded_at").maybeSingle();
  return pathFor(data as ProfileGate | null);
}
