// Worked steps for getTask (00a K2, K3). Pure: the solution is read in server/privileged and passed in.
import type { components } from "@polymath/shared-types";

type WorkedStep = components["schemas"]["WorkedStep"];

export type WorkedSteps = { worked_steps: WorkedStep[]; steps_total: number; explanation_md?: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Steps a faded problem shows (00a K3). `fadedIndex` = faded tasks of the same skill earlier in the session.
 * 2 or 3 steps: all but the last. 4 or more: the first shows floor(n/2), later ones show only the first step.
 */
export function fadedStepCount(total: number, fadedIndex: number): number {
  if (total <= 3) return total - 1;
  return fadedIndex === 0 ? Math.floor(total / 2) : 1;
}

/** Allow-list copy of `item_secrets.solution` for a worked_example or faded_problem task; null = serve no steps. */
export function workedStepsFor(solution: unknown, taskKind: string, fadedIndex: number): WorkedSteps | null {
  if (taskKind !== "worked_example" && taskKind !== "faded_problem") return null;
  if (!isRecord(solution) || !Array.isArray(solution["steps"])) return null;
  const all = solution["steps"].filter(isRecord).flatMap((s): WorkedStep[] => {
    const id = s["id"];
    const text = s["text_md"];
    if (typeof id !== "string" || typeof text !== "string") return [];
    const label = s["label"];
    return [{ id, ...(typeof label === "string" ? { label } : {}), text_md: text }];
  });
  if (all.length === 0) return null;
  if (taskKind === "worked_example") {
    const out: WorkedSteps = { worked_steps: all, steps_total: all.length };
    const explanation = solution["explanation_md"];
    if (typeof explanation === "string" && explanation !== "") out.explanation_md = explanation;
    return out;
  }
  const shown = fadedStepCount(all.length, fadedIndex);
  if (shown < 1) return null;
  return { worked_steps: all.slice(0, shown), steps_total: all.length };
}
