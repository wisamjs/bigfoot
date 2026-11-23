"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { rememberDashboardView } from "@/features/shell/dashboard-link";
import { SleepingBigfoot } from "@/features/shell/illustrations";
import { interviewHref } from "@/features/applications/routes";
import { useIsClient } from "@/hooks/use-is-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { INTERVIEW_TONE } from "@/features/applications/status-tone";
import { INTERVIEW_OPTIONS, type DatedInterview } from "@/lib/applications";
import {
  dayKey,
  groupByDay,
  inWindow,
  monthOffset,
  monthParam,
  monthStart,
  monthWeeks,
  monthWindow,
  upcomingWindow,
  type CalendarDay,
} from "@/lib/calendar";

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
// On a phone the heading shares a row with three 44px buttons, so it is short ("Nov 2026") and never wraps.
const monthShortFormat = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weekdayLongFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function interviewCount(n: number) {
  return `${n} ${n === 1 ? "Interview" : "Interviews"}`;
}

/** The dashboard's search params for the calendar's month (`2026-12`) and picked day (`2026-12-04`). */
const MONTH_PARAM = "month";
const DAY_PARAM = "day";

/** The month and day in the URL as a search string, "" for this month with no day picked. */
function viewSearch(params: URLSearchParams): string {
  const view = new URLSearchParams();
  for (const name of [MONTH_PARAM, DAY_PARAM]) {
    const value = params.get(name);
    if (value) view.set(name, value);
  }
  const search = view.toString();
  return search ? `?${search}` : "";
}

/**
 * The calendar's month and picked day, kept in the dashboard's URL so Back from an Interview page
 * and a shared link show the same view. Changes replace the history entry rather than add one.
 */
