import { redirect } from "next/navigation";
import { hasConsentRecord } from "@/lib/auth/next-step";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

// S02 Onboarding (doc 09). Also serves "Redo onboarding": the stored values prefill the form.
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("display_name, timezone, weekly_minutes_target, onboarded_at, consents").maybeSingle();
  if (!data) redirect("/welcome");
  // Consent comes first (BL-0028).
  if (!hasConsentRecord(data.consents as Record<string, unknown>)) redirect("/consent");
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-4 py-8 outline-none">
      <OnboardingForm
        initial={{
          displayName: data.display_name as string,
          timezone: data.timezone as string,
          weeklyMinutes: data.weekly_minutes_target as number,
          alreadyOnboarded: data.onboarded_at !== null,
        }}
      />
    </main>
  );
}
