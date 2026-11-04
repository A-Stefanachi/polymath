import type { ReactNode } from "react";
import { ui } from "@/copy/strings";

/**
 * Session top bar: text first ("Task 3 of 8 · 6 of 15 min"), segmented progress second. Progress is counts the
 * learner can check; no streaks or points (doc 09 section 11). `pause` is a slot for the Pause control.
 */
export function SessionTopBar({
  task,
  tasks,
  minutesDone,
  minutesTotal,
  pause,
}: {
  task: number;
  tasks: number;
  minutesDone: number;
  minutesTotal: number;
  pause?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-b-[3px] border-ink bg-surface px-4 pt-4 pb-3">
      <div className="flex items-center justify-between gap-3">
        {pause ?? <span />}
        <span className="font-mono text-base font-semibold">{`${ui.taskOf(task, tasks)} · ${ui.minutesOf(minutesDone, minutesTotal)}`}</span>
      </div>
      <div aria-hidden="true" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${tasks}, minmax(0, 1fr))` }}>
        {Array.from({ length: tasks }, (_, i) => (
          <span key={i} className={`h-3 border-2 border-ink ${i < task - 1 ? "bg-primary" : i === task - 1 ? "bg-coin" : "bg-transparent"}`} />
        ))}
      </div>
    </div>
  );
}
