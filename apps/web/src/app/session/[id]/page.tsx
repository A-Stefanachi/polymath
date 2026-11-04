import { redirect } from "next/navigation";
import { nextPath } from "@/lib/auth/next-step";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SessionRunner } from "./session-runner";

export const dynamic = "force-dynamic";

// /session/[id] is the micro runner (doc 09 S08). A focused screen: no navigation shell, its own top bar. The
// server part only gates onboarding; tasks, answers and grading go through the /api/v1 routes.
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const next = await nextPath(await createSupabaseServerClient());
  if (next !== "/") redirect(next);
  const { id } = await params;
  return (
    <main id="main" tabIndex={-1} className="min-h-dvh outline-none">
      <SessionRunner id={id} />
    </main>
  );
}
