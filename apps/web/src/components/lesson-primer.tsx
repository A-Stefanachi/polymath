"use client";

import type { components } from "@polymath/shared-types";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { lesson as t } from "@/copy/strings";
import { svgDataUri, svgSize } from "@/lib/lessons/figure";
import { Inline, LessonMarkdown } from "@/lib/lessons/markdown";

export type LessonView = components["schemas"]["LessonView"];
type Screen = LessonView["screens"][number];
type Check = LessonView["checks"][number];

export type PrimerResult = { skipped: boolean; stepsSeen: number; dwellMs: number };

type Step = { kind: "screen"; screen: Screen } | { kind: "misconception" } | { kind: "check"; check: Check; n: number } | { kind: "recap" };

/** The steps in the order a learner meets them (00a K8): the screens, the mix-up, the checks, the recap. The recap variant is the recap alone. */
export function stepsOf(lesson: LessonView): Step[] {
  if (lesson.variant === "recap") return [{ kind: "recap" }];
  return [
    ...lesson.screens.map((screen): Step => ({ kind: "screen", screen })),
    { kind: "misconception" },
    ...lesson.checks.map((check, i): Step => ({ kind: "check", check, n: i + 1 })),
    { kind: "recap" },
  ];
}


function Mixup({ lesson, withTempting }: { lesson: LessonView; withTempting: boolean }) {
  const m = lesson.misconception;
  return (
    <div className="flex flex-col gap-3" data-testid="lesson-mixup">
      <div>
        <h3 className="font-semibold">{t.wrongIdea}</h3>
        <LessonMarkdown source={m.wrong_idea_md} />
      </div>
      {withTempting && (
        <div>
          <h3 className="font-semibold">{t.whyTempting}</h3>
          <LessonMarkdown source={m.why_tempting_md} />
        </div>
      )}
      <div>
        <h3 className="font-semibold">{t.correctIdea}</h3>
        <LessonMarkdown source={m.correct_idea_md} />
      </div>
    </div>
  );
}

/**
 * A screen or check figure. An image data URI keeps the SVG inert; the alt text is the text alternative (WCAG 1.1.1).
 * Inside an <img>, the figure's currentColor resolves to black whatever the theme, so the image carries its own white
 * paper (svgDataUri) and the panel is white too. The drawing is scaled up to the column width because figures are
 * authored at about 300 px wide.
 */
function Figure({ figure }: { figure: { svg: string; alt: string } }) {
  return (
    <Image
      unoptimized
      src={svgDataUri(figure.svg)}
      alt={figure.alt}
      {...svgSize(figure.svg)}
      className="h-auto w-full max-w-xl self-start border-2 border-ink bg-white p-3"
    />
  );
}

function CheckStep({ check, answered, onAnswer }: { check: Check; answered: string | undefined; onAnswer: (optionId: string) => void }) {
  const chosen = check.options.find((o) => o.id === answered);
  return (
    <div className="flex flex-col gap-3">
      <p id={`stem-${check.id}`} className="font-semibold">
        <Inline source={check.stem_md} />
      </p>
      {check.figure && <Figure figure={check.figure} />}
      <p className="text-[15px] text-muted">{t.checkHelp}</p>
      <div role="group" aria-labelledby={`stem-${check.id}`} className="flex flex-col gap-2">
        {check.options.map((o) => (
          <Button
            key={o.id}
            type="button"
            variant="secondary"
            size="md"
            className="justify-start text-left"
            aria-pressed={answered === o.id}
            disabled={answered !== undefined && answered !== o.id}
            onClick={() => answered === undefined && onAnswer(o.id)}
          >
            <Inline source={o.text_md} />
          </Button>
        ))}
      </div>
      {chosen && (
        <div role="status" data-testid="lesson-check-feedback" className="flex flex-col gap-1">
          <p className="font-semibold">{chosen.correct ? t.right : t.notQuite}</p>
          <LessonMarkdown source={chosen.feedback_md} />
        </div>
      )}
    </div>
  );
}

/**
 * Concept primer, doc 09 S08 card 9 (00a K8). One step at a time. Used by the runner (`learner`), and read-only
 * (`preview`) by the review console, so the founder reviews exactly what learners see, and by re-reading from the
 * skill map (00a M3). Nothing here is graded: answering a check
 * only reports through `onCheckAnswered`; the runner turns that into an analytics event and nothing else.
 */
export function LessonPrimer({
  lesson,
  mode = "learner",
  onFinish,
  onCheckAnswered,
}: {
  lesson: LessonView;
  mode?: "learner" | "preview";
  onFinish?: (result: PrimerResult) => void;
  onCheckAnswered?: (checkId: string, correct: boolean) => void;
}) {
  const steps = stepsOf(lesson);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const startedAt = useRef(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const moved = useRef(false);
  const step = steps[index] ?? steps[0];
  const last = index === steps.length - 1;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  // Focus follows the content: the new step's heading, but not on first render.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [index]);

  if (!step) return null;

  function go(to: number) {
    moved.current = true;
    setIndex(to);
    setSeen((s) => Math.max(s, to + 1));
  }
  function finish(skipped: boolean) {
    onFinish?.({ skipped, stepsSeen: seen, dwellMs: Math.max(0, Date.now() - startedAt.current) });
  }
  function answer(check: Check, optionId: string) {
    setAnswers((a) => ({ ...a, [check.id]: optionId }));
    onCheckAnswered?.(check.id, check.options.find((o) => o.id === optionId)?.correct === true);
  }

  const title =
    step.kind === "screen"
      ? step.screen.title
      : step.kind === "misconception"
        ? t.mixupTitle
        : step.kind === "check"
          ? t.checkTitle(step.n, lesson.checks.length)
          : lesson.variant === "recap"
            ? t.recapVariantTitle
            : t.recapTitle;

  return (
    <section data-testid="lesson-primer" aria-label={t.region} className="flex flex-col gap-4">
      <p className="text-[15px] text-muted" data-testid="lesson-progress">
        {t.progress(index + 1, steps.length)}
      </p>
      <div data-testid="lesson-step" className="flex flex-col gap-3">
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-xl font-bold outline-none">
          {title}
        </h2>
        {step.kind === "screen" && (
          <>
            <LessonMarkdown source={step.screen.body_md} />
            {step.screen.figure && <Figure figure={step.screen.figure} />}
          </>
        )}
        {step.kind === "misconception" && <Mixup lesson={lesson} withTempting />}
        {step.kind === "check" && <CheckStep check={step.check} answered={answers[step.check.id]} onAnswer={(id) => answer(step.check, id)} />}
        {step.kind === "recap" && (
          <>
            <LessonMarkdown source={lesson.recap_md} />
            {lesson.variant === "recap" && <Mixup lesson={lesson} withTempting={false} />}
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {index > 0 && (
          <Button type="button" variant="secondary" size="md" onClick={() => go(index - 1)}>
            {t.back}
          </Button>
        )}
        {!last && (
          <Button type="button" size="md" onClick={() => go(index + 1)}>
            {t.next}
          </Button>
        )}
        {last && mode === "learner" && (
          <Button type="button" size="md" onClick={() => finish(false)}>
            {t.toExample}
          </Button>
        )}
        {mode === "learner" && (
          <Button type="button" variant="link" size="md" onClick={() => finish(true)}>
            {t.skip}
          </Button>
        )}
      </div>
    </section>
  );
}
