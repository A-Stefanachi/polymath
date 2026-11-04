import { ScreenTitle } from "@/components/ui/screen-title";
import { demoItem as t } from "@/copy/strings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ItemCard } from "./item-card";

export const dynamic = "force-dynamic";

// Throwaway M0 demo (BL-0027, S08): shows the caller's newest open session task. Sessions have no
// creation route until BL-0044, so "newest open task" (pending or in progress, with an item) is the
// simplest rule that needs no query parameter and exposes nothing but the caller's own rows (RLS).
// Removed when the session runner arrives in M1.
export default async function DemoItemPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("session_tasks")
    .select("id")
    .in("status", ["pending", "in_progress"])
    .not("item_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4 py-6 outline-none">
      {data ? (
        <ItemCard taskId={data.id as string} />
      ) : (
        <section className="flex flex-col gap-3 border-[3px] border-dashed border-muted p-4" aria-labelledby="empty-title">
          <ScreenTitle id="empty-title">{t.emptyTitle}</ScreenTitle>
          <p>{t.empty}</p>
        </section>
      )}
    </main>
  );
}
