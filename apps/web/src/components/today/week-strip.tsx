import { today as t } from "@/copy/strings";
import { cn } from "@/lib/utils";

/** Seven pixel blocks, Monday first; a filled block is a day with a completed session. Each block has a text name for screen readers. */
export function WeekStrip({ practised, todayIndex, minutes, target }: { practised: readonly boolean[]; todayIndex: number; minutes: number; target: number }) {
  const days = practised.filter(Boolean).length;
  return (
    <section aria-labelledby="week-heading" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 id="week-heading" className="font-label text-sm font-normal tracking-[0.04em] uppercase">
          {t.thisWeek}
        </h2>
        <span className="text-[15px] text-muted">{t.daysPractised(days)}</span>
      </div>
      <ul className="grid grid-cols-7 gap-1.5">
        {practised.map((on, i) => (
          <li key={t.dayNames[i]} className="flex flex-col items-center gap-1">
            <span aria-hidden="true" className={cn("h-[22px] w-full border-2 border-ink", on ? "bg-primary" : "bg-transparent", i === todayIndex && "outline-2 outline-offset-2 outline-ink")} />
            <span aria-hidden="true" className="text-[13px] text-muted">
              {t.dayInitials[i]}
            </span>
            <span className="sr-only">{`${t.dayNames[i]}, ${on ? t.practised : t.notPractised}`}</span>
          </li>
        ))}
      </ul>
      <p className="text-[15px] text-muted">{t.weekMinutes(minutes, target)}</p>
    </section>
  );
}
