"use client";

import { useState } from "react";
import { ConfidenceSelector } from "@/components/ui/confidence-selector";
import { demoItem } from "@/copy/strings";

/** Interactive sample for the gallery: remembers the pick so the checked state can be seen. */
export function ConfidenceDemo() {
  const [value, setValue] = useState<number | null>(null);
  return (
    <ConfidenceSelector
      legend={demoItem.confidenceTitle}
      help={demoItem.confidenceHelp}
      guessing={demoItem.confidenceGuessing}
      certain={demoItem.confidenceCertain}
      skip={demoItem.confidenceSkip}
      value={value}
      onPick={setValue}
    />
  );
}
