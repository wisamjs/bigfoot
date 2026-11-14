// Month-grid arithmetic for the Coming up calendar. Every function works in the time zone of the
// machine it runs on, so call them in the browser: an Interview belongs to the job seeker's day.

export type CalendarDay = {
  /** Local midnight. */
  date: Date;
  /** Local YYYY-MM-DD. */
  key: string;
  /** False for the days that pad the first and last weeks. */
  inMonth: boolean;
};

/** The local calendar day of a moment, as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The first day of the month `offset` months from the one `today` is in. */
export function monthStart(today: Date, offset: number): Date {
  return new Date(today.getFullYear(), today.getMonth() + offset, 1);
}

/** The weeks of a month, Monday first, padded with the neighbouring months' days. */
export function monthWeeks(start: Date): CalendarDay[][] {
  const year = start.getFullYear();
  const month = start.getMonth();
  const lead = (start.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells; i++) {
    const date = new Date(year, month, 1 - lead + i);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ date, key: dayKey(date), inMonth: date.getMonth() === month });
  }
  return weeks;
}

/** Items grouped by the local day of their timestamp (`at`), each day in time order. */
export function groupByDay<T>(items: T[], at: (item: T) => string): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => at(a).localeCompare(at(b)))) {
    const key = dayKey(new Date(at(item)));
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return days;
}
