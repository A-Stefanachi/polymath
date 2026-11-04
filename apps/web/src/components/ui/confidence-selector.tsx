"use client";

import { useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  legend: string;
  help?: string;
  guessing: string;
  certain: string;
  skip: string;
  /** Called with 1 to 5, or null for Skip. Picking commits at once (doc 09 S08: confidence comes before feedback). */
  onPick: (value: number | null) => void;
  /** Checked value, when the parent keeps one. */
  value?: number | null;
};

const VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Confidence 1 to 5 with radio semantics (radiogroup, roving tabindex, arrow keys move focus) plus a
 * Skip action. Confidence is optional (FR-071); skipping stores nothing.
 */
export function ConfidenceSelector({ legend, help, guessing, certain, skip, onPick, value = null }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabStop = value ?? 1;

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    refs.current[(index + step + VALUES.length) % VALUES.length]?.focus();
  }

  return (
    <div className="flex flex-col gap-3" data-testid="confidence">
      <p id="confidence-legend" className="text-lg font-bold">
        {legend}
      </p>
      {help ? <p className="text-[15px] leading-[22px] text-muted">{help}</p> : null}
      <div role="radiogroup" aria-labelledby="confidence-legend" className="grid grid-cols-5 gap-2">
        {VALUES.map((n, i) => (
          <button
            key={n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={n === 1 ? `1 ${guessing}` : n === 5 ? `5 ${certain}` : String(n)}
            tabIndex={n === tabStop ? 0 : -1}
            onClick={() => onPick(n)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="px-press h-[52px] min-w-0 border-[3px] border-ink bg-surface font-mono text-xl font-semibold text-ink shadow-px-sm aria-checked:bg-ink aria-checked:text-bg aria-checked:shadow-none"
          >
            {n}
          </button>
        ))}
      </div>
      <div aria-hidden="true" className="flex justify-between text-sm text-muted">
        <span>1 {guessing.toLowerCase()}</span>
        <span>5 {certain.toLowerCase()}</span>
      </div>
      <Button type="button" variant="link" size="md" className="self-start" onClick={() => onPick(null)}>
        {skip}
      </Button>
    </div>
  );
}
