"use client";

import { today as t } from "@/copy/strings";
import { CHIP_MINUTES } from "@/lib/today/today";
import { ChoiceGroup } from "./choice-group";

/** Time chips 5 / 15 / 30 / 60 (doc 09 S06): a radio group whose options are named "5 min", "15 min", ... */
export function TimeChips({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  return (
    <ChoiceGroup
      name="minutes"
      legend={t.minutesGroup}
      choices={CHIP_MINUTES.map((m) => ({ value: m, label: t.chipMinutes(m), visible: String(m) }))}
      value={value}
      onChange={onChange}
      mono
      className="grid-cols-4"
    />
  );
}
