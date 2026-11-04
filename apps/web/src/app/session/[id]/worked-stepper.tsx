"use client";

import { useEffect, useRef, useState } from "react";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runner as t } from "@/copy/strings";
import { packSelfExplanation, shuffled, type StepPick } from "@/lib/runner/self-explanation";

export type WorkedStep = { id: string; label?: string; text_md: string };

/**
 * Worked example, doc 09 S08 card 6 (00a K4): one step at a time. With labels, each step asks what it is doing,
 * shows the right label at once and then unlocks the next step; nothing is marked or counted (LS-008). After the
 * last step: the explanation, one optional sentence, then Next.
 */
export function WorkedStepper({
  steps,
  explanationMd,
  last,
  onDone,
}: {
  steps: WorkedStep[];
  explanationMd?: string;
  last: boolean;
  onDone: (selfExplanation: string | undefined) => void;
}) {
  const labelled = steps.every((s) => typeof s.label === "string" && s.label !== "");
  const [choices] = useState(() => shuffled([...new Set(steps.map((s) => s.label ?? ""))]));
  const [shown, setShown] = useState(1);
  const [picks, setPicks] = useState<StepPick[]>([]);
  const [note, setNote] = useState("");
  const listRef = useRef<HTMLOListElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const index = shown - 1;
  const current = steps[index];
  const picked = picks.find((p) => p.id === current?.id);
  const unlocked = !labelled || picked !== undefined;
  const finished = shown === steps.length && unlocked;

  // Focus follows the content: the new step's heading after "Show the next step" (the button that held focus is gone).
  useEffect(() => {
    if (shown > 1) listRef.current?.querySelector<HTMLElement>("[data-current] h2")?.focus();
  }, [shown]);
  // The picked choice button unmounts: focus goes to "Show the next step", or to the closing block after the last step.
  useEffect(() => {
    if (finished && picked) endRef.current?.focus();
  }, [finished, picked]);

  function pick(step: WorkedStep, choice: string) {
    setPicks((p) => (p.some((x) => x.id === step.id) ? p : [...p, { id: step.id, picked: choice, right: choice === step.label }]));
  }

  return (
    <div className="flex flex-col gap-4" data-testid="worked-stepper">
      <ol ref={listRef} className="flex flex-col gap-4">
        {steps.slice(0, shown).map((step, i) => {
          const mine = picks.find((p) => p.id === step.id);
          const revealed = !labelled || mine !== undefined;
          const heading = labelled && revealed && step.label ? t.stepOfLabel(i + 1, steps.length, step.label) : t.stepOf(i + 1, steps.length);
          const isCurrent = i === index;
          return (
            <li key={step.id} data-current={isCurrent ? "" : undefined} className="flex flex-col gap-2 border-l-[3px] border-ink pl-3">
              <h2 tabIndex={-1} className="font-display text-xl font-bold outline-none">
                {heading}
              </h2>
              <p className="text-[17px]">
                <MathText source={step.text_md} />
              </p>
              {labelled && isCurrent && !mine && (
                <div role="group" aria-labelledby={`purpose-${step.id}`} className="flex flex-col gap-2">
                  <p id={`purpose-${step.id}`} className="font-semibold">
                    {t.stepPurpose}
                  </p>
                  <p className="text-[15px] text-muted">{t.stepPurposeHelp}</p>
                  {choices.map((c) => (
                    <Button key={c} type="button" variant="secondary" size="md" className="justify-start text-left" onClick={() => pick(step, c)}>
                      {c}
                    </Button>
                  ))}
                </div>
              )}
              {labelled && mine && (
                <p role="status" className="font-semibold">
                  {t.stepRight} {step.label}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {unlocked && !finished && (
        <Button type="button" className="self-start" autoFocus={labelled} onClick={() => setShown((n) => n + 1)}>
          {t.stepNext}
        </Button>
      )}
      {finished && (
        <div ref={endRef} tabIndex={-1} className="flex flex-col gap-3 outline-none">
          {explanationMd && (
            <section aria-labelledby="explanation-title" className="flex flex-col gap-1">
              <h2 id="explanation-title" className="font-display text-xl font-bold">
                {t.explanationTitle}
              </h2>
              <p>
                <MathText source={explanationMd} />
              </p>
            </section>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="self-explanation">{t.selfExplainLabel}</Label>
            <Input id="self-explanation" name="self-explanation" maxLength={300} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="button" className="self-start" onClick={() => onDone(packSelfExplanation(picks, note))}>
            {last ? t.finish : t.next}
          </Button>
        </div>
      )}
    </div>
  );
}
