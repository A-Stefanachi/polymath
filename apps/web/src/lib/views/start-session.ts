// "Practise now", "Practise this" and "Practise all due" all build a session through buildSession (doc 09 S14, S17).
import type { SkillState } from "@/components/ui/status-chip";

/**
 * Minutes "Practise this" asks for. A review fits 5 minutes. A skill not yet in review starts the learning loop
 * (worked example 4 min, faded problem 5 min, retrieval 1.5 min; 06 section 7.1), which needs 15 minutes of
 * micro budget (B = 0.9 x available, 06 section 7.4); 5 minutes would plan nothing.
 */
export function practiseMinutes(state: SkillState): number {
  return state === "reviewing" || state === "mastered" || state === "refresher" ? 5 : 15;
}

export type StartBody = { available_minutes: number; context: "phone" | "desktop"; skill_focus?: string };
export type StartResult = { ok: true; id: string } | { ok: false; reason: "open" | "pool" | "focus" | "failed" };

/** Phone layout below 1024 px (the same breakpoint as the navigation), desktop from there. */
export function currentContext(): "phone" | "desktop" {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches ? "desktop" : "phone";
}

/**
 * Whether a focus build would plan anything, asked as a dry run (G16: nothing is written or reserved). A learning
 * skill whose loop is done waits for its review (00a M1) and plans nothing, so the map shows its review date
 * instead of a button that can only refuse. Any refusal or network error is "unknown" and the button stays.
 */
export async function previewFocus(body: StartBody): Promise<"empty" | "plannable" | "unknown"> {
  try {
    const response = await fetch("/api/v1/sessions/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, dry_run: true }),
    });
    if (!response.ok) return "unknown";
    const preview = (await response.json()) as { tasks?: unknown };
    if (!Array.isArray(preview.tasks)) return "unknown";
    return preview.tasks.length === 0 ? "empty" : "plannable";
  } catch {
    return "unknown";
  }
}

export async function startSession(body: StartBody): Promise<StartResult> {
  let response: Response;
  try {
    response = await fetch("/api/v1/sessions/build", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (response.ok) {
    const session = (await response.json()) as { id?: unknown };
    if (typeof session.id === "string") return { ok: true, id: session.id };
    // 200 without an id is the builder's empty plan (06 section 7.4): nothing of this skill fits the minutes.
    return { ok: false, reason: body.skill_focus !== undefined ? "focus" : "failed" };
  }
  const problem = (await response.json().catch(() => ({}))) as { code?: unknown };
  if (problem.code === "open_session_exists") return { ok: false, reason: "open" };
  if (problem.code === "item_pool_empty") return { ok: false, reason: "pool" };
  // buildSession accepts skill_focus for a skill on the frontier, in progress or due for review (00a J9); any
  // other skill gets a 400. Say so instead of a generic failure.
  if (problem.code === "validation_failed" && body.skill_focus !== undefined) return { ok: false, reason: "focus" };
  return { ok: false, reason: "failed" };
}
