"use client";

import { useEffect, useState } from "react";
import { PractiseButton } from "@/components/practise-button";
import { skillMap as t } from "@/copy/strings";
import { formatDay } from "@/lib/views/format";
import type { MapSkill } from "@/lib/views/skill-map";
import { currentContext, practiseMinutes, previewFocus } from "@/lib/views/start-session";

/**
 * "Practise this" on the skill detail (doc 09 S14). The builder is asked first with a dry run (G16): a learning
 * skill whose loop is done waits for its review (00a M1) and plans nothing, so the detail says when it comes back
 * instead of offering a button that can only refuse. Until the answer arrives, or when it is unknown, the button shows.
 */
export function PractiseThis({ skill }: { skill: MapSkill }) {
  const minutes = practiseMinutes(skill.state);
  const [empty, setEmpty] = useState<{ key: string; empty: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    void previewFocus({ available_minutes: minutes, context: currentContext(), skill_focus: skill.key }).then((r) => {
      if (live) setEmpty({ key: skill.key, empty: r === "empty" });
    });
    return () => {
      live = false;
    };
  }, [skill.key, minutes]);

  if (empty?.key === skill.key && empty.empty) {
    return (
      <p data-testid="nothing-to-practise">{skill.due ? t.nothingUntilReview(formatDay(skill.due)) : t.nothingToday}</p>
    );
  }
  return (
    <PractiseButton
      label={t.practiseThis}
      name={`${t.practiseThis}: ${skill.title}`}
      body={{ available_minutes: minutes, skill_focus: skill.key }}
      variant="primary"
      size="md"
    />
  );
}
