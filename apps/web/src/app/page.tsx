import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { ScreenTitle } from "@/components/ui/screen-title";
import { nextPath } from "@/lib/auth/next-step";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // A learner who has not finished onboarding is sent there (doc 09 S01 AC-2).
  const next = await nextPath(await createSupabaseServerClient());
  if (next !== "/") redirect(next);
  return (
    <AppShell>
      <Card hero>
        <ScreenTitle>Polymath</ScreenTitle>
        <p>Adaptive practice with spaced retrieval, graded feedback and guided builds.</p>
      </Card>
    </AppShell>
  );
}
