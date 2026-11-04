import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { nextPath } from "@/lib/auth/next-step";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SessionPlaceholder } from "./session-placeholder";

export const dynamic = "force-dynamic";

// /session/[id] is the micro runner of BL-0060 (doc 09 S08). Until it exists this page says so plainly and lets
// the learner end the session, so Today is never blocked by an open one.
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const next = await nextPath(await createSupabaseServerClient());
  if (next !== "/") redirect(next);
  const { id } = await params;
  return (
    <AppShell>
      <SessionPlaceholder id={id} />
    </AppShell>
  );
}
