"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PixelIcon } from "@/components/pixel-icon";
import { ContextSelector } from "@/components/today/context-selector";
import { SessionPreviewSheet } from "@/components/today/session-preview-sheet";
import { TimeChips } from "@/components/today/time-chips";
import { WeekStrip } from "@/components/today/week-strip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenTitle } from "@/components/ui/screen-title";
import { today as t } from "@/copy/strings";
import { loadTitles, loadToday, previewSession, startNow, type TodayData } from "@/lib/today/client";
import { countGroups, dateLine, DEFAULT_MINUTES, defaultContext, isContext, summariseWeek, type Context, type SessionPreview } from "@/lib/today/today";

const CONTEXT_KEY = "polymath.today.context";
const DEBOUNCE_MS = 150; // S06 AC-1: the preview starts well inside 300 ms of the last tap

type PreviewState =
  | { kind: "loading" }
  | { kind: "ok"; preview: SessionPreview }
  | { kind: "empty" }
  | { kind: "open_session" }
  | { kind: "message"; text: string };

const MESSAGES = { pool_empty: t.poolEmpty, rate_limited: t.rateLimited, signed_out: t.signedOut, error: t.buildError } as const;

const noopSubscribe = () => () => undefined;
// The last choice, else the device width (S06 element c). The server snapshot is null so the first client render
// matches the server's markup.
const deviceContext = (): Context => {
  const stored = window.localStorage.getItem(CONTEXT_KEY);
  return isContext(stored) ? stored : defaultContext(window.innerWidth);
};

