"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { capitalize } from "@/features/applications/when-text";
import { dayDotClasses } from "@/features/journey/journey-text";
import { calendarDaysBetween, relativeDays } from "@/lib/applications";
import { dayKey, groupByDay, monthStart, monthWeeks, type CalendarDay } from "@/lib/calendar";
import type { DatedJourneyInterview } from "@/lib/journey";

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weekdayLongFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const shortMonthFormat = new Intl.DateTimeFormat(undefined, { month: "short" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * The Journey's Interviews card (BIG-197), read-only: the month grid with a dot under each day that
 * has Interviews (the brand colour while any is ahead, grey once all are done) and today outlined,
 * then the upcoming Interviews after the next one, headed "After that" at every width so it doesn't
 * read as the whole list (BIG-208). On a phone the list comes first, and Show month opens the grid. Nothing here links anywhere: a Viewer can't open an Interview.
 */
export function JourneyCalendar({
  interviews,
  upcoming,
  now,
}: {
  /** Every Interview of the Journey, for the grid. */
  interviews: DatedJourneyInterview[];
  /** Upcoming Interviews after the next one, soonest first. */
  upcoming: DatedJourneyInterview[];
  now: Date;
}) {
  const [offset, setOffset] = useState(0);
  const [showMonth, setShowMonth] = useState(false);
  const start = monthStart(now, offset);
  const byDay = groupByDay(interviews, (d) => d.interview.at);

  return (
    <section aria-labelledby="journey-interviews-title" className="card flex min-w-0 flex-col border-line-card">
      <div className="flex items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <h2 id="journey-interviews-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
          Interviews
        </h2>
        <button
          type="button"
          aria-expanded={showMonth}
          aria-controls="journey-month"
          onClick={() => setShowMonth(!showMonth)}
          className="touch-target rounded-control font-medium text-fg-brand underline-offset-4 hover:text-fg-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:hidden"
        >
          {showMonth ? "Hide month" : "Show month"}
        </button>
      </div>

      <div id="journey-month" className={`flex flex-col gap-3 px-4 pb-4 sm:px-6 ${showMonth ? "" : "max-sm:hidden"}`}>
        <div className="flex items-center justify-between gap-3">
          <button type="button" className={arrowClasses} onClick={() => setOffset(offset - 1)}>
            <ChevronLeft className="size-[18px]" aria-hidden />
            <span className="sr-only">Previous month</span>
          </button>
          <h3 id="journey-month-name" aria-live="polite" className="m-0 text-base font-semibold text-heading">
            {monthFormat.format(start)}
          </h3>
          <button type="button" className={arrowClasses} onClick={() => setOffset(offset + 1)}>
            <ChevronRight className="size-[18px]" aria-hidden />
            <span className="sr-only">Next month</span>
          </button>
        </div>
        <MonthGrid start={start} byDay={byDay} now={now} />
        <Legend />
      </div>

      <UpcomingList upcoming={upcoming} now={now} />
    </section>
  );
}

function MonthGrid({ start, byDay, now }: { start: Date; byDay: Map<string, DatedJourneyInterview[]>; now: Date }) {
  const weeks = monthWeeks(start);
  const todayKey = dayKey(now);
  return (
    <table aria-labelledby="journey-month-name" className="w-full table-fixed border-collapse">
      <thead>
        <tr>
          {weeks[0].map((d) => (
            <th key={d.key} scope="col" className="pb-1 text-xs font-semibold text-body">
              <abbr title={weekdayLongFormat.format(d.date)} className="no-underline">
                {weekdayFormat.format(d.date)}
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0].key}>
            {week.map((day) => (
              <DayCell
                key={day.key}
                day={day}
                items={day.inMonth ? (byDay.get(day.key) ?? []) : []}
                isToday={day.key === todayKey}
                now={now}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A day's tile: tinted when it has Interviews, outlined today, quieter for the neighbouring months. */
function tileClasses(isToday: boolean, has: boolean, inMonth: boolean) {
  const border = isToday ? "border-line-brand font-bold" : "border-transparent";
  const fill = has ? "bg-card-strong font-semibold" : "";
  const text = inMonth ? "text-heading" : "font-normal text-body";
  return `flex h-full flex-col items-center justify-center gap-0.5 rounded-control border text-sm ${border} ${fill} ${text}`;
}

/** A day of the grid: its date, a dot when it has Interviews, outlined today. Not a control: nothing opens. */
function DayCell({ day, items, isToday, now }: { day: CalendarDay; items: DatedJourneyInterview[]; isToday: boolean; now: Date }) {
  const has = items.length > 0;
  return (
    <td aria-current={isToday ? "date" : undefined} className="h-11 p-0.5">
      {/* The neighbouring months' days fill out the weeks: quieter, and skipped by screen readers. */}
      <span
        aria-hidden={!day.inMonth || undefined}
        className={tileClasses(isToday, has, day.inMonth)}
      >
        <span aria-hidden={has || undefined}>{day.date.getDate()}</span>
        {has && (
          <span className="sr-only">
            {dayFormat.format(day.date)}, {items.length} {items.length === 1 ? "Interview" : "Interviews"}
          </span>
        )}
        <span aria-hidden className={`size-1.5 rounded-full ${dayDotClasses(items, now)}`} />
      </span>
    </td>
  );
}

function Legend() {
  return (
    <p aria-hidden className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-body">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-brand" /> Coming up
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-body-subtle" /> Done
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded-sm border border-line-brand" /> Today
      </span>
    </p>
  );
}

/** "After that": each upcoming Interview after the next, with how far off it is. */
function UpcomingList({ upcoming, now }: { upcoming: DatedJourneyInterview[]; now: Date }) {
  return (
    <section aria-labelledby="journey-after-title" className="border-t border-line max-sm:border-t-0">
      <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-4 max-sm:pt-0 sm:px-6">
        <h3 id="journey-after-title" className="m-0 text-sm font-semibold text-heading">
          After that
        </h3>
        {upcoming.length > 0 && (
          <span className="text-[13px] text-body">
            {upcoming.length} more {upcoming.length === 1 ? "Interview" : "Interviews"}
          </span>
        )}
      </div>
      {upcoming.length === 0 ? (
        <p className="m-0 px-4 pb-5 text-sm text-body sm:px-6">Nothing else booked yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 px-1 pb-3 sm:px-3">
          {upcoming.map((d) => (
            <UpcomingItem key={`${d.interview.at}-${d.application.company}-${d.interview.title}`} item={d} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function UpcomingItem({ item: { application, interview }, now }: { item: DatedJourneyInterview; now: Date }) {
  const at = new Date(interview.at);
  const relative = relativeDays(calendarDaysBetween(now, at));
  return (
    <li className="flex items-center gap-3.5 rounded-control px-3 py-2.5">
      <time
        dateTime={interview.at}
        className="flex w-12 flex-none flex-col items-center rounded-control border border-line-card py-1.5 text-heading"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.06em]">{shortMonthFormat.format(at)}</span>
        <span className="text-xl font-bold leading-[1.1]">{at.getDate()}</span>
      </time>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="break-words font-semibold text-heading">{interview.title}</span>
        <span className="break-words text-sm text-body">{application.company}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-px whitespace-nowrap text-sm text-body">
        <span className="text-heading">
          {capitalize(relative)}
        </span>
        <span>{timeFormat.format(at)}</span>
      </span>
    </li>
  );
}

// The month arrows: ghost buttons, as on the dashboard's calendar.
const arrowClasses =
  "grid size-10 cursor-pointer place-items-center rounded-control text-heading transition-colors hover:bg-card-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
