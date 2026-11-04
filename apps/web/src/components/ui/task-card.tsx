import type { ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "@/components/pixel-icon";

/**
 * Shell of one task: a caps label with a pixel icon (chrome), then the question and the answer control as plain
 * content. Nothing decorative goes inside the question (doc 09 section 3, 00a J7 rule 02).
 */
export function TaskCard({ label, eyebrow, icon = "elec", children, footer }: { label: string; eyebrow: ReactNode; icon?: PixelIconName; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2 font-label text-[13px] tracking-[0.04em] text-muted uppercase">
        <PixelIcon name={icon} size={20} className="text-primary" />
        <span>{eyebrow}</span>
      </div>
      <article aria-label={label} className="flex flex-col gap-3.5 border-[3px] border-ink bg-surface px-4 py-[18px] text-ink">
        {children}
      </article>
      {footer}
    </div>
  );
}
