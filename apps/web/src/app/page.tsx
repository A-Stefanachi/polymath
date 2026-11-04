import { redirect } from "next/navigation";
import { nextPath } from "@/lib/auth/next-step";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // A learner who has not finished onboarding is sent there (doc 09 S01 AC-2).
  const next = await nextPath(await createSupabaseServerClient());
  if (next !== "/") redirect(next);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-semibold">Polymath</h1>
      <p>Adaptive practice with spaced retrieval, graded feedback and guided builds.</p>
    </main>
  );
}
