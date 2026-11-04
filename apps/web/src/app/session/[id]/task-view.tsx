"use client";

import "katex/dist/katex.min.css";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LessonPrimer, type LessonView, type PrimerResult } from "@/components/lesson-primer";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfidenceSelector } from "@/components/ui/confidence-selector";
import { FeedbackPanel } from "@/components/ui/feedback-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericAnswer } from "@/components/ui/numeric-answer";
import { TaskCard } from "@/components/ui/task-card";
import { lesson as lt, runner as t } from "@/copy/strings";
import { LessonMarkdown } from "@/lib/lessons/markdown";
import { feedbackBody } from "@/lib/feedback-body";
import { parseNumericAnswer, pollDelayMs, TaskTimer } from "@/lib/runner/runner";
import { ReportProblem } from "./report-problem";
import { WorkedStepper, type WorkedStep } from "./worked-stepper";

export type RunnerTask = { id: string; task_kind: string; skill_key?: string | null; item_id?: string | null };

type Option = { id: string; text_md: string };
type Item = {
  id: string;
  grader_type: string;
  rendered: {
    prompt_md: string;
    alt_text?: string;
    answer_prompt?: string;
    options?: Option[];
    worked_steps?: WorkedStep[];
    steps_total?: number;
    explanation_md?: string;
  };
};

/** doc 11: worked_example_viewed.dwell_ms is capped at 300,000 ms per example. */
const DWELL_CAP_MS = 300_000;
type Grade = { status: string; correct: boolean | null; feedback?: string; misconception_tags?: string[]; graders?: { detail?: { unit?: unknown } }[] };
type AttemptBody = { id: string; grade_status: string; grade: Grade | null };
type Result = { graded: boolean; correct: boolean | null; feedback: string; unit?: string; pending?: boolean; tags: string[] };
type Phase = "answering" | "confidence" | "submitting" | "waiting" | "feedback";

const READ_ONLY_KINDS = ["worked_example", "reading"];
const SUPPORTED = ["exact_numeric", "multiple_choice", "symbolic_equivalence"];

function resultOf(body: AttemptBody): Result {
  const unit = body.grade?.graders?.[0]?.detail?.unit;
  return {
    graded: true,
    correct: body.grade?.correct ?? null,
    feedback: body.grade?.feedback ?? "",
    tags: body.grade?.misconception_tags ?? [],
    ...(typeof unit === "string" ? { unit } : {}),
  };
}

/**
 * One task of the micro runner (doc 09 S08, 6.1): present, answer, optional confidence, Check, feedback, Next.
 * Confidence is asked before any result is shown (FR-071). Feedback renders in the page flow under the question.
 */
