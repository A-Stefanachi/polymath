"use client";

import type { components } from "@polymath/shared-types";
import { useState, type ReactNode } from "react";
import { PractiseButton } from "@/components/practise-button";
import { Card } from "@/components/ui/card";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/load-state";
import { ScreenTitle } from "@/components/ui/screen-title";
import { StatusChip, type SkillState } from "@/components/ui/status-chip";
import { lists, reviewScreen as t } from "@/copy/strings";
import { formatDay } from "@/lib/views/format";
import { groupReviewQueue, type ReviewRow } from "@/lib/views/review-queue";
import { getJson, useLoad } from "@/lib/views/use-load";

type Queue = components["schemas"]["ReviewQueue"];
type Graph = components["schemas"]["Graph"];

const HORIZON_H = 168; // seven days
const PRACTISE_ALL_MIN = { min: 5, max: 20 };

async function loadReview() {
  const [queue, graph] = await Promise.all([getJson<Queue>(`/api/v1/review-queue?horizon_h=${String(HORIZON_H)}`), getJson<Graph>("/api/v1/graph")]);
  return { queue, graph, now: new Date() };
}

const CHIP: Record<string, SkillState> = { learning: "learning", reviewing: "reviewing", mastered: "mastered", decayed: "refresher" };

function whyNow(row: ReviewRow, now: Date): string {
  if (row.daysOverdue > 0) return t.overdueBy(row.daysOverdue);
  return row.due.toDateString() === now.toDateString() ? t.dueToday : t.dueOn(formatDay(row.due));
}

function Row({ row, title, mastery, now, actions }: { row: ReviewRow; title: string; mastery: string; now: Date; actions: boolean }) {
  const [declined, setDeclined] = useState(false);
  return (
    <li data-skill-key={row.skillKey} className="flex flex-col gap-3 border-[3px] border-ink bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[19px] font-bold">{title}</h3>
        <StatusChip state={CHIP[mastery] ?? "reviewing"} />
      </div>
      <p className="text-muted">{whyNow(row, now)}</p>
      {actions ? (
        <div className="flex flex-wrap items-start gap-3">
          <PractiseButton label={lists.practiseNow} name={lists.practiseNowFor(title)} body={{ available_minutes: 5, skill_focus: row.skillKey }} />
          {declined ? (
            <p role="status" className="self-center text-[16px]">
              {t.notNowExplained}
            </p>
          ) : (
            <button type="button" onClick={() => setDeclined(true)} className="min-h-12 px-1 text-[16px] font-semibold text-primary underline underline-offset-4">
              {t.notNow}
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function ReviewScreen() {
  const [state, reload] = useLoad(loadReview);
  if (state.status === "loading") return <Content><LoadingBlock /></Content>;
  if (state.status === "error") return <Content><ErrorBlock offline={state.offline} onRetry={reload} /></Content>;

  const { queue, graph, now } = state.data;
  const groups = groupReviewQueue(queue, now);
  const info = new Map(graph.nodes.map((s) => [s.key, s.title]));
  const mastery = new Map(queue.items.map((i) => [i.skill_key, i.mastery_state]));
  const title = (key: string) => info.get(key) ?? key;
  const minutes = Math.min(PRACTISE_ALL_MIN.max, Math.max(PRACTISE_ALL_MIN.min, queue.estimated_minutes ?? PRACTISE_ALL_MIN.min));

  return (
    <Content>
      <p data-testid="review-counts" className="text-body">
        {t.counts(groups.today, groups.overdue, groups.upcoming.length)}
      </p>
      <section aria-labelledby="due-now" className="flex flex-col gap-3">
        <h2 id="due-now" className="font-label text-[14px] tracking-[0.04em] uppercase">
          {t.dueTitle}
        </h2>
        {groups.dueNow.length === 0 ? (
          <EmptyBlock>
            <p>{t.empty}</p>
          </EmptyBlock>
        ) : (
          <>
            <Card hero>
              <p>{t.practiseAllHelp}</p>
              <PractiseButton label={t.practiseAll} variant="primary" size="lg" body={{ available_minutes: minutes }} />
            </Card>
            <ul aria-label={t.dueCaption} className="flex flex-col gap-3">
              {groups.dueNow.map((r) => (
                <Row key={r.skillKey} row={r} title={title(r.skillKey)} mastery={mastery.get(r.skillKey) ?? "reviewing"} now={now} actions />
              ))}
            </ul>
          </>
        )}
      </section>
      <section aria-labelledby="upcoming" className="flex flex-col gap-3">
        <h2 id="upcoming" className="font-label text-[14px] tracking-[0.04em] uppercase">
          {t.upcomingTitle}
        </h2>
        {groups.upcoming.length === 0 ? (
          <p className="text-muted">{t.emptyUpcoming}</p>
        ) : (
          <ul aria-label={t.upcomingCaption} className="flex flex-col gap-3">
            {groups.upcoming.map((r) => (
              <Row key={r.skillKey} row={r} title={title(r.skillKey)} mastery={mastery.get(r.skillKey) ?? "reviewing"} now={now} actions={false} />
            ))}
          </ul>
        )}
      </section>
    </Content>
  );
}

function Content({ children }: { children: ReactNode }) {
  return (
    <>
      <ScreenTitle>{t.title}</ScreenTitle>
      {children}
    </>
  );
}
