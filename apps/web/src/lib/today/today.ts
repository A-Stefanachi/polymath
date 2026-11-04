// Pure helpers for the Today screen (doc 09 S06, S07): chip values, reason wording, preview grouping and the
// week strip. No network and no clock (the caller passes `now`), so they are tested directly.
import { preview as p } from "@/copy/strings";

export const CHIP_MINUTES = [5, 15, 30, 60] as const;
export const DEFAULT_MINUTES = 15;
export const CONTEXTS = ["phone", "desktop", "bench"] as const;
export type Context = (typeof CONTEXTS)[number];

export type PreviewTask = {
  position: number;
  task_kind: string;
  skill_key?: string | null;
  est_seconds: number;
  reason?: string | null;
};

export type SessionPreview = { planned_min: number; available_minutes?: number; tasks: PreviewTask[] };

/** Phone-width viewport -> Phone, otherwise Desktop (doc 09 S06 element c). Bench is only ever chosen. */
export function defaultContext(viewportWidth: number): Context {
  return viewportWidth < 768 ? "phone" : "desktop";
}

export function isContext(value: unknown): value is Context {
  return typeof value === "string" && (CONTEXTS as readonly string[]).includes(value);
}

/** Plain-language reason for a task; an internal code never reaches the screen (S07 AC-3). */
export function reasonLabel(reason: string | null | undefined): string {
  return (reason && p.reasons[reason]) || p.otherReason;
}

export function kindLabel(kind: string): string {
  return p.kinds[kind] ?? p.otherKind;
}

export type PreviewGroupKey = "reviews" | "continue" | "new" | "other";
const GROUP_OF: Record<string, PreviewGroupKey> = {
  due_review: "reviews",
  verify_inferred: "reviews",
  continue: "continue",
  applied_gap: "continue",
  same_day_retrieval: "continue",
  frontier: "new",
  new_frontier: "new",
};

export const groupKey = (reason: string | null | undefined): PreviewGroupKey => (reason ? GROUP_OF[reason] : undefined) ?? "other";

export type PreviewGroup = { key: PreviewGroupKey; tasks: PreviewTask[] };

/** Tasks grouped as the sheet shows them, in the order Reviews, Continue, New, Other; empty groups are dropped. */
export function groupPreview(tasks: readonly PreviewTask[]): PreviewGroup[] {
  const order: PreviewGroupKey[] = ["reviews", "continue", "new", "other"];
  return order
    .map((key) => ({ key, tasks: tasks.filter((t) => groupKey(t.reason) === key) }))
    .filter((g) => g.tasks.length > 0);
}

export function countGroups(tasks: readonly PreviewTask[]): { reviews: number; cont: number; fresh: number } {
  const count = (k: PreviewGroupKey) => tasks.filter((t) => groupKey(t.reason) === k).length;
  return { reviews: count("reviews"), cont: count("continue"), fresh: count("new") };
}

/** "elec.dc.voltage-divider" -> "Voltage divider" when the title is not known. */
export function fallbackTitle(skillKey: string): string {
  const last = skillKey.split(".").pop() ?? skillKey;
  const words = last.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** One step shorter or longer on the chip scale (S07 "Make it shorter/longer"); null at the ends. */
export function neighbourMinutes(minutes: number, direction: -1 | 1): number | null {
  const chips: readonly number[] = CHIP_MINUTES;
  const index = chips.indexOf(minutes);
  return index < 0 ? null : (chips[index + direction] ?? null);
}

// ---- week strip -------------------------------------------------------------------------------------------

export type SessionStamp = { status: string; started_at?: string | null; actual_min?: number | null };
export type WeekSummary = { practised: boolean[]; days: number; minutes: number; todayIndex: number };

const ymd = (date: Date, timeZone: string): string => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const dayNumber = (isoDay: string): number => {
  const [y, m, d] = isoDay.split("-").map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
};

/** Index 0..6 of the local weekday, Monday first. */
function mondayIndex(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name);
}

/** Days with a completed session in the current local week (Monday to Sunday) and their minutes. */
export function summariseWeek(sessions: readonly SessionStamp[], now: Date, timeZone: string): WeekSummary {
  const todayIndex = mondayIndex(now, timeZone);
  const mondayNumber = dayNumber(ymd(now, timeZone)) - todayIndex;
  const practised = Array.from({ length: 7 }, () => false);
  let minutes = 0;
  for (const s of sessions) {
    if (s.status !== "completed" || !s.started_at) continue;
    const offset = dayNumber(ymd(new Date(s.started_at), timeZone)) - mondayNumber;
    if (offset < 0 || offset > 6) continue;
    practised[offset] = true;
    minutes += s.actual_min ?? 0;
  }
  return { practised, days: practised.filter(Boolean).length, minutes, todayIndex };
}

/** "Tue 4 Nov" in the learner's zone (doc 09 W1 header). */
export function dateLine(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" }).formatToParts(now);
  const get = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")}`;
}
