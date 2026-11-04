import type { ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "@/components/pixel-icon";
import { cn } from "@/lib/utils";

export type FeedbackTone = "correct" | "not-quite" | "info";

const TONES: Record<FeedbackTone, { box: string; icon: string; iconName: PixelIconName }> = {
  correct: { box: "bg-ok-fill", icon: "text-ok", iconName: "correct" },
  "not-quite": { box: "bg-nq-fill", icon: "text-nq", iconName: "not-quite" },
  info: { box: "bg-surface", icon: "text-primary", iconName: "not-quite" },
};

/**
 * Feedback reads three ways: an icon shape, a word and a colour (doc 09 section 7). `live` makes the panel
 * its own polite live region; pass `live={false}` when an enclosing region already announces changes.
 * Wording follows doc 09 section 11: "Not quite", never "Wrong".
 */
export function FeedbackPanel({
  tone,
  title,
  children,
  actions,
  live = true,
  className,
}: {
  tone: FeedbackTone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  live?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <section className={cn("px-rise flex flex-col gap-2.5 border-[3px] border-ink p-4 text-ink", t.box, className)} {...(live ? { role: "status" } : {})} data-tone={tone}>
      <div className="flex items-center gap-2.5">
        <PixelIcon name={t.iconName} size={32} className={t.icon} />
        <h2 className="font-display text-[26px] leading-8 font-bold">{title}</h2>
      </div>
      {children ? <div className="text-body">{children}</div> : null}
      {actions ? <div className="flex gap-2.5">{actions}</div> : null}
    </section>
  );
}