export function TaskView({
  sessionId,
  task,
  label,
  last,
  paused,
  knownLesson,
  onLesson,
  onNext,
  onSkip,
}: {
  sessionId: string;
  task: RunnerTask;
  label: string;
  last: boolean;
  paused: boolean;
  /** The primer of this task's skill when an earlier worked example of the session loaded it (feedback links back to it). */
  knownLesson?: LessonView | undefined;
  onLesson?: (skillKey: string, lesson: LessonView) => void;
  /** `selfExplanation` is sent only by the worked-example stepper (completeTask, FR-032). */
  onNext: (selfExplanation?: string) => void;
  /** Leaves a task the screen cannot show yet; closes it as skipped (completeTask, `not_now`). */
  onSkip: () => void;
}) {
  const [item, setItem] = useState<Item | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [answer, setAnswer] = useState("");
  const [choice, setChoice] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [primerDone, setPrimerDone] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);

  const timer = useRef<TaskTimer | null>(null);
  const attemptId = useRef<string>(crypto.randomUUID());
  const startedAt = useRef<string>("");
  const alive = useRef(true);
  const sending = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const confidenceRef = useRef<HTMLDivElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void fetch(`/api/v1/tasks/${task.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { item: Item; lesson?: LessonView };
        if (!live) return;
        if (body.lesson) {
          setLesson(body.lesson);
          if (task.skill_key) onLesson?.(task.skill_key, body.lesson);
        }
        timer.current = new TaskTimer(Date.now());
        startedAt.current = new Date().toISOString();
        setItem(body.item);
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [task.id, reload, task.skill_key, onLesson]);

  // A new task takes focus on its heading, so a screen reader reads it and one Tab reaches the answer.
  useEffect(() => {
    if (item) headingRef.current?.focus();
  }, [item]);

  useEffect(() => {
    if (paused) timer.current?.pause(Date.now());
    else timer.current?.resume(Date.now());
  }, [paused]);

  useEffect(() => {
    if (phase === "confidence") confidenceRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
    if (phase === "feedback") feedbackRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [phase]);

  const settle = useCallback((body: AttemptBody) => {
    if (body.grade_status === "graded") {
      setResult(resultOf(body));
      return setPhase("feedback");
    }
    if (body.grade_status === "pending_review" || body.grade_status === "pending") {
      setResult({ graded: false, correct: null, feedback: "", pending: true, tags: [] });
      return setPhase("feedback");
    }
    // invalid_input and error never count as an attempt: the learner may change the answer and try again.
    attemptId.current = crypto.randomUUID();
    sending.current = false;
    setError(body.grade_status === "error" ? t.gradeError : t.invalid);
    setPhase("answering");
  }, []);

  // getAttempt polling for a queued grade (symbolic without the worker's inline answer): 1 s, then 3 s, up to 90 s.
  const poll = useCallback(
    (id: string, from: number) => {
      setPhase("waiting");
      const step = async () => {
        if (!alive.current) return;
        const delay = pollDelayMs(Date.now() - from);
        if (delay === null) {
          setResult({ graded: false, correct: null, feedback: "", pending: true, tags: [] });
          return setPhase("feedback");
        }
        await new Promise((r) => setTimeout(r, delay));
        if (!alive.current) return;
        const res = await fetch(`/api/v1/attempts/${id}`).catch(() => null);
        const body = res?.ok ? ((await res.json()) as AttemptBody) : null;
        if (body && body.grade_status !== "pending") return settle(body);
        void step();
      };
      void step();
    },
    [settle],
  );

  const submit = useCallback(
    async (picked: number | null) => {
      if (!item || sending.current) return; // a second tap or key repeat while one is in flight is ignored
      sending.current = true;
      const numeric = item.grader_type === "exact_numeric" ? parseNumericAnswer(answer) : null;
      const response =
        item.grader_type === "exact_numeric" && numeric
          ? { kind: "numeric", value: numeric.value, ...(numeric.unit ? { unit: numeric.unit } : {}) }
          : item.grader_type === "multiple_choice"
            ? { kind: "choice", choice_ids: [choice] }
            : { kind: "symbolic", expression: answer.trim() };
      setConfidence(picked);
      setPhase("submitting");
      const now = Date.now();
      const res = await fetch("/api/v1/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_attempt_id: attemptId.current,
          item_id: item.id,
          session_id: sessionId,
          session_task_id: task.id,
          started_at: startedAt.current,
          submitted_at: new Date(now).toISOString(),
          latency_ms: timer.current?.latency(now) ?? 0,
          active_ms: timer.current?.active(now) ?? 0,
          ...(picked === null ? {} : { confidence: picked }),
          response,
        }),
      }).catch(() => null);
      if (!alive.current) return;
      if (!res || (res.status !== 200 && res.status !== 202)) {
        sending.current = false;
        setError(t.submitFailed);
        return setPhase("confidence"); // the answer is kept; the learner can pick again
      }
      const body = (await res.json()) as AttemptBody;
      if (!alive.current) return;
      if (body.grade_status === "pending") return void poll(body.id, Date.now());
      settle(body);
    },
    [item, answer, choice, sessionId, task.id, poll, settle],
  );

  // Check only locks the answer and asks for confidence; nothing is sent until the learner picks 1-5 or skips.
  function check(event: FormEvent) {
    event.preventDefault();
    if (!item || phase !== "answering") return;
    if (item.grader_type === "exact_numeric" && !parseNumericAnswer(answer)) return setError(t.invalid);
    if (item.grader_type === "multiple_choice" ? choice === "" : answer.trim() === "") return;
    setError(null);
    setPhase("confidence");
  }

  // Digits 1-5 pick a confidence and S skips it; these keys are only live while the confidence question shows.
  useEffect(() => {
    if (phase !== "confidence") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-5]$/.test(e.key)) void submit(Number(e.key));
      else if (e.key === "s" || e.key === "S") void submit(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, submit]);

  if (loadError)
    return (
      <div className="flex flex-col gap-3">
        <p role="alert">{t.taskFailed}</p>
        <Button variant="secondary" size="md" className="self-start" onClick={() => {
            setLoadError(false);
            setReload((n) => n + 1);
          }}>
          {t.retry}
        </Button>
      </div>
    );
  if (!item) return <p aria-live="polite">{t.taskLoading}</p>;

  const { rendered } = item;
  const readOnly = READ_ONLY_KINDS.includes(task.task_kind);
  const supported = readOnly || SUPPORTED.includes(item.grader_type);
  const locked = phase !== "answering";
  const title = result?.correct ? t.correct : t.notQuite;
  const body = result && feedbackBody(result.feedback, title);
  // Analytics only (doc 11 section 9, 00a K10): fire and forget; nothing here is an attempt or touches skill_state.
  function sendLessonEvent(name: "lesson_viewed" | "lesson_check_answered", props: Record<string, unknown>) {
    void fetch("/api/v1/events", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [{ client_event_id: crypto.randomUUID(), name, at: new Date().toISOString(), props }] }),
    }).catch(() => undefined);
  }
  if (lesson && !primerDone) {
    const finishPrimer = (r: PrimerResult) => {
      sendLessonEvent("lesson_viewed", { skill_key: lesson.skill_key, lesson_version: lesson.version, variant: lesson.variant, screens_seen: r.stepsSeen, skipped: r.skipped, dwell_ms: r.dwellMs });
      timer.current = new TaskTimer(Date.now());
      setPrimerDone(true);
    };
    return (
      <div className="flex flex-col gap-3.5">
        <TaskCard
          label="Concept primer"
          eyebrow={
            <h1 ref={headingRef} tabIndex={-1} className="outline-none">
              {label}
            </h1>
          }
        >
          <LessonPrimer
            lesson={lesson}
            onFinish={finishPrimer}
            onCheckAnswered={(checkId, correct) => sendLessonEvent("lesson_check_answered", { skill_key: lesson.skill_key, lesson_version: lesson.version, check_id: checkId, correct })}
          />
        </TaskCard>
      </div>
    );
  }
  // A graded answer tagged with the lesson's mix-up (00a K8): the correct idea and a way back to the recap.
  const shownLesson = lesson ?? knownLesson ?? null;
  const mixup = shownLesson !== null && result !== null && !result.pending && result.tags.includes(shownLesson.misconception.tag) ? shownLesson : null;
  const touch = () => timer.current?.touch(Date.now());
  const steps = rendered.worked_steps ?? [];
  const stepper = task.task_kind === "worked_example" && steps.length > 0;
  const faded = task.task_kind === "faded_problem" && steps.length > 0;

  // Example closed (doc 11 section 9): fire and forget, so a failed analytics call never blocks Next.
  function closeExample(selfExplanation: string | undefined) {
    if (item && task.skill_key) {
      const dwell = Math.min(DWELL_CAP_MS, timer.current?.active(Date.now()) ?? 0);
      void fetch("/api/v1/events", {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          events: [{ client_event_id: crypto.randomUUID(), name: "worked_example_viewed", at: new Date().toISOString(), props: { item_id: item.id, skill_key: task.skill_key, dwell_ms: dwell } }],
        }),
      }).catch(() => undefined);
    }
    onNext(selfExplanation);
  }

  const question = (
    <p role="math" aria-label={rendered.alt_text ?? rendered.prompt_md} data-testid="statement" className="max-w-[34ch] text-question sm:max-w-[60ch]">
      <MathText source={rendered.prompt_md} />
    </p>
  );

  return (
    <div className="flex flex-col gap-3.5" onKeyDownCapture={touch} onPointerDownCapture={touch}>
      <TaskCard
        label="Question"
        eyebrow={
          <h1 ref={headingRef} tabIndex={-1} className="outline-none">
            {label}
          </h1>
        }
        footer={
          <>
            {phase === "confidence" && (
              <Card className="px-rise">
                <div ref={confidenceRef}>
                  <ConfidenceSelector
                    legend={t.confidenceTitle}
                    help={t.confidenceHelp}
                    guessing={t.confidenceGuessing}
                    certain={t.confidenceCertain}
                    skip={t.confidenceSkip}
                    onPick={(n) => void submit(n)}
                  />
                </div>
              </Card>
            )}
            <div ref={feedbackRef} aria-live="polite" data-testid="feedback" className="flex flex-col gap-3.5">
              {phase === "waiting" && (
                <FeedbackPanel live={false} tone="info" title={t.pendingTitle}>
                  <p>{t.pendingBody}</p>
                </FeedbackPanel>
              )}
              {phase === "feedback" && result && (
                <FeedbackPanel
                  live={false}
                  tone={result.pending ? "info" : result.correct ? "correct" : "not-quite"}
                  title={result.pending ? t.pendingTitle : title}
                  actions={
                    <Button onClick={() => onNext()}>
                      {last ? t.finish : t.next}
                    </Button>
                  }
                >
                  {result.pending ? <p>{t.pendingLong}</p> : body ? <p>{body}</p> : null}
                  {result.unit && (
                    <p>
                      {t.unitRead}: {result.unit}
                    </p>
                  )}
                  {mixup && (
                    <div data-testid="mixup" className="flex flex-col gap-2">
                      <p className="font-semibold">{lt.commonMixup}</p>
                      <p>{lt.mixupLead}</p>
                      <LessonMarkdown source={mixup.misconception.correct_idea_md} />
                      {!recapOpen && (
                        <Button type="button" variant="secondary" size="md" className="self-start" onClick={() => setRecapOpen(true)}>
                          {lt.readRecap}
                        </Button>
                      )}
                    </div>
                  )}
                  {!result.pending && result.correct === false && <p>{t.comesBack}</p>}
                  {!result.pending && result.correct === false && confidence !== null && confidence >= 4 && <p>{t.sureNote}</p>}
                </FeedbackPanel>
              )}
            </div>
            {mixup && recapOpen && (
              <Card>
                <div data-testid="lesson-recap">
                  <LessonPrimer lesson={{ ...mixup, variant: "recap" }} mode="preview" />
                </div>
                <Button type="button" variant="secondary" size="md" className="self-start" onClick={() => setRecapOpen(false)}>
                  {lt.recapClose}
                </Button>
              </Card>
            )}
            <ReportProblem itemId={item.id} />
          </>
        }
      >
        {question}
        {stepper ? (
          <WorkedStepper steps={steps} {...(rendered.explanation_md ? { explanationMd: rendered.explanation_md } : {})} last={last} onDone={closeExample} />
        ) : readOnly ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-muted">{t.readOnlyNext}</p>
            <Button onClick={() => onNext()}>{last ? t.finish : t.next}</Button>
          </div>
        ) : !supported ? (
          <div className="flex flex-col gap-3">
            <p className="font-semibold">{t.unsupportedTitle}</p>
            <p>{t.unsupportedBody}</p>
            <Button variant="secondary" onClick={onSkip}>
              {t.skipTask}
            </Button>
          </div>
        ) : (
          <form onSubmit={check} className="flex flex-col gap-4" noValidate>
            {faded && (
              <section aria-labelledby="given-steps" className="flex flex-col gap-2" data-testid="given-steps">
                <h2 id="given-steps" className="text-[15px] font-semibold text-muted">
                  {t.givenSteps}
                </h2>
                <ol className="flex flex-col gap-2">
                  {steps.map((step, i) => (
                    <li key={step.id} className="border-l-[3px] border-ink pl-3">
                      <span className="font-semibold">{step.label ? t.stepOfLabel(i + 1, rendered.steps_total ?? steps.length, step.label) : t.stepOf(i + 1, rendered.steps_total ?? steps.length)}</span>
                      <br />
                      <MathText source={step.text_md} />
                    </li>
                  ))}
                </ol>
                <p className="font-semibold">{t.fadedTurn(steps.length + 1, rendered.steps_total ?? steps.length + 1)}</p>
              </section>
            )}
            {item.grader_type === "multiple_choice" ? (
              <fieldset className="flex flex-col gap-2.5" disabled={locked}>
                <legend className="mb-1 text-[15px] font-semibold text-muted">{t.choiceLegend}</legend>
                {(rendered.options ?? []).map((o) => (
                  <label key={o.id} className="relative block">
                    <input
                      type="radio"
                      name="choice"
                      value={o.id}
                      checked={choice === o.id}
                      onChange={() => setChoice(o.id)}
                      className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span className="flex min-h-14 items-center border-[3px] border-ink px-3.5 py-2 text-[17px] peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-primary">
                      <MathText source={o.text_md} />
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : item.grader_type === "symbolic_equivalence" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="answer">{t.symbolicLabel}</Label>
                <Input id="answer" name="answer" mono autoComplete="off" autoCapitalize="off" spellCheck={false} value={answer} onChange={(e) => setAnswer(e.target.value)} readOnly={locked} aria-describedby="answer-help" />
                <p id="answer-help" className="text-[15px] leading-[22px] text-muted">
                  {rendered.answer_prompt || t.symbolicHelp}
                </p>
              </div>
            ) : (
              <NumericAnswer id="answer" label={t.answerLabel} value={answer} onChange={(e) => setAnswer(e.target.value)} readOnly={locked} help={rendered.answer_prompt || t.numericHelp} error={null} />
            )}
            {error && (
              <div role="alert" className="flex flex-col gap-1 font-semibold text-nq">
                <p>{error}</p>
                {error === t.invalid ?<p className="font-normal text-ink">{t.invalidNote}</p> : null}
              </div>
            )}
            <Button type="submit" disabled={locked || (item.grader_type === "multiple_choice" ? choice === "" : answer.trim() === "")}>
              {phase === "submitting" ? t.checking : t.check}
            </Button>
          </form>
        )}
      </TaskCard>
    </div>
  );
}
