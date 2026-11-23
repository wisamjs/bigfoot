"use client";

import { useIsClient } from "@/hooks/use-is-client";
import { useToday } from "@/hooks/use-today";
import { calendarDaysBetween, nextInterview, parseDay, relativeDays, type Application } from "@/lib/applications";

const whenFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const sinceFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** The next Interview's date, or "Waiting since" the last one (or the applied date). */
export function ApplicationWhen({ app }: { app: Application }) {
  // The server can't know the viewer's time zone, so this renders after hydration.
  const isClient = useIsClient();
  if (!isClient) return <span className="block h-5" />;
  const next = nextInterview(app);
  if (next?.at) return <time dateTime={next.at}>{whenFormat.format(new Date(next.at))}</time>;
  if (app.is_waiting && app.waiting_since) {
    // A date-only value (YYYY-MM-DD) is the applied date: format it as that calendar day, not UTC midnight.
    const since = app.waiting_since.length === 10 ? new Date(`${app.waiting_since}T00:00`) : new Date(app.waiting_since);
    return <span className="text-body">Waiting since {sinceFormat.format(since)}</span>;
  }
  return <span className="text-body-subtle">—</span>;
}

// A card leaves out the year to keep each Interview short; its Interviews are rarely a year apart.
const shortWhenFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** One Interview's date and time with the year, as its own page's heading shows it. */
export function InterviewWhenLong({ at }: { at: string }) {
  const isClient = useIsClient();
  // The server can't know the viewer's time zone, so the date renders after hydration.
  if (!isClient) return <span className="inline-block h-5 w-32 align-middle" />;
  return <time dateTime={at}>{whenFormat.format(new Date(at))}</time>;
}

/** One Interview's date and time, in the viewer's time zone, without the year. */
export function InterviewWhen({ at }: { at: string }) {
  const isClient = useIsClient();
  if (!isClient) return <span className="block h-5" />;
  return (
    <time dateTime={at} className="whitespace-nowrap">
      {shortWhenFormat.format(new Date(at))}
    </time>
  );
}

const dayFormats = {
  short: new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }),
  long: new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }),
};
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * An Interview's day and time as the Application page shows it (BIG-174): "Wed, Dec 2 · 1:30 PM",
 * or with `weekday="long"`, "Wednesday, Dec 2 · 1:30 PM".
 */
export function InterviewDayTime({ at, weekday = "short" }: { at: string; weekday?: "short" | "long" }) {
  const isClient = useIsClient();
  if (!isClient) return <span className="inline-block h-5 w-32 align-middle" />;
  const date = new Date(at);
  return (
    <time dateTime={at}>
      {dayFormats[weekday].format(date)} · {timeFormat.format(date)}
    </time>
  );
}

/**
 * How far a date is from today, in the viewer's time zone: "in 2 days", "today", "26 days ago".
 * A date-only value (YYYY-MM-DD) counts from that calendar day. Nothing until hydration.
 */
export function DaysFromToday({ date }: { date: string }) {
  const today = useToday();
  if (!today) return null;
  return <>{relativeDays(calendarDaysBetween(today, parseDay(date)))}</>;
}

const readyDayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });

/**
 * "Get ready for Wednesday" when the Interview is within the next 7 days, otherwise "Get ready for
 * Dec 2" (BIG-180). Just "Get ready" until hydration, which can't know the viewer's time zone.
 */
export function GetReadyFor({ at }: { at: string }) {
  const today = useToday();
  if (!today) return <>Get ready</>;
  const date = new Date(at);
  const days = calendarDaysBetween(today, date);
  const day = days >= 0 && days < 7 ? weekdayFormat.format(date) : readyDayFormat.format(date);
  return <>Get ready for {day}</>;
}
