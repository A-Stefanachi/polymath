// View model of the review inbox (S17, doc 09): rows are the skills due by the end of today (local), and a
// separate list holds the rest of the next seven days. Retrievability is never shown (AC 3), so it is not read.
import type { components } from "@polymath/shared-types";
import { endOfLocalDay } from "@/lib/views/skill-map";

type Queue = components["schemas"]["ReviewQueue"];

export type ReviewRow = { skillKey: string; due: Date; daysOverdue: number };

export type ReviewGroups = { dueNow: ReviewRow[]; upcoming: ReviewRow[]; today: number; overdue: number };

function startOfLocalDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_MS = 86_400_000;

export function groupReviewQueue(queue: Queue, now: Date): ReviewGroups {
  const start = startOfLocalDay(now).getTime();
  const end = endOfLocalDay(now).getTime();
  const rows: ReviewRow[] = queue.items.map((i) => {
    const due = new Date(i.due);
    return { skillKey: i.skill_key, due, daysOverdue: due.getTime() < start ? Math.ceil((start - due.getTime()) / DAY_MS) : 0 };
  });
  const dueNow = rows.filter((r) => r.due.getTime() <= end);
  const upcoming = rows.filter((r) => r.due.getTime() > end);
  const overdue = dueNow.filter((r) => r.daysOverdue > 0).length;
  return { dueNow, upcoming, today: dueNow.length - overdue, overdue };
}
