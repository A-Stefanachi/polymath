"use client";

import { today as t } from "@/copy/strings";
import type { Context } from "@/lib/today/today";
import { ChoiceGroup } from "./choice-group";

/** Phone / Desktop / Bench segmented control (doc 09 S06 element c). Bench says what it is. */
export function ContextSelector({ value, onChange }: { value: Context; onChange: (context: Context) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p id="context-label" className="font-label text-sm tracking-[0.04em] uppercase">
        {t.contextGroup}
      </p>
      <ChoiceGroup
        name="context"
        legend={t.contextGroup}
        choices={[
          { value: "phone", label: t.phone },
          { value: "desktop", label: t.desktop },
          { value: "bench", label: t.bench },
        ]}
        value={value}
        onChange={onChange}
      />
      {value === "bench" ? <p className="text-[16px] text-muted">{t.benchNote}</p> : null}
    </div>
  );
}
