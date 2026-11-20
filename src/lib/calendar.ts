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

/** The most Interviews the Coming up agenda lists before it narrows its window. */
export const AGENDA_LIMIT = 5;

/** The days the Coming up agenda lists: local YYYY-MM-DD keys, both ends included. */
export type AgendaWindow = {
  /** Completes "Interviews in …" and "Nothing in … yet.", e.g. "November" or "the next week". */
  span: string;
  from: string;
  to: string;
};

const monthOnlyFormat = new Intl.DateTimeFormat(undefined, { month: "long" });

/** The whole month that starts on `start`. */
export function monthWindow(start: Date): AgendaWindow {
  return {
    span: monthOnlyFormat.format(start),
    from: dayKey(start),
    to: dayKey(new Date(start.getFullYear(), start.getMonth() + 1, 0)),
  };
}

/**
 * The widest window that holds no more than `limit` Interviews (BIG-72): this month (past ones
 * included), then the next 2 weeks, the next week and the next 2 days, each starting today. When
 * even the next 2 days hold more, it is still the next 2 days.
 */
export function upcomingWindow(times: string[], now: Date, limit = AGENDA_LIMIT): AgendaWindow {
  const keys = times.map((at) => dayKey(new Date(at)));
  const today = dayKey(now);
  const through = (days: number) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days - 1));
  const windows: AgendaWindow[] = [
    monthWindow(monthStart(now, 0)),
    { span: "the next 2 weeks", from: today, to: through(14) },
    { span: "the next week", from: today, to: through(7) },
    { span: "the next 2 days", from: today, to: through(2) },
  ];
  const fits = (w: AgendaWindow) => keys.filter((k) => k >= w.from && k <= w.to).length <= limit;
  return windows.find(fits) ?? windows[windows.length - 1];
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
