// "Practise now", "Practise this" and "Practise all due" all build a session through buildSession (doc 09 S14, S17).
export type StartBody = { available_minutes: number; context: "phone" | "desktop"; skill_focus?: string };
export type StartResult = { ok: true; id: string } | { ok: false; reason: "open" | "pool" | "focus" | "failed" };

/** Phone layout below 1024 px (the same breakpoint as the navigation), desktop from there. */
export function currentContext(): "phone" | "desktop" {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches ? "desktop" : "phone";
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
    return typeof session.id === "string" ? { ok: true, id: session.id } : { ok: false, reason: "failed" };
  }
  const problem = (await response.json().catch(() => ({}))) as { code?: unknown };
  if (problem.code === "open_session_exists") return { ok: false, reason: "open" };
  if (problem.code === "item_pool_empty") return { ok: false, reason: "pool" };
  // buildSession accepts skill_focus for a skill on the frontier, in progress or due for review (00a J9); any
  // other skill gets a 400. Say so instead of a generic failure.
  if (problem.code === "validation_failed" && body.skill_focus !== undefined) return { ok: false, reason: "focus" };
  return { ok: false, reason: "failed" };
}
