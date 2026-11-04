"use client";

import "katex/dist/katex.min.css";
import katex from "katex";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoItem as t } from "@/copy/strings";

type Rendered = { prompt_md: string; alt_text?: string; answer_prompt?: string };
type Loaded = { itemId: string; rendered: Rendered; startedAt: string };
type Result = { correct: boolean | null; status: string; feedback?: string; unit?: string };

const NUMBER_AND_UNIT = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*(\S*)\s*$/;

/** Statement text with `$...$` spans typeset by KaTeX (trust off: no \href or raw HTML). */
function Statement({ source }: { source: string }) {
  const parts = source.split(/\$([^$]+)\$/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          part
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part, { throwOnError: false, trust: false }) }} />
        ),
      )}
    </>
  );
}

export function ItemCard({ taskId }: { taskId: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [askConfidence, setAskConfidence] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/v1/tasks/${taskId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { item: { id: string; rendered: Rendered } };
        if (live) setLoaded({ itemId: body.item.id, rendered: body.item.rendered, startedAt: new Date().toISOString() });
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [taskId]);

  // Check only locks the answer and asks for confidence; nothing is sent or shown until the learner
  // picks 1-5 or skips (FR-071, doc 09 S08 AC 3).
  function check(event: FormEvent) {
    event.preventDefault();
    if (!loaded || busy || result || askConfidence) return;
    if (!NUMBER_AND_UNIT.test(answer)) return setError(t.invalid);
    setError(null);
    setAskConfidence(true);
  }

  async function submit(confidence: number | null) {
    const match = NUMBER_AND_UNIT.exec(answer);
    if (!loaded || busy || result || !match) return;
    setAskConfidence(false);
    setBusy(true);
    const res = await fetch("/api/v1/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_attempt_id: crypto.randomUUID(),
        item_id: loaded.itemId,
        session_task_id: taskId,
        started_at: loaded.startedAt,
        submitted_at: new Date().toISOString(),
        ...(confidence === null ? {} : { confidence }),
        response: { kind: "numeric", value: Number(match[1]), ...(match[2] ? { unit: match[2] } : {}) },
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError(t.submitFailed);
      return setAskConfidence(true); // the answer is kept; the learner can pick again
    }
    const body = (await res.json()) as { grade: { status: string; correct: boolean | null; feedback?: string; graders: { detail?: { unit?: unknown } }[] } | null };
    const unit = body.grade?.graders[0]?.detail?.unit;
    setResult({
      status: body.grade?.status ?? "error",
      correct: body.grade?.correct ?? null,
      ...(body.grade?.feedback ? { feedback: body.grade.feedback } : {}),
      ...(typeof unit === "string" ? { unit } : {}),
    });
  }

  if (loadError) return <p role="alert">{t.loadFailed}</p>;
  if (!loaded) return <p aria-live="polite">{t.loading}</p>;
  const { rendered } = loaded;
  return (
    <Card>
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p role="math" aria-label={rendered.alt_text ?? rendered.prompt_md} data-testid="statement">
        <Statement source={rendered.prompt_md} />
      </p>
      <form onSubmit={check} className="flex flex-col gap-2" noValidate>
        <Label htmlFor="answer">{t.answerLabel}</Label>
        <Input
          id="answer"
          name="answer"
          inputMode="decimal"
          autoComplete="off"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          readOnly={result !== null || askConfidence || busy}
          aria-describedby="answer-help"
        />
        <p id="answer-help" className="text-sm">
          {rendered.answer_prompt || t.answerHelp}
        </p>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={busy || askConfidence || result !== null || answer.trim() === ""}>
          {busy ? t.checking : t.check}
        </Button>
      </form>
      {askConfidence && (
        <fieldset className="flex flex-col gap-2" data-testid="confidence">
          <legend className="font-medium">{t.confidenceTitle}</legend>
          <p className="text-sm">{t.confidenceHelp}</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button key={n} type="button" variant="outline" onClick={() => void submit(n)}>
                {n}
                {n === 1 ? ` ${t.confidenceGuessing}` : n === 5 ? ` ${t.confidenceCertain}` : ""}
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" className="self-start" onClick={() => void submit(null)}>
            {t.confidenceSkip}
          </Button>
        </fieldset>
      )}
      <div aria-live="polite" data-testid="feedback">
        {result && (
          <section className="flex flex-col gap-1">
            <h2 className="font-medium">{result.status !== "graded" ? t.invalid : result.correct ? t.correct : t.incorrect}</h2>
            {result.feedback && <p>{result.feedback}</p>}
            {result.unit && (
              <p>
                {t.unitRead}: {result.unit}
              </p>
            )}
            {result.status === "graded" && !result.correct && <p>{t.incorrectNote}</p>}
          </section>
        )}
      </div>
    </Card>
  );
}
