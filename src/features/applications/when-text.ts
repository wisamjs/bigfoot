import { calendarDaysBetween, relativeDays } from "@/lib/applications";

// How an Interview's day and time are written, as plain functions so each choice has a unit test
// (when-text.test.ts). The components that show them only add hydration and markup.

/** "in 2 days" → "In 2 days": text that starts a line or follows a " · ". */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * How near a day `days` from today is, which picks how its time is written: `soon` today, tomorrow
 * or already past; `week` within the next 7 days, by weekday; `later` by date.
 */
export type Nearness = "soon" | "week" | "later";

export function nearness(days: number): Nearness {
  if (days <= 1) return "soon";
  return days < 7 ? "week" : "later";
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekdayTimeFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
const dayTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * When the next Interview is, as an Applications row shows it: "Tomorrow · 2:00 PM", "In 2 days ·
 * Wed 11:00 AM", "In 11 days · Fri, Dec 4, 9:30 AM". `short`, for a phone's one line: "tomorrow
 * 2:00 PM", "in 2 days". `soon` (today or tomorrow) shows it in the brand colour.
 */
export function nextWhen(at: Date, today: Date, short = false): { text: string; soon: boolean } {
  const days = calendarDaysBetween(today, at);
  const near = nearness(days);
  const soon = near === "soon";
  const relative = relativeDays(days);
  if (short) return { text: soon ? `${relative} ${timeFormat.format(at)}` : relative, soon };
  const format = { soon: timeFormat, week: weekdayTimeFormat, later: dayTimeFormat }[near];
  return { text: `${capitalize(relative)} · ${format.format(at)}`, soon };
}

/** Whether "Get ready for …" names the Interview's weekday (within the next 7 days) rather than its date (BIG-180). */
export function readyByWeekday(at: Date, today: Date): boolean {
  const days = calendarDaysBetween(today, at);
  return days >= 0 && days < 7;
}
