// Date words for the list screens. The map and review screens use the browser's time zone (they render only
// after loading in the browser); the progress screen passes the profile's time zone.
export function formatDay(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", ...(timeZone ? { timeZone } : {}) }).format(date);
}

/** A calendar date such as "2026-10-26" (no time zone involved) as "26 Oct". */
export function formatDate(isoDate: string): string {
  return formatDay(new Date(`${isoDate}T00:00:00Z`), "UTC");
}
