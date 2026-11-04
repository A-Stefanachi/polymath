// Browser-side calls the Today screen makes, all through the public /api/v1 routes (no data access in components).
import type { Context, SessionPreview, SessionStamp } from "./today.ts";

export type Failure = { kind: "open_session" } | { kind: "pool_empty" } | { kind: "rate_limited" } | { kind: "signed_out" } | { kind: "error" };
export type BuildResult = { kind: "ok"; preview: SessionPreview } | Failure;

async function errorCode(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
  return typeof body?.code === "string" ? body.code : null;
}

async function failure(res: Response): Promise<Failure> {
  if (res.status === 401) return { kind: "signed_out" };
  if (res.status === 429) return { kind: "rate_limited" };
  const code = await errorCode(res);
  if (code === "open_session_exists") return { kind: "open_session" };
  if (code === "item_pool_empty") return { kind: "pool_empty" };
  return { kind: "error" };
}

const JSON_HEADERS = { "content-type": "application/json" };

/**
 * A preview that has not answered by then is a failed build (doc 09 section 3.3 error copy, with retry), not an
 * endless "Building your session...". Far above the 800 ms p95 build budget (doc 03 section 7.1), below the 30 s
 * after which the hosting proxy gives up.
 */
export const PREVIEW_TIMEOUT_MS = 10_000;

/**
 * buildSession with dry_run true: plans the session, writes nothing (G16, BL-0191). Rejects when `signal` aborts
 * (the caller moved on); a timeout or a network failure is `{ kind: "error" }`.
 */
export async function previewSession(minutes: number, context: Context, signal: AbortSignal, timeoutMs = PREVIEW_TIMEOUT_MS): Promise<BuildResult> {
  const request = new AbortController();
  const abort = () => request.abort();
  const timer = setTimeout(abort, timeoutMs);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  try {
    const res = await fetch("/api/v1/sessions/build", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ available_minutes: minutes, context, dry_run: true }),
      signal: request.signal,
    });
    if (!res.ok) return await failure(res);
    return { kind: "ok", preview: (await res.json()) as SessionPreview };
  } catch (error) {
    if (signal.aborted) throw error;
    return { kind: "error" };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export type StartResult = { kind: "ok"; id: string } | Failure;

/** Start: buildSession with dry_run false persists a planned session, then startSession makes it active. */
export async function startNow(minutes: number, context: Context): Promise<StartResult> {
  const built = await fetch("/api/v1/sessions/build", {
    method: "POST",
    headers: { ...JSON_HEADERS, "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify({ available_minutes: minutes, context }),
  });
  if (!built.ok) return failure(built);
  const { id } = (await built.json()) as { id: string };
  const started = await fetch(`/api/v1/sessions/${id}/start`, { method: "POST", headers: { "idempotency-key": crypto.randomUUID() } });
  if (!started.ok) return failure(started);
  return { kind: "ok", id };
}

export type TodayData = {
  timezone: string;
  weeklyTarget: number;
  dueNow: number;
  dueMinutes: number;
  sessions: SessionStamp[];
  openSessionId: string | null;
};

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(path).catch(() => null);
  return res?.ok ? ((await res.json()) as T) : null;
}

/** Profile, review queue and recent sessions for the cards under the session card. A missing part degrades to defaults. */
export async function loadToday(): Promise<TodayData> {
  const [profile, queue, sessions] = await Promise.all([
    getJson<{ timezone?: string; weekly_minutes_target?: number }>("/api/v1/profile"),
    getJson<{ due_now?: number; estimated_minutes?: number }>("/api/v1/review-queue"),
    getJson<{ items: (SessionStamp & { id: string })[] }>("/api/v1/sessions?limit=50"),
  ]);
  const items = sessions?.items ?? [];
  return {
    timezone: profile?.timezone ?? "UTC",
    weeklyTarget: profile?.weekly_minutes_target ?? 480,
    dueNow: queue?.due_now ?? 0,
    dueMinutes: queue?.estimated_minutes ?? 0,
    sessions: items,
    openSessionId: items.find((s) => s.status === "planned" || s.status === "active")?.id ?? null,
  };
}

/** Skill titles by key, from the graph route; empty when it cannot be read (the key is then made readable). */
export async function loadTitles(): Promise<Record<string, string>> {
  const graph = await getJson<{ nodes: { key: string; title: string }[] }>("/api/v1/graph");
  return Object.fromEntries((graph?.nodes ?? []).map((n) => [n.key, n.title]));
}
