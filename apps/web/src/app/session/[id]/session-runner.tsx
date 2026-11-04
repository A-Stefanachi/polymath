"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SessionTopBar } from "@/components/ui/session-top-bar";
import { runner as t } from "@/copy/strings";
import { loadTitles } from "@/lib/today/client";
import { fallbackTitle } from "@/lib/today/today";
import { ShortcutHelp } from "./shortcut-help";
import { TaskView, type RunnerTask } from "./task-view";

type Loaded = { status: string; planned_min: number; tasks: (RunnerTask & { position: number; est_seconds: number; status: string })[] };
type Screen = "task" | "paused" | "confirm-end";

const json = { "content-type": "application/json" };

/** S08 micro runner (doc 09): one task at a time, a top bar with Pause, then the summary at /session/[id]/summary. */
export function SessionRunner({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [screen, setScreen] = useState<Screen>("task");
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState(false);
  const [help, setHelp] = useState(false);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [reload, setReload] = useState(0);
  const [nextError, setNextError] = useState(false);
  const finishing = useRef(false);
  const advancing = useRef(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      // Start first (NFR-02, BL-0063): it moves a planned session to active and returns an active one unchanged,
      // so the common case needs one round trip. A closed session refuses it; the read then decides where to go.
      let res = await fetch(`/api/v1/sessions/${id}/start`, { method: "POST", headers: { ...json, "idempotency-key": crypto.randomUUID() }, body: "{}" });
      if (!res.ok) {
        res = await fetch(`/api/v1/sessions/${id}`);
        if (!res.ok) throw new Error("load");
      }
      const body = (await res.json()) as Loaded;
      if (body.status === "completed" || body.status === "abandoned") return router.replace(`/session/${id}/summary`);
      if (!live) return;
      // The server is the resume point: a graded attempt, a completed worked example or a skip closes the task there.
      setDone(body.tasks.filter((x) => x.status === "done" || x.status === "skipped").map((x) => x.id));
      setSession({ ...body, tasks: [...body.tasks].sort((a, b) => a.position - b.position) });
    })().catch(() => live && setFailed(true));
    void loadTitles().then((x) => live && setTitles(x)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [id, reload, router]);

  const finish = useCallback(async () => {
    setEnding(true);
    setEndError(false);
    const res = await fetch(`/api/v1/sessions/${id}/complete`, { method: "POST", headers: { ...json, "idempotency-key": crypto.randomUUID() }, body: "{}" }).catch(() => null);
    if (res?.ok) return router.push(`/session/${id}/summary`);
    finishing.current = false;
    setEnding(false);
    setEndError(true);
  }, [id, router]);

  const current = session?.tasks.find((x) => !done.includes(x.id)) ?? null;

  // Every task is behind the learner: close the session (idempotent) and show the summary.
  useEffect(() => {
    if (session && !current && !finishing.current) {
      finishing.current = true;
      void finish();
    }
  }, [session, current, finish]);

  // The browser Back button pauses instead of leaving (S08 AC 6): one history entry is kept as a trap.
  useEffect(() => {
    window.history.pushState({ runner: id }, "");
    const onPop = () => {
      window.history.pushState({ runner: id }, "");
      setScreen((s) => (s === "task" ? "paused" : s));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [id]);

  // `?` opens the shortcut list, except while typing in a field (doc 09 section 7).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "?" || el?.matches("input, textarea, select")) return;
      setHelp(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A graded task is already closed on the server by its attempt (00a J9). A worked example is closed by
  // completeTask, which also moves the skill's loop step; an unsupported task is skipped (best effort).
  async function advance(task: RunnerTask, skip = false) {
    if (advancing.current) return;
    advancing.current = true;
    setNextError(false);
    try {
      const body = skip ? { outcome: "skipped", skip_reason: "not_now" } : task.task_kind === "worked_example" ? { outcome: "done" } : null;
      if (body) {
        const res = await fetch(`/api/v1/tasks/${task.id}/complete`, { method: "POST", headers: { ...json, "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(body) }).catch(() => null);
        if (!res?.ok && !skip) return setNextError(true);
      }
      setDone((d) => [...d, task.id]);
    } finally {
      advancing.current = false;
    }
  }

  if (failed)
    return (
      <div className="flex flex-col gap-3 p-4">
        <p role="alert">{t.loadFailed}</p>
        <Button variant="secondary" size="md" className="self-start" onClick={() => {
            setFailed(false);
            setReload((n) => n + 1);
          }}>
          {t.retry}
        </Button>
      </div>
    );
  if (!session) return <p className="p-4" aria-live="polite">{t.loading}</p>;

  const total = session.tasks.length;
  const index = current ? session.tasks.indexOf(current) : total - 1;
  const minutesDone = Math.round(session.tasks.filter((x) => done.includes(x.id)).reduce((s, x) => s + x.est_seconds, 0) / 60);
  const label = current ? `${current.skill_key ? (titles[current.skill_key] ?? fallbackTitle(current.skill_key)) : t.otherKind} · ${t.kinds[current.task_kind] ?? t.otherKind}` : "";

  return (
    <>
      <SessionTopBar
        task={index + 1}
        tasks={total}
        minutesDone={minutesDone}
        minutesTotal={session.planned_min}
        pause={
          <Button variant="secondary" size="md" onClick={() => setScreen("paused")} disabled={screen !== "task" || ending}>
            {t.pause}
          </Button>
        }
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-4 pb-12">
        <p className="sr-only" aria-live="polite">{`Task ${index + 1} of ${total}`}</p>
        {ending && <p aria-live="polite">{t.ending}</p>}
        {nextError && (
          <p role="alert" className="font-semibold text-nq">
            {t.nextError}
          </p>
        )}
        {endError && (
          <div className="flex flex-col gap-3">
            <p role="alert" className="font-semibold text-nq">
              {t.endError}
            </p>
            <Button variant="secondary" size="md" className="self-start" onClick={() => void finish()}>
              {t.retry}
            </Button>
          </div>
        )}
        {screen !== "task" && (
          <Card hero>
            {screen === "paused" ? (
              <>
                <h2 className="font-display text-2xl font-bold">{t.pausedTitle}</h2>
                <p>{t.pausedBody}</p>
                <Button autoFocus onClick={() => setScreen("task")}>
                  {t.resume}
                </Button>
                <Button variant="secondary" onClick={() => setScreen("confirm-end")}>
                  {t.endSession}
                </Button>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold">{t.endConfirm}</h2>
                <Button autoFocus variant="secondary" onClick={() => setScreen("paused")}>
                  {t.endConfirmNo}
                </Button>
                <Button disabled={ending} onClick={() => void finish()}>
                  {ending ? t.ending : t.endConfirmYes}
                </Button>
              </>
            )}
          </Card>
        )}
        {current && !ending && (
          <div hidden={screen !== "task"}>
            <TaskView key={current.id} sessionId={id} task={current} label={label} last={index === total - 1} paused={screen !== "task"} onNext={() => void advance(current)} onSkip={() => void advance(current, true)} />
          </div>
        )}
        <Button variant="link" size="md" className="self-start" onClick={() => setHelp(true)}>
          {t.shortcutsOpen}
        </Button>
      </div>
      <ShortcutHelp open={help} onClose={() => setHelp(false)} />
    </>
  );
}
