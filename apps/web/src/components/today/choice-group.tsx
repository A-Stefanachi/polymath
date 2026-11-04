"use client";

import { cn } from "@/lib/utils";

export type Choice<T extends string | number> = { value: T; label: string; visible?: string };

/**
 * A single-select group built on native radio inputs, so arrow keys, focus and screen-reader semantics come
 * from the browser (doc 09 S06 AC-5). Selected = ink fill, unselected = raised card; the selection is also
 * the checked state, never colour alone.
 */
export function ChoiceGroup<T extends string | number>({
  name,
  legend,
  choices,
  value,
  onChange,
  className,
  mono,
}: {
  name: string;
  legend: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={legend} className={cn("grid gap-2.5", className)} style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}>
      {choices.map((c) => {
        const on = c.value === value;
        return (
          <label key={String(c.value)} className="relative block">
            <input
              type="radio"
              name={name}
              value={String(c.value)}
              checked={on}
              onChange={() => onChange(c.value)}
              aria-label={c.label}
              className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
            />
            <span
              className={cn(
                "flex min-h-14 items-center justify-center border-[3px] border-ink px-1 text-[16px] font-semibold peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-primary",
                mono && "font-mono text-[17px]",
                on ? "bg-ink text-bg" : "shadow-px-sm bg-surface text-ink",
              )}
            >
              {c.visible ?? c.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