function useCalendarView() {
  const params = useSearchParams();
  const search = viewSearch(new URLSearchParams(params.toString()));

  // "← Dashboard" on the other pages goes back to this view.
  useEffect(() => rememberDashboardView(search), [search]);

  function setView(start: Date | null, day: string | null) {
    const next = new URLSearchParams(window.location.search);
    if (start) next.set(MONTH_PARAM, monthParam(start));
    else next.delete(MONTH_PARAM);
    if (day) next.set(DAY_PARAM, day);
    else next.delete(DAY_PARAM);
    const query = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  return { month: params.get(MONTH_PARAM), selected: params.get(DAY_PARAM), setView };
}

/**
 * The Interviews calendar: a small month grid beside an agenda (BIG-36): every dated Interview of an In
 * Progress Application, with past ones muted.
 * The grid marks days with a dot (muted when all of the day's Interviews are past). The agenda lists
 * one day's Interviews once that day is picked; otherwise another month's Interviews, or for this
 * month the widest upcoming window that holds five (BIG-72).
 * Days and times are the job seeker's own, so the calendar renders only in the browser; the server
 * sends InterviewCalendarSkeleton, the same layout in skeleton shapes.
 */
export function InterviewCalendar({ interviews }: { interviews: DatedInterview[] }) {
  const isClient = useIsClient();
  const { month, selected, setView } = useCalendarView();
  // Below `md` the month grid starts closed so the Interviews list and the Applications come first.
  const [monthOpen, setMonthOpen] = useState(false);
  const agendaHeadingRef = useRef<HTMLHeadingElement>(null);
  // Set by the day buttons and "Show upcoming", not by month navigation, so focus stays on the arrows.
  const focusAgendaRef = useRef(false);

  useEffect(() => {
    if (focusAgendaRef.current) {
      focusAgendaRef.current = false;
      agendaHeadingRef.current?.focus();
    }
  }, [selected, month]);

  if (!isClient) return <InterviewCalendarSkeleton />;

  // eslint-disable-next-line @eslint-react/purity -- today is read on each render on purpose: the calendar renders only in the browser (isClient above), and a stored date would go stale past midnight.
  const now = new Date();
  const todayKey = dayKey(now);
  const offset = monthOffset(month, now);
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

  // This month is the default view, so it stays out of the URL.
  const goTo = (next: number) => setView(next === 0 ? null : monthStart(now, next), null);
  const showAgenda = (key: string | null) => {
    focusAgendaRef.current = true;
    setView(offset === 0 ? null : start, key);
  };
  const showUpcoming = () => {
    focusAgendaRef.current = true;
    goTo(0);
  };

  return (
    <div className={calendarCardClasses}>
      <Button
        variant="secondary"
        size="sm"
        className="md:hidden"
        aria-expanded={monthOpen}
        aria-controls="calendar-month-grid"
        onClick={() => setMonthOpen(!monthOpen)}
      >
        <CalendarDays className="size-4" aria-hidden />
        {monthOpen ? "Hide calendar" : "Show calendar"}
      </Button>
      <div id="calendar-month-grid" className={`${gridColumnClasses} ${monthOpen ? "" : "max-md:hidden"}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="calendar-month" aria-live="polite" className="m-0 whitespace-nowrap text-base font-medium text-heading">
            <span className="md:hidden">{monthShortFormat.format(start)}</span>
            <span className="max-md:hidden">{monthFormat.format(start)}</span>
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="tertiary" size="sm" onClick={() => goTo(offset - 1)}>
              <ChevronLeft className="size-4" aria-hidden />
              <span className="sr-only">Previous month</span>
            </Button>
            <Button variant="tertiary" size="sm" onClick={() => goTo(0)}>
              Today
            </Button>
            <Button variant="tertiary" size="sm" onClick={() => goTo(offset + 1)}>
              <ChevronRight className="size-4" aria-hidden />
              <span className="sr-only">Next month</span>
            </Button>
          </div>
        </div>

        <MonthGrid
          weeks={weeks}
          byDay={byDay}
          now={now}
          todayKey={todayKey}
          selected={selected}
          onSelect={(key) => showAgenda(key === selected ? null : key)}
        />
      </div>

      <Agenda
        selectedDay={selectedDay}
        agendaWindow={agendaWindow}
        items={agendaItems}
        hasInterviews={interviews.length > 0}
        isThisMonth={offset === 0}
        now={now}
        headingRef={agendaHeadingRef}
        onShowUpcoming={showUpcoming}
      />
    </div>
  );
}

type DayInterviews = Map<string, DatedInterview[]>;

function MonthGrid({
  weeks,
  byDay,
  now,
  todayKey,
  selected,
  onSelect,
}: {
  weeks: CalendarDay[][];
  byDay: DayInterviews;
  now: Date;
  todayKey: string;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
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
                onSelect={() => onSelect(day.key)}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The agenda beside the grid: a heading, then the Interviews, or why there are none. */
function Agenda({
  selectedDay,
  agendaWindow,
  items,
  hasInterviews,
  isThisMonth,
  now,
  headingRef,
  onShowUpcoming,
}: {
  selectedDay: CalendarDay | undefined;
  agendaWindow: { span: string };
  items: DatedInterview[];
  hasInterviews: boolean;
  isThisMonth: boolean;
  now: Date;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onShowUpcoming: () => void;
}) {
  return (
    // Wide screens: the agenda is as tall as the grid and scrolls past that. A div, not a
    // section: the scrolling list below is the region its heading names.
    <div className="flex min-w-0 flex-1 flex-col md:relative">
      <div className="flex flex-col md:absolute md:inset-0">
        <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
          <h3
            id="calendar-agenda"
            ref={headingRef}
            tabIndex={-1}
            className="m-0 text-base font-medium text-heading focus-visible:outline-none"
          >
            {selectedDay ? dayFormat.format(selectedDay.date) : `Interviews in ${agendaWindow.span}`}
          </h3>
          {selectedDay && (
            <Button variant="tertiary" size="sm" onClick={onShowUpcoming}>
              Show upcoming
            </Button>
          )}
        </div>
        <AgendaBody
          items={items}
          span={agendaWindow.span}
          hasInterviews={hasInterviews}
          isThisMonth={isThisMonth}
          now={now}
        />
      </div>
    </div>
  );
}

function AgendaBody({
  items,
  span,
  hasInterviews,
  isThisMonth,
  now,
}: {
  items: DatedInterview[];
  span: string;
  hasInterviews: boolean;
  isThisMonth: boolean;
  now: Date;
}) {
  if (items.length === 0 && isThisMonth) return <NothingScheduled />;
  if (items.length === 0) {
    return (
      <p className="m-0 text-sm text-body">
        {hasInterviews ? `Nothing in ${span} yet.` : "Add a dated Interview to an Application and it shows up here."}
      </p>
    );
  }
  return (
    <section
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be focusable to scroll by keyboard (axe: scrollable-region-focusable).
      tabIndex={0}
      aria-labelledby="calendar-agenda"
      className="min-h-0 flex-1 overflow-y-auto rounded-control focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((d) => (
          <AgendaItem key={d.interview.id} item={d} past={new Date(d.interview.at) < now} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The calendar while it waits for data or for the browser: the month grid (five weeks, the usual
 * month) and five agenda items, sized like the real ones.
 */
export function InterviewCalendarSkeleton() {
  return (
    <div aria-hidden className={calendarCardClasses}>
      <Skeleton className="h-10 w-full md:hidden" />
      <div className={`${gridColumnClasses} max-md:hidden`}>
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
            <li key={i} className={`${agendaItemClasses} border border-transparent`}>
              <span className="flex h-9 w-10 shrink-0 flex-col items-center justify-center gap-1">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-4 w-5" />
              </span>
              <Skeleton className="h-4 max-w-40 flex-1" />
              <Skeleton className="h-4 w-14 shrink-0" />
              <span className="size-4 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Shared by the calendar and its skeleton, so the two can't drift apart.
const calendarCardClasses = "card flex flex-col gap-4 p-3 sm:p-6 md:flex-row md:gap-6";
// As tall as a six-week month whatever the month, so five agenda items always fit (BIG-72).
const gridColumnClasses = "md:min-h-[22.5rem] md:w-80 md:shrink-0";
const agendaItemClasses = "flex items-center gap-3 rounded-control bg-surface px-3 py-2 text-sm";

/**
 * The agenda for this month or the upcoming window when it has nothing to list (BIG-97). A picked
 * day always has Interviews, and other months keep their one line of text.
 */
function NothingScheduled() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <SleepingBigfoot className="w-full max-w-44 min-h-0 shrink" />
      <div>
        <h4 className="m-0 mb-1 text-base font-semibold text-heading">All quiet in the woods</h4>
        <p className="m-0 max-w-xs text-sm leading-[1.6] text-body">
          No upcoming Interviews, so Bigfoot’s catching some sleep. Rest up too. Once one’s booked, it shows up here.
        </p>
      </div>
    </div>
  );
}

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
    <td aria-current={isToday ? "date" : undefined} className="p-0 text-center sm:p-0.5">
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

/**
 * One Interview in the agenda, past or upcoming: a link to its Interview page, in this tab (a
 * page of Bigfoot's, so no external-link icon). The chevron says it opens another page.
 */
function AgendaItem({ item: { application, interview }, past }: { item: DatedInterview; past: boolean }) {
  const at = new Date(interview.at);
  const kind = INTERVIEW_OPTIONS[interview.kind];
  const tone = past ? "gray" : INTERVIEW_TONE[interview.kind];
  return (
    <li>
      <Link
        href={interviewHref(application.id, interview.id)}
        className={`${agendaItemClasses} group border border-transparent transition-all duration-200 hover:border-line-medium hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
      >
        {/* The link's name, in full; the row below is the same, laid out for the eye (WCAG 2.5.3:
            a name from the content, not an aria-label that leaves the visible text out). */}
        <span className="sr-only">
          {`Open Interview: ${application.company}, ${kind.label}, ${dayFormat.format(at)} at ${timeFormat.format(at)}`}
        </span>
        <time aria-hidden dateTime={interview.at} className="flex w-10 shrink-0 flex-col items-center leading-tight">
          <span className="text-xs text-body">{weekdayFormat.format(at)}</span>
          <span className={`text-base font-medium ${past ? "text-body" : "text-heading"}`}>{at.getDate()}</span>
        </time>
        <span aria-hidden className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`min-w-0 break-words font-medium ${past ? "text-body" : "text-heading"}`}>{application.company}</span>
          <Badge tone={tone}>{kind.label}</Badge>
        </span>
        <span aria-hidden className="shrink-0 text-body">{timeFormat.format(at)}</span>
        <ChevronRight
          className="size-4 shrink-0 text-body transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}