export function TodayScreen() {
  const router = useRouter();
  const [minutes, setMinutes] = useState<number>(DEFAULT_MINUTES);
  const [picked, setPicked] = useState<Context | null>(null);
  const device = useSyncExternalStore(noopSubscribe, deviceContext, () => null);
  const context = picked ?? device;
  const [settled, setSettled] = useState<{ key: string; state: PreviewState } | null>(null);
  const [data, setData] = useState<TodayData | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const titlesRequested = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Loading is derived: a result only counts for the minutes, context and retry it was fetched for.
  const key = `${minutes}|${context}|${attempt}`;
  const fetched: PreviewState = settled?.key === key ? settled.state : { kind: "loading" };
  const state: PreviewState = blocked ? { kind: "open_session" } : fetched;

  useEffect(() => {
    void loadToday().then(setData);
  }, []);

  useEffect(() => {
    if (context === null) return;
    const controller = new AbortController();
    const settle = (next: PreviewState) => setSettled({ key, state: next });
    const timer = window.setTimeout(() => {
      previewSession(minutes, context, controller.signal)
        .then((result) => {
          if (result.kind === "ok") return settle(result.preview.tasks.length === 0 ? { kind: "empty" } : { kind: "ok", preview: result.preview });
          if (result.kind === "open_session") return settle({ kind: "open_session" });
          settle({ kind: "message", text: MESSAGES[result.kind] });
        })
        .catch(() => {
          if (!controller.signal.aborted) settle({ kind: "message", text: MESSAGES.error });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [minutes, context, key]);

  // Skill titles are only needed once a list can be shown.
  const hasList = state.kind === "ok";
  useEffect(() => {
    if (!hasList || titlesRequested.current) return;
    titlesRequested.current = true;
    void loadTitles().then(setTitles);
  }, [hasList]);

  const pickContext = useCallback((next: Context) => {
    window.localStorage.setItem(CONTEXT_KEY, next);
    setPicked(next);
  }, []);

  async function start() {
    if (context === null) return;
    setStarting(true);
    setStartError(null);
    const result = await startNow(minutes, context).catch(() => ({ kind: "error" as const }));
    if (result.kind === "ok") return router.push(`/session/${result.id}`);
    setStarting(false);
    if (result.kind === "open_session") {
      setSheetOpen(false);
      return setBlocked(true);
    }
    setStartError(result.kind === "error" ? t.startError : MESSAGES[result.kind]);
  }

  const week = data ? summariseWeek(data.sessions, new Date(), data.timezone) : null;
  const counts = state.kind === "ok" ? countGroups(state.preview.tasks) : null;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <ScreenTitle>{t.title}</ScreenTitle>
        {data ? <span className="shrink-0 pt-2 text-[15px] text-muted">{dateLine(new Date(), data.timezone)}</span> : null}
      </div>
      <TimeChips value={minutes} onChange={setMinutes} />
      {context ? <ContextSelector value={context} onChange={pickContext} /> : null}

      <Card hero aria-label={t.nextSession} role="region" aria-busy={state.kind === "loading"}>
        <div className="flex items-center gap-2 font-label text-[13px] tracking-[0.04em] text-muted uppercase">
          <PixelIcon name="time" size={18} />
          <span>{context ? t.cardLabel(minutes, t[context]) : ""}</span>
        </div>
        {state.kind === "loading" ? (
          <div role="status" className="flex flex-col gap-3">
            <p className="text-[19px] font-semibold">{t.loading}</p>
            <span aria-hidden="true" className="h-4 w-3/4 animate-pulse bg-muted/30" />
            <span aria-hidden="true" className="h-4 w-1/2 animate-pulse bg-muted/30" />
          </div>
        ) : null}
        {state.kind === "ok" && counts ? (
          <>
            <p className="text-[19px] leading-7 font-semibold">{t.about(state.preview.planned_min, state.preview.tasks.length)}</p>
            <p className="flex items-baseline gap-2.5 text-base">
              <span aria-hidden="true" className="inline-block size-2 shrink-0 bg-primary" />
              <span>{t.summaryCounts(counts.reviews, counts.cont, counts.fresh)}</span>
            </p>
            <Button variant="secondary" size="md" onClick={() => setSheetOpen(true)}>
              {t.seeList}
            </Button>
            <Button onClick={() => void start()} disabled={starting}>
              {starting ? t.starting : t.start(minutes)}
            </Button>
            {startError && !sheetOpen ? (
              <p role="alert" className="font-semibold text-nq">
                {startError}
              </p>
            ) : null}
          </>
        ) : null}
        {state.kind === "empty" ? <p className="text-[19px] leading-7 font-semibold">{t.empty}</p> : null}
        {state.kind === "message" ? (
          <>
            <p role="alert" className="text-[19px] leading-7 font-semibold">
              {state.text}
            </p>
            <Button variant="secondary" size="md" onClick={() => setAttempt(attempt + 1)}>
              {t.retry}
            </Button>
          </>
        ) : null}
        {state.kind === "open_session" ? (
          <>
            <p className="text-[19px] leading-7 font-semibold">{t.openSessionTitle}</p>
            <p>{t.openSessionBody}</p>
            {data?.openSessionId ? (
              <Button size="md" onClick={() => router.push(`/session/${data.openSessionId}`)}>
                {t.openSessionContinue}
              </Button>
            ) : null}
          </>
        ) : null}
      </Card>

      {week && data ? <WeekStrip practised={week.practised} todayIndex={week.todayIndex} minutes={week.minutes} target={data.weeklyTarget} /> : null}

      {data ? (
        <section aria-label="Reviews" className="flex items-center gap-3 border-2 border-dashed border-muted px-3.5 py-3">
          <PixelIcon name="review" size={28} className="shrink-0 text-primary" />
          <p>{data.dueNow > 0 ? t.due(data.dueNow, data.dueMinutes) : t.dueNone}</p>
        </section>
      ) : null}

      <SessionPreviewSheet
        open={sheetOpen}
        data={state.kind === "ok" ? state.preview : null}
        titles={titles}
        minutes={minutes}
        starting={starting}
        error={startError}
        onClose={() => {
          setSheetOpen(false);
          setStartError(null); // the dialog returns focus to "See the list" itself
        }}
        onStart={() => void start()}
        onChangeMinutes={setMinutes}
      />
    </>
  );
}
