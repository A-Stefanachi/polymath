import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { nextPath } from "@/lib/auth/next-step";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SessionSummary } from "./session-summary";

export const dynamic = "force-dynamic";

// S09 (doc 09): the summary of a finished session. Numbers come from the completeSession response.
export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const next = await nextPath(await createSupabaseServerClient());
  if (next !== "/") redirect(next);
  const { id } = await params;
  return (
    <AppShell>
      <SessionSummary id={id} />
    </AppShell>
  );
}
