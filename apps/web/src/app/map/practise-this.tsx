"use client";

import { useEffect, useState } from "react";
import { PractiseButton } from "@/components/practise-button";
import { lists, skillMap as t } from "@/copy/strings";
import type { MapSkill } from "@/lib/views/skill-map";
import { currentContext, practiseMinutes, previewFocus } from "@/lib/views/start-session";

/**
 * "Practise this" on the skill detail (doc 09 S14). The builder is asked first with a dry run (G16); when it would
 * plan nothing (a skill blocked by trace-back, a daily new-skill cap), the detail says so instead of offering a
 * button that can only refuse. Until the answer arrives, or when it is unknown, the button shows.
 */
export function PractiseThis({ skill }: { skill: MapSkill }) {
  const minutes = practiseMinutes(skill.state);
  const [empty, setEmpty] = useState<{ key: string; outcome: "empty" | "capped" | null } | null>(null);

  useEffect(() => {
    let live = true;
    void previewFocus({ available_minutes: minutes, context: currentContext(), skill_focus: skill.key }).then((r) => {
      if (live) setEmpty({ key: skill.key, outcome: r === "empty" || r === "capped" ? r : null });
    });
    return () => {
      live = false;
    };
  }, [skill.key, minutes]);

  if (empty?.key === skill.key && empty.outcome !== null) {
    return <p data-testid="nothing-to-practise">{empty.outcome === "capped" ? lists.newSkillCapped : t.nothingToday}</p>;
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
