"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsClient } from "@/components/use-is-client";
import { Badge, buttonClasses, Skeleton } from "@/components/ui";
import { INTERVIEW_OPTIONS, type DatedInterview } from "@/lib/applications";
import { dayKey, groupByDay, inWindow, monthStart, monthWeeks, monthWindow, upcomingWindow, type CalendarDay } from "@/lib/calendar";

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weekdayLongFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function interviewCount(n: number) {
  return `${n} ${n === 1 ? "Interview" : "Interviews"}`;
}

/**
 * Coming up as a small month grid beside an agenda (BIG-36): every dated Interview of an In
 * Progress Application, with past ones muted.
 * The grid marks days with a dot (muted when all of the day's Interviews are past). The agenda lists
 * one day's Interviews once that day is picked; otherwise another month's Interviews, or for this
 * month the widest upcoming window that holds five (BIG-72).
 * Days and times are the job seeker's own, so the calendar renders only in the browser; the server
 * sends ComingUpCalendarSkeleton, the same layout in skeleton shapes.
 */
export function ComingUpCalendar({ interviews }: { interviews: DatedInterview[] }) {
  const isClient = useIsClient();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const agendaHeadingRef = useRef<HTMLHeadingElement>(null);
  // Set by the day buttons and "Show upcoming", not by month navigation, so focus stays on the arrows.
  const focusAgendaRef = useRef(false);

  useEffect(() => {
    if (focusAgendaRef.current) {
      focusAgendaRef.current = false;
      agendaHeadingRef.current?.focus();
    }
  }, [selected, offset]);

  if (!isClient) return <ComingUpCalendarSkeleton />;

  // eslint-disable-next-line @eslint-react/purity -- today is read on each render on purpose: the calendar renders only in the browser (isClient above), and a stored date would go stale past midnight.
  const now = new Date();
  const todayKey = dayKey(now);
  const start = monthStart(now, offset);
  const weeks = monthWeeks(start);
  const byDay = groupByDay(interviews, (d) => d.interview.at);
  const days = weeks.flat().filter((d) => d.inMonth);
  const selectedDay = days.find((d) => d.key === selected);
  const agendaWindow = offset === 0 ? upcomingWindow(interviews.map((d) => d.interview.at), now) : monthWindow(start);
  // byDay is already in date and time order. A picked day lists all of its Interviews.
  const agendaItems = selectedDay
    ? (byDay.get(selectedDay.key) ?? [])
    : [...byDay.values()].flat().filter((d) => inWindow(d.interview.at, agendaWindow));

  const goTo = (next: number) => {
    setOffset(next);
    setSelected(null);
  };
  const showAgenda = (key: string | null) => {
    focusAgendaRef.current = true;
    setSelected(key);
  };
  const showUpcoming = () => {
    focusAgendaRef.current = true;
    goTo(0);
  };

  return (
    <div className={calendarCardClasses}>
      <div className={gridColumnClasses}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="calendar-month" aria-live="polite" className="m-0 text-base font-medium text-heading">
            {monthFormat.format(start)}
          </h3>
          <div className="flex items-center gap-1">
            <button type="button" className={buttonClasses("tertiary", "sm")} onClick={() => goTo(offset - 1)}>
              <ChevronLeft className="size-4" aria-hidden />
              <span className="sr-only">Previous month</span>
            </button>
            <button type="button" className={buttonClasses("tertiary", "sm")} onClick={() => goTo(0)}>
              Today
            </button>
            <button type="button" className={buttonClasses("tertiary", "sm")} onClick={() => goTo(offset + 1)}>
              <ChevronRight className="size-4" aria-hidden />
              <span className="sr-only">Next month</span>
            </button>
          </div>
        </div>

        <table aria-labelledby="calendar-month" className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {weeks[0].map((d) => (
                <th key={d.key} scope="col" className="pb-1 text-xs font-medium text-body">
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
                    count={day.inMonth ? (byDay.get(day.key)?.length ?? 0) : 0}
                    allPast={(byDay.get(day.key) ?? []).every((d) => new Date(d.interview.at) < now)}
                    isToday={day.key === todayKey}
                    isSelected={day.key === selected}
                    onSelect={() => showAgenda(day.key === selected ? null : day.key)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Wide screens: the agenda is as tall as the grid and scrolls past that. */}
      <section aria-labelledby="calendar-agenda" className="flex min-w-0 flex-1 flex-col md:relative">
        <div className="flex flex-col md:absolute md:inset-0">
          <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
            <h3
              id="calendar-agenda"
              ref={agendaHeadingRef}
              tabIndex={-1}
              className="m-0 text-base font-medium text-heading focus-visible:outline-none"
            >
              {selectedDay ? dayFormat.format(selectedDay.date) : `Interviews in ${agendaWindow.span}`}
            </h3>
            {selectedDay && (
              <button type="button" className={buttonClasses("tertiary", "sm")} onClick={showUpcoming}>
                Show upcoming
              </button>
            )}
          </div>

          {agendaItems.length === 0 ? (
            <p className="m-0 text-sm text-body">
              {interviews.length === 0
                ? "Add a dated Interview to an Application and it shows up here."
                : `Nothing in ${agendaWindow.span} yet.`}
            </p>
          ) : (
            <div
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be focusable to scroll by keyboard (axe: scrollable-region-focusable).
              tabIndex={0}
              role="region"
              aria-labelledby="calendar-agenda"
              className="min-h-0 flex-1 overflow-y-auto rounded-control focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {agendaItems.map((d) => (
                  <AgendaItem key={d.interview.id} item={d} past={new Date(d.interview.at) < now} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Coming up while it waits for data or for the browser: the month grid (five weeks, the usual
 * month) and five agenda items, sized like the real ones.
 */
export function ComingUpCalendarSkeleton() {
  return (
    <div aria-hidden className={calendarCardClasses}>
      <div className={gridColumnClasses}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-10 w-11" />
            <Skeleton className="h-10 w-[4.25rem]" />
            <Skeleton className="h-10 w-11" />
          </div>
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex h-5 justify-center pb-1">
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="flex h-12 items-center justify-center">
              <Skeleton className="size-7 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex min-h-8 items-center">
          <Skeleton className="h-5 w-48" />
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className={agendaItemClasses}>
              <span className="flex h-9 w-10 shrink-0 flex-col items-center justify-center gap-1">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-4 w-5" />
              </span>
              <Skeleton className="h-4 max-w-40 flex-1" />
              <Skeleton className="h-4 w-14 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Shared by the calendar and its skeleton, so the two can't drift apart.
const calendarCardClasses = "card flex flex-col gap-6 p-4 sm:p-6 md:flex-row";
// As tall as a six-week month whatever the month, so five agenda items always fit (BIG-72).
const gridColumnClasses = "md:min-h-[22.5rem] md:w-80 md:shrink-0";
const agendaItemClasses = "flex items-center gap-3 rounded-control bg-surface px-3 py-2 text-sm";

function DayCell({
  day,
  count,
  allPast,
  isToday,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  count: number;
  allPast: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  if (!day.inMonth) return <td />;

  const number = (
    <span
      className={`inline-grid size-7 place-items-center rounded-full text-xs font-medium ${
        isToday ? "bg-brand text-on-brand" : "text-heading"
      }`}
    >
      {day.date.getDate()}
    </span>
  );
  const dot = <span className={`size-1.5 rounded-full ${count > 0 ? (allPast ? "bg-line-medium" : "bg-brand") : ""}`} aria-hidden />;

  return (
    <td aria-current={isToday ? "date" : undefined} className="p-0.5 text-center">
      {count === 0 ? (
        <div className="flex h-11 flex-col items-center justify-center gap-0.5">
          {number}
          {dot}
        </div>
      ) : (
        <button
          type="button"
          aria-pressed={isSelected}
          aria-label={`${dayFormat.format(day.date)}, ${interviewCount(count)}`}
          className={`flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-control hover:bg-surface ${
            isSelected ? "bg-surface ring-1 ring-line-brand-subtle" : ""
          }`}
          onClick={onSelect}
        >
          {number}
          {dot}
        </button>
      )}
    </td>
  );
}

function AgendaItem({ item: { application, interview }, past }: { item: DatedInterview; past: boolean }) {
  const at = new Date(interview.at);
  const kind = INTERVIEW_OPTIONS[interview.kind];
  const tone = past ? "gray" : kind.tone;
  return (
    <li className={agendaItemClasses}>
      <time dateTime={interview.at} className="flex w-10 shrink-0 flex-col items-center leading-tight">
        <span className="text-xs text-body">{weekdayFormat.format(at)}</span>
        <span className={`text-base font-medium ${past ? "text-body" : "text-heading"}`}>{at.getDate()}</span>
      </time>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`truncate font-medium ${past ? "text-body" : "text-heading"}`}>{application.company}</span>
        <Badge tone={tone}>{kind.label}</Badge>
      </div>
      <span className="shrink-0 text-body">{timeFormat.format(at)}</span>
    </li>
  );
}
