"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenTitle } from "@/components/ui/screen-title";
import { summary as t } from "@/copy/strings";
import { dueWhen } from "@/lib/runner/runner";

type Summary = {
  actual_min: number;
  tasks_done: number;
  tasks_skipped: number;
  attempts: number;
  correct: number;
  skills_touched?: string[];
  next_due_at?: string | null;
  checkpoint_due?: boolean;
};

/** S09: counts from the API only (doc 09 section 11). No streak, points or badge. */
export function SessionSummary({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const session = await fetch(`/api/v1/sessions/${id}`);
      if (!session.ok) throw new Error("load");
      const { status } = (await session.json()) as { status: string };
      // A session still open is not summarised: completing it here would end it by a typed URL.
      if (status !== "completed" && status !== "abandoned") return router.replace(`/session/${id}`);
      // Completing a finished session returns the stored summary (completeSession).
      const res = await fetch(`/api/v1/sessions/${id}/complete`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: "{}" });
      if (!res.ok) throw new Error("summary");
      if (live) setData((await res.json()) as Summary);
    })().catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [id, router]);

  if (failed) return <p role="alert">{t.loadFailed}</p>;
  if (!data) return <p aria-live="polite">{t.loading}</p>;

  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <>
      <ScreenTitle>{t.title}</ScreenTitle>
      <Card hero>
        <p className="font-label text-[13px] tracking-[0.04em] text-muted uppercase">{t.saved(data.actual_min)}</p>
        <p className="font-display text-2xl font-bold" data-testid="headline">
          {data.attempts > 0 ? t.headline(data.correct, data.attempts) : t.none}
        </p>
        {data.attempts > 0 && (
          <>
            <div role="img" aria-label={t.tallyLabel(data.correct, data.attempts)} className="flex flex-wrap gap-1.5">
              {Array.from({ length: data.attempts }, (_, i) => (
                <span key={i} className={`size-5 border-2 border-ink ${i < data.correct ? "bg-primary" : "bg-transparent"}`} />
              ))}
            </div>
            <p className="text-[15px] text-muted">{t.tallyNote}</p>
          </>
        )}
        <p data-testid="task-counts">{t.doneSkipped(data.tasks_done, data.tasks_skipped)}</p>
        {data.skills_touched && data.skills_touched.length > 0 && <p>{t.skills(data.skills_touched.length)}</p>}
      </Card>
      <Card>
        <h2 className="font-label text-[13px] tracking-[0.04em] text-muted uppercase">{t.comesBackTitle}</h2>
        <p>{data.next_due_at ? t.nextDue(dueWhen(data.next_due_at, new Date(), zone)) : t.noneDue}</p>
        {data.checkpoint_due && <p>{t.checkpointDue}</p>}
      </Card>
      <Link href="/" className={buttonVariants({ className: "self-start no-underline" })}>
        {t.back}
      </Link>
    </>
  );
}
