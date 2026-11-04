// multiple_choice grader, doc 08 section 2.3. Correct iff the chosen option id equals the correct option id.
// No partial credit. A wrong option carries its misconception tag and feedback. An option id that was not
// shown is invalid input (the API answers 400 and stores no attempt). Deterministic, no LLM.

import type { Grade } from "./numeric.ts";

/** An option as shown to the learner, with the distractor's diagnostic data (offline cache, 00a section C). */
export interface McOption {
  readonly id: string;
  readonly misconception_tag?: string | null;
  readonly feedback_md?: string | null;
}

export interface McKey {
  /** The option ids shown for this item; the chosen id must be one of them. */
  readonly options: readonly McOption[];
  readonly correct_option_id: string;
}

/** Perceptual drills record latency; an answer after the time limit is graded normally and flagged `late`. */
export interface McTiming {
  readonly latency_ms: number;
  readonly time_limit_s: number;
}

const NOT_SHOWN = "That option was not shown for this question.";

export function gradeMultipleChoice(optionId: string, key: McKey, timing?: McTiming): Grade {
  const chosen = key.options.find((o) => o.id === optionId);
  if (!chosen) {
    return {
      score: 0,
      correct: false,
      graders: [{ type: "multiple_choice", score: 0, detail: { parse_error: NOT_SHOWN } }],
      feedback: NOT_SHOWN,
      misconception_tags: [],
      status: "invalid_input",
    };
  }
  const correct = optionId === key.correct_option_id;
  const score = correct ? 1 : 0;
  const detail: Record<string, unknown> = { option_id: optionId };
  if (timing && timing.latency_ms > timing.time_limit_s * 1000) detail["late"] = true;
  const tag = chosen.misconception_tag;
  return {
    score,
    correct,
    graders: [{ type: "multiple_choice", score, detail }],
    feedback: correct ? "Correct." : chosen.feedback_md || "Not quite. Check your method and units.",
    misconception_tags: !correct && tag ? [tag] : [],
  };
}
