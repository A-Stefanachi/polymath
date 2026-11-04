import { PixelIcon, type PixelIconName } from "@/components/pixel-icon";
import { ui } from "@/copy/strings";
import { cn } from "@/lib/utils";

export type SkillState = "reviewing" | "learning" | "ready" | "locked";

// Every state reads three ways: a shape (fill, outline, dashed), an icon and a word (doc 09 section 3).
const STATES: Record<SkillState, { label: string; icon: PixelIconName; box: string }> = {
  reviewing: { label: ui.chipReviewing, icon: "correct", box: "border-solid bg-primary text-on-primary" },
  learning: { label: ui.chipLearning, icon: "micro", box: "border-solid bg-coin text-on-coin" },
  ready: { label: ui.chipReady, icon: "today", box: "border-solid bg-surface text-ink" },
  locked: { label: ui.chipLocked, icon: "locked", box: "border-dashed bg-transparent text-muted" },
};

/** Skill-state chip. `why` says why a skill is locked, in words. */
export function StatusChip({ state, why, className }: { state: SkillState; why?: string; className?: string }) {
  const s = STATES[state];
  return (
    <span className={cn("inline-flex min-h-8 items-center gap-1.5 border-[3px] border-ink px-2 text-[15px] font-bold", s.box, className)} data-state={state}>
      <PixelIcon name={s.icon} size={16} />
      <span>
        {s.label}
        {why ? <span className="font-normal">{`: ${why}`}</span> : null}
      </span>
    </span>
  );
}
