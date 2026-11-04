import { PixelIcon, type PixelIconName } from "@/components/pixel-icon";
import { ui } from "@/copy/strings";
import { cn } from "@/lib/utils";

// `mastered` and `refresher` (a decayed skill) were added by the skill map (BL-0061); the first four are the
// gallery states of BL-0058.
export type SkillState = "reviewing" | "learning" | "ready" | "locked" | "mastered" | "refresher";

// Every state reads three ways: a shape (fill, outline, dashed), an icon and a word (doc 09 section 3).
export const SKILL_STATE_LOOK: Record<SkillState, { label: string; icon: PixelIconName; box: string }> = {
  reviewing: { label: ui.chipReviewing, icon: "correct", box: "border-solid bg-primary text-on-primary" },
  learning: { label: ui.chipLearning, icon: "micro", box: "border-solid bg-coin text-on-coin" },
  ready: { label: ui.chipReady, icon: "today", box: "border-solid bg-surface text-ink" },
  locked: { label: ui.chipLocked, icon: "locked", box: "border-dashed bg-transparent text-muted" },
  mastered: { label: ui.chipMastered, icon: "saved", box: "border-solid bg-ok-fill text-ok" },
  refresher: { label: ui.chipRefresher, icon: "time", box: "border-dashed bg-nq-fill text-ink" },
};

/** Skill-state chip. `why` says why a skill is locked, in words; `label` replaces the default word. */
export function StatusChip({ state, why, label, className }: { state: SkillState; why?: string; label?: string; className?: string }) {
  const s = SKILL_STATE_LOOK[state];
  return (
    <span className={cn("inline-flex min-h-8 items-center gap-1.5 border-[3px] border-ink px-2 text-[15px] font-bold", s.box, className)} data-state={state}>
      <PixelIcon name={s.icon} size={16} />
      <span>
        {label ?? s.label}
        {why ? <span className="font-normal">{`: ${why}`}</span> : null}
      </span>
    </span>
  );
}
