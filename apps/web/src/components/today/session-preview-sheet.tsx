"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { preview as p, today as t } from "@/copy/strings";
import { fallbackTitle, groupPreview, kindLabel, neighbourMinutes, reasonLabel, type SessionPreview } from "@/lib/today/today";

const HEADINGS = { reviews: "", continue: p.continuing, new: p.fresh, other: p.other } as const;

/**
 * Session preview (doc 09 S07): the list the builder planned, grouped, with plain-language reasons. It is a
 * native modal dialog, so focus is trapped, Escape closes it and focus returns to the opener. Closing writes
 * nothing: the list came from a dry run.
 */
export function SessionPreviewSheet({
  open,
  data,
  titles,
  minutes,
  starting,
  error,
  onClose,
  onStart,
  onChangeMinutes,
}: {
  open: boolean;
  data: SessionPreview | null;
  titles: Record<string, string>;
  minutes: number;
  starting: boolean;
  error: string | null;
  onClose: () => void;
  onStart: () => void;
  onChangeMinutes: (minutes: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const shorter = neighbourMinutes(minutes, -1);
  const longer = neighbourMinutes(minutes, 1);
  const titleOf = (key?: string | null) => (key ? (titles[key] ?? fallbackTitle(key)) : "");

  return (
    <dialog
      ref={ref}
      aria-labelledby="preview-title"
      onClose={onClose}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto border-[3px] border-b-0 border-ink bg-surface p-4 text-ink backdrop:bg-ink/60 sm:m-auto sm:max-w-xl sm:border-b-[3px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="preview-title" className="font-display text-2xl font-bold">
            {p.title}
          </h2>
          <Button variant="secondary" size="md" onClick={onClose}>
            {p.close}
          </Button>
        </div>
        {data ? (
          <>
            <p className="text-lg font-semibold">{p.total(data.planned_min, minutes)}</p>
            {groupPreview(data.tasks).map((g) => (
              <section key={g.key} aria-label={g.key === "reviews" ? p.reviews(g.tasks.length) : HEADINGS[g.key]} className="flex flex-col gap-2">
                <h3 className="font-label text-sm tracking-[0.04em] uppercase">{g.key === "reviews" ? p.reviews(g.tasks.length) : HEADINGS[g.key]}</h3>
                <ul className="flex flex-col gap-2">
                  {g.tasks.map((task) => (
                    <li key={task.position} className="flex flex-col gap-1 border-2 border-ink px-3 py-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{task.skill_key ? titleOf(task.skill_key) : kindLabel(task.task_kind)}</span>
                        <span className="font-mono text-[15px] text-muted">{p.taskMinutes(task.est_seconds)}</span>
                      </div>
                      {task.skill_key ? <span className="text-[15px] text-muted">{kindLabel(task.task_kind)}</span> : null}
                      <span className="inline-flex w-fit border-2 border-ink bg-bg px-2 text-[15px]">{reasonLabel(task.reason)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        ) : null}
        <div className="flex gap-2">
          <Button variant="secondary" size="md" className="flex-1" disabled={shorter === null} onClick={() => shorter !== null && onChangeMinutes(shorter)}>
            {p.shorter}
          </Button>
          <Button variant="secondary" size="md" className="flex-1" disabled={longer === null} onClick={() => longer !== null && onChangeMinutes(longer)}>
            {p.longer}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="font-semibold text-nq">
            {error}
          </p>
        ) : null}
        <Button onClick={onStart} disabled={starting || !data}>
          {starting ? t.starting : t.start(minutes)}
        </Button>
      </div>
    </dialog>
  );
}
