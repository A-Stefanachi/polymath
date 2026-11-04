import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { nextPath } from "@/lib/auth/next-step";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TodayScreen } from "./today-screen";

export const dynamic = "force-dynamic";

// Today (doc 09 S06). The server part only gates: a learner who has not finished consent or onboarding is
// sent there (S01 AC-2); the screen itself reads through the /api/v1 routes.
export default async function HomePage() {
  const next = await nextPath(await createSupabaseServerClient());
  if (next !== "/") redirect(next);
  return (
    <AppShell>
      <TodayScreen />
    </AppShell>
  );
}
