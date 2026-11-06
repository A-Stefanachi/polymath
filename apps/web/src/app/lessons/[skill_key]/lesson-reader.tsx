"use client";

import Link from "next/link";
import { useCallback } from "react";
import { LessonPrimer } from "@/components/lesson-primer";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/load-state";
import { ScreenTitle } from "@/components/ui/screen-title";
import { lessonReader as t } from "@/copy/strings";
import type { LessonView } from "@/lib/lessons/view";
import { useLoad } from "@/lib/views/use-load";

/** The lesson, or null when the API says there is none to re-read (not started, or no verified lesson: 404). */
async function loadLesson(skillKey: string): Promise<LessonView | null> {
  const response = await fetch(`/api/v1/skills/${encodeURIComponent(skillKey)}/lesson`, { headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`lesson answered ${String(response.status)}`);
  return (await response.json()) as LessonView;
}

/**
 * Re-reading a primer (00a M3). The primer runs in its read-only mode: no Finish or Skip, no callbacks, so nothing
 * is recorded (no lesson_viewed event, K10) and the checks only show their feedback.
 */
export function LessonReader({ skillKey }: { skillKey: string }) {
  const loader = useCallback(() => loadLesson(skillKey), [skillKey]);
  const [state, reload] = useLoad(loader);
  return (
    <div className="flex flex-col gap-4">
      <ScreenTitle>{t.title}</ScreenTitle>
      {state.status === "loading" ? <LoadingBlock /> : null}
      {state.status === "error" ? <ErrorBlock offline={state.offline} onRetry={reload} /> : null}
      {state.status === "ready" && state.data === null ? <EmptyBlock>{t.none}</EmptyBlock> : null}
      {state.status === "ready" && state.data !== null ? (
        <div className="border-[3px] border-ink bg-surface p-4">
          <LessonPrimer lesson={state.data} mode="preview" />
        </div>
      ) : null}
      <Link href="/map" className="min-h-12 self-start font-semibold text-primary underline underline-offset-4">
        {t.back}
      </Link>
    </div>
  );
}
