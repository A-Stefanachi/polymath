// Pure helpers of the session runner (doc 09 S08, 6.1): answer parsing, timing and the polling schedule.
// No network and no clock: callers pass `now`, so these are tested directly.

const NUMBER_AND_UNIT = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*(\S*)\s*$/;

/** "2.5 V" -> { value: 2.5, unit: "V" }; null when the text is not a number with an optional unit. */
export function parseNumericAnswer(text: string): { value: number; unit?: string } | null {
  const match = NUMBER_AND_UNIT.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2] ? { value, unit: match[2] } : { value };
}

/** Idle gaps longer than this do not count as working time (doc 09 S08 AC 1). */
export const IDLE_CAP_MS = 45_000;

/**
 * Working time of one task. `latencyMs` is wall-clock time minus paused time; `activeMs` additionally caps every
 * gap between interactions at 45 s. Both exclude paused time (S08 AC 1).
 */
export class TaskTimer {
  private pausedMs = 0;
  private pausedAt: number | null = null;
  private activeMs = 0;
  private lastTouch: number;

  constructor(private readonly startedAt: number) {
    this.lastTouch = startedAt;
  }

  touch(now: number): void {
    if (this.pausedAt !== null) return;
    this.activeMs += Math.min(Math.max(now - this.lastTouch, 0), IDLE_CAP_MS);
    this.lastTouch = now;
  }

  pause(now: number): void {
    if (this.pausedAt !== null) return;
    this.touch(now);
    this.pausedAt = now;
  }

  resume(now: number): void {
    if (this.pausedAt === null) return;
    this.pausedMs += now - this.pausedAt;
    this.pausedAt = null;
    this.lastTouch = now;
  }

  latency(now: number): number {
    const paused = this.pausedMs + (this.pausedAt === null ? 0 : now - this.pausedAt);
    return Math.max(Math.round(now - this.startedAt - paused), 0);
  }

  active(now: number): number {
    this.touch(now);
    return Math.round(this.activeMs);
  }
}

/** getAttempt polling: every 1 s for the first 5 s, then every 3 s, up to 90 s (getAttempt description). */
export function pollDelayMs(elapsedMs: number): number | null {
  if (elapsedMs >= 90_000) return null;
  return elapsedMs < 5_000 ? 1_000 : 3_000;
}

/** A calendar-day phrase for the summary: "today", "tomorrow", "in N days". Day boundaries use the given zone. */
export function dueWhen(dueIso: string, now: Date, timeZone: string): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const toNumber = (s: string) => Date.parse(`${s}T00:00:00Z`);
  const days = Math.round((toNumber(day(new Date(dueIso))) - toNumber(day(now))) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
