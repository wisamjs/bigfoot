// Month-grid arithmetic for the Interviews calendar. Every function works in the time zone of the
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

/** The week, Monday first, that holds `date`, any day of it can be picked (the phone's week row, BIG-195). */
export function weekOf(date: Date): CalendarDay[] {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return { date: day, key: dayKey(day), inMonth: true };
  });
}

/** The most Interviews the Interviews agenda lists before it narrows its window. */
export const AGENDA_LIMIT = 5;

/** The days the Interviews agenda lists: local YYYY-MM-DD keys, both ends included. */
export type AgendaWindow = {
  /** Completes "Interviews in …" and "Nothing in … yet.", e.g. "November" or "the next week". */
  span: string;
  from: string;
  to: string;
  /** For the narrowed windows, the ISO moment they start (BIG-93): earlier Interviews, completed ones, are left out. */
  since?: string;
};

/** Whether an Interview at `at` is in `window`. */
export function inWindow(at: string, window: AgendaWindow): boolean {
  const key = dayKey(new Date(at));
  if (key < window.from || key > window.to) return false;
  return window.since === undefined || new Date(at) >= new Date(window.since);
}

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
 * included), then the next 2 weeks, the next week and the next 2 days, each starting now, so
 * Interviews earlier today are left out (BIG-93). When even the next 2 days hold more, it is still
 * the next 2 days.
 */
export function upcomingWindow(times: string[], now: Date, limit = AGENDA_LIMIT): AgendaWindow {
  const today = dayKey(now);
  const through = (days: number) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days - 1));
  const since = now.toISOString();
  const windows: AgendaWindow[] = [
    monthWindow(monthStart(now, 0)),
    { span: "the next 2 weeks", from: today, to: through(14), since },
    { span: "the next week", from: today, to: through(7), since },
    { span: "the next 2 days", from: today, to: through(2), since },
  ];
  const fits = (w: AgendaWindow) => times.filter((at) => inWindow(at, w)).length <= limit;
  return windows.find(fits) ?? windows[windows.length - 1];
}

/** Items grouped by the local day of their timestamp (`at`), each day in time order. */
export function groupByDay<T>(items: T[], at: (item: T) => string): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const item of items.toSorted((a, b) => at(a).localeCompare(at(b)))) {
    const key = dayKey(new Date(at(item)));
    const day = days.get(key);
    if (day) day.push(item);
    else days.set(key, [item]);
  }
  return days;
}

/** A month as the dashboard's `month` search param, YYYY-MM. */
export function monthParam(start: Date): string {
  return dayKey(start).slice(0, 7);
}

/**
 * How many months `param` (YYYY-MM) is from the month `today` is in: the calendar's offset. A
 * missing or malformed one is this month (0).
 */
export function monthOffset(param: string | null, today: Date): number {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(param ?? "");
  if (!match) return 0;
  return (Number(match[1]) - today.getFullYear()) * 12 + (Number(match[2]) - 1 - today.getMonth());
}
