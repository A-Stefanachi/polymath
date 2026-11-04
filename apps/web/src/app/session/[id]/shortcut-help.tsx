"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { runner as t } from "@/copy/strings";

/** Keyboard shortcut list (doc 09 section 7: `?` = shortcut help). A native modal dialog: Escape closes it and focus returns to the opener. */
export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="shortcuts-title" className="m-auto w-[min(92vw,28rem)] border-[3px] border-ink bg-surface p-4 text-ink backdrop:bg-black/50">
      <h2 id="shortcuts-title" className="font-display text-2xl font-bold">
        {t.shortcutsTitle}
      </h2>
      <dl className="my-4 flex flex-col gap-2.5">
        {t.shortcuts.map(([key, what]) => (
          <div key={key} className="flex items-baseline gap-3">
            <dt className="min-w-16 font-mono font-semibold">{key}</dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
      <Button size="md" onClick={onClose}>
        {t.shortcutsClose}
      </Button>
    </dialog>
  );
}
