import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

// S02 Onboarding (doc 09). Also serves "Redo onboarding": the stored values prefill the form.
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("display_name, timezone, weekly_minutes_target, onboarded_at").maybeSingle();
  if (!data) redirect("/welcome");
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
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
