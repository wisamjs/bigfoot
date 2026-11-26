"use client";

import { useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { rememberDashboardView } from "@/features/shell/dashboard-link";
import { CalendarBigfoot, ClockBigfoot } from "@/features/shell/illustrations";
import { interviewHref } from "@/features/applications/routes";
import { capitalize } from "@/features/applications/when-text";
import { useIsClient } from "@/hooks/use-is-client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Skeleton } from "@/components/ui/skeleton";
import { calendarDaysBetween, relativeDays, type DatedInterview } from "@/lib/applications";
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
  weekOf,
  type CalendarDay,
} from "@/lib/calendar";

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weekdayLongFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const shortMonthFormat = new Intl.DateTimeFormat(undefined, { month: "short" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function interviewCount(n: number) {
  return `${n} ${n === 1 ? "Interview" : "Interviews"}`;
}

/**
 * The dashboard's search params for the calendar's month (`2026-12`), picked day (`2026-12-04`), and
 * on a phone, whether "Show month" swapped this week's row for the month grid (`calendar=month`).
 */
const MONTH_PARAM = "month";
const DAY_PARAM = "day";
const SHOW_MONTH_PARAM = "calendar";

/** The month and day in the URL as a search string, "" for this month with today picked. */
function viewSearch(params: URLSearchParams): string {
  const view = new URLSearchParams();
  for (const name of [MONTH_PARAM, DAY_PARAM, SHOW_MONTH_PARAM]) {
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

  /** `showMonth` left out keeps the phone's choice of week row or month grid as it is. */
  function setView(start: Date | null, day: string | null, showMonth?: boolean) {
    const next = new URLSearchParams(window.location.search);
    if (start) next.set(MONTH_PARAM, monthParam(start));
    else next.delete(MONTH_PARAM);
    if (day) next.set(DAY_PARAM, day);
    else next.delete(DAY_PARAM);
    if (showMonth === true) next.set(SHOW_MONTH_PARAM, "month");
    else if (showMonth === false) next.delete(SHOW_MONTH_PARAM);
    const query = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  return {
    month: params.get(MONTH_PARAM),
    day: params.get(DAY_PARAM),
    showMonth: params.get(SHOW_MONTH_PARAM) === "month",
    setView,
  };
}

/** The local day a `YYYY-MM-DD` key names, or null for anything else. */
function parseDayKey(key: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dayKey(date) === key ? date : null;
}

/** "the next 2 weeks" as a heading: "Next 2 weeks"; "November" stays as it is. */
function agendaTitle(span: string) {
  return capitalize(span.replace(/^the /, ""));
}

/**
 * The Interviews card's body (BIG-36, BIG-173): a month grid, Monday first, then the picked day's
 * Interviews, then the agenda: every Interview of an In Progress Application and every completed one of a
 * Done Application (BIG-206), past ones muted.
 * Any day of the month can be picked; today is picked until another day is. The agenda lists
 * another month's Interviews, or for this month the widest upcoming window that holds five (BIG-72).
 * With nothing to list this month, Bigfoot says why: no Interviews yet, or `waiting` Applications
 * waiting to hear back.
 * On a phone (BIG-195) the grid gives way to this week's row of days, with "Show month" for the
 * grid; another month, or a picked day outside this week, shows the grid too. The phone's agenda
 * puts how far off each Interview is over its time, and fills the soonest one's date in the brand
 * colour.
 * Days and times are the job seeker's own, so the calendar renders only in the browser; the server
 * sends InterviewCalendarSkeleton, the same layout in skeleton shapes.
 */
export function InterviewCalendar({ interviews, waiting = 0 }: { interviews: DatedInterview[]; waiting?: number }) {
  const isClient = useIsClient();
  const view = useCalendarView();
  const wide = useMediaQuery("(min-width: 640px)");

  if (!isClient) return <InterviewCalendarSkeleton />;

  // eslint-disable-next-line @eslint-react/purity -- today is read on each render on purpose: the calendar renders only in the browser (isClient above), and a stored date would go stale past midnight.
  const now = new Date();
  const offset = monthOffset(view.month, now);
  const start = monthStart(now, offset);
  const byDay = groupByDay(interviews, (d) => d.interview.at);
  const picked = parseDayKey(view.day) ?? now;
  const agendaWindow = offset === 0 ? upcomingWindow(interviews.map((d) => d.interview.at), now) : monthWindow(start);
  // byDay is already in date and time order.
  const agendaItems = [...byDay.values()].flat().filter((d) => inWindow(d.interview.at, agendaWindow));

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-6">
        <DayPicker view={view} wide={wide} now={now} offset={offset} picked={picked} byDay={byDay} />
        <PickedDay date={picked} items={byDay.get(dayKey(picked)) ?? []} now={now} />
      </div>

      <Agenda
        span={agendaWindow.span}
        items={agendaItems}
        isThisMonth={offset === 0}
        monthHasInterviews={[...byDay.keys()].some((key) => key.startsWith(monthParam(start)))}
        hasInterviews={interviews.length > 0}
        waiting={waiting}
        now={now}
        phone={!wide}
      />
    </div>
  );
}

type CalendarView = ReturnType<typeof useCalendarView>;

/**
 * The days to pick from: the month grid under its name and arrows, or on a phone this week's row
 * with "Show month" (BIG-195). A phone shows the grid for another month or a picked day outside
 * this week, with "Show this week" to go back.
 */
function DayPicker({
  view,
  wide,
  now,
  offset,
  picked,
  byDay,
}: {
  view: CalendarView;
  wide: boolean;
  now: Date;
  offset: number;
  picked: Date;
  byDay: DayInterviews;
}) {
  const todayKey = dayKey(now);
  const pickedKey = dayKey(picked);
  const start = monthStart(now, offset);
  // This month and today are the default view, so they stay out of the URL.
  const goTo = (next: number) => view.setView(next === 0 ? null : monthStart(now, next), null);
  const pick = (key: string) => view.setView(offset === 0 ? null : start, key === todayKey ? null : key);

  const week = weekOf(now);
  const inWeek = week.some((d) => d.key === pickedKey);
  if (wide || view.showMonth || offset !== 0 || !inWeek) {
    const showWeek = () => view.setView(null, inWeek && pickedKey !== todayKey ? pickedKey : null, false);
    return (
      <>
        <MonthHeader start={start} onGo={(step) => goTo(offset + step)} />
        <MonthGrid weeks={monthWeeks(start)} byDay={byDay} now={now} todayKey={todayKey} pickedKey={pickedKey} onPick={pick} />
        {!wide && <ViewToggle onClick={showWeek}>Show this week</ViewToggle>}
      </>
    );
  }
  return (
    <>
      <WeekRow week={week} byDay={byDay} now={now} todayKey={todayKey} pickedKey={pickedKey} onPick={pick} />
      <ViewToggle onClick={() => view.setView(null, view.day, true)}>Show month</ViewToggle>
    </>
  );
}

/** The month's name between its arrows. */
function MonthHeader({ start, onGo }: { start: Date; onGo: (step: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" className={arrowClasses} onClick={() => onGo(-1)}>
        <ChevronLeft className="size-[18px]" aria-hidden />
        <span className="sr-only">Previous month</span>
      </button>
      <h3 id="calendar-month" aria-live="polite" className="m-0 text-base font-semibold text-heading">
        {monthFormat.format(start)}
      </h3>
      <button type="button" className={arrowClasses} onClick={() => onGo(1)}>
        <ChevronRight className="size-[18px]" aria-hidden />
        <span className="sr-only">Next month</span>
      </button>
    </div>
  );
}

/** "Show month" under the phone's week row, or "Show this week" under the grid it opened. */
function ViewToggle({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-target self-start rounded-control font-medium text-fg-brand underline-offset-4 transition-colors hover:text-fg-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {children}
    </button>
  );
}

/** The phone's calendar until "Show month" (BIG-195): this week, Monday first, as one row of the grid's day tiles. */
function WeekRow({
  week,
  byDay,
  now,
  todayKey,
  pickedKey,
  onPick,
}: {
  week: CalendarDay[];
  byDay: DayInterviews;
  now: Date;
  todayKey: string;
  pickedKey: string;
  onPick: (key: string) => void;
}) {
  return (
    <DayTable label="This week" weeks={[week]} byDay={byDay} now={now} todayKey={todayKey} pickedKey={pickedKey} onPick={onPick} />
  );
}

type DayInterviews = Map<string, DatedInterview[]>;

function MonthGrid({
  weeks,
  byDay,
  now,
  todayKey,
  pickedKey,
  onPick,
}: {
  weeks: CalendarDay[][];
  byDay: DayInterviews;
  now: Date;
  todayKey: string;
  pickedKey: string;
  onPick: (key: string) => void;
}) {
  return (
    <DayTable
      labelledBy="calendar-month"
      weeks={weeks}
      byDay={byDay}
      now={now}
      todayKey={todayKey}
      pickedKey={pickedKey}
      onPick={onPick}
    />
  );
}

/** Weeks of day tiles under their weekdays: the month grid, or the phone's week row. */
function DayTable({
  weeks,
  labelledBy,
  label,
  byDay,
  now,
  todayKey,
  pickedKey,
  onPick,
}: {
  weeks: CalendarDay[][];
  labelledBy?: string;
  label?: string;
  byDay: DayInterviews;
  now: Date;
  todayKey: string;
  pickedKey: string;
  onPick: (key: string) => void;
}) {
  return (
    // On a phone the grid reaches into the card's padding, so each day is a 44px touch target.
    <table aria-labelledby={labelledBy} aria-label={label} className="-mx-2 w-[calc(100%+1rem)] table-fixed border-collapse sm:mx-0 sm:w-full">
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
            {week.map((day) => {
              const dayInterviews = byDay.get(day.key) ?? [];
              return (
                <DayCell
                  key={day.key}
                  day={day}
                  count={dayInterviews.length}
                  allPast={dayInterviews.every((d) => new Date(d.interview.at) < now)}
                  isToday={day.key === todayKey}
                  isPicked={day.inMonth && day.key === pickedKey}
                  onPick={() => onPick(day.key)}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A day's tile: tinted when it has Interviews, outlined today, filled with the brand colour when picked. */
function tileClasses({ count, isToday, isPicked, inMonth }: { count: number; isToday: boolean; isPicked: boolean; inMonth: boolean }) {
  const base = "flex h-full flex-col items-center justify-center gap-1 rounded-control border text-sm font-medium transition-colors";
  if (isPicked) return `${base} border-transparent bg-brand font-bold text-on-brand`;
  const fill = count > 0 ? "bg-card-strong" : "";
  const border = isToday ? "border-line-brand" : "border-transparent";
  // The neighbouring months' days are quieter: body text, regular weight.
  const text = inMonth ? "text-heading" : "font-normal text-body";
  return `${base} ${fill} ${border} ${text}`;
}

function DayDot({ count, allPast, isPicked }: { count: number; allPast: boolean; isPicked: boolean }) {
  if (count === 0) return <span className="h-1.5" aria-hidden />;
  const colour = isPicked ? "bg-on-brand" : allPast ? "bg-body-subtle" : "bg-tone-blue-fg";
  return <span className={`size-1.5 rounded-full ${colour}`} aria-hidden />;
}

function DayCell({
  day,
  count,
  allPast,
  isToday,
  isPicked,
  onPick,
}: {
  day: CalendarDay;
  count: number;
  allPast: boolean;
  isToday: boolean;
  isPicked: boolean;
  onPick: () => void;
}) {
  const tile = (
    <span className={tileClasses({ count, isToday, isPicked, inMonth: day.inMonth })}>
      {day.date.getDate()}
      <DayDot count={count} allPast={allPast} isPicked={isPicked} />
    </span>
  );

  // The neighbouring months' days fill out the weeks; they aren't picked from this month.
  if (!day.inMonth) {
    return (
      <td className="h-12 p-0.5">
        <span aria-hidden className="block h-full">
          {tile}
        </span>
      </td>
    );
  }
  return (
    <td aria-current={isToday ? "date" : undefined} className="h-12 p-0">
      <button
        type="button"
        aria-pressed={isPicked}
        aria-label={count > 0 ? `${dayFormat.format(day.date)}, ${interviewCount(count)}` : dayFormat.format(day.date)}
        className="group block h-12 w-full cursor-pointer p-0.5 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand [&:hover>span]:border-line-brand-subtle"
        onClick={onPick}
      >
        {tile}
      </button>
    </td>
  );
}

/** The picked day under the grid: its date, then a line per Interview, each opening its Interview page. */
function PickedDay({ date, items, now }: { date: Date; items: DatedInterview[]; now: Date }) {
  return (
    // A live region, so picking a day reads out what it holds.
    <section
      aria-labelledby="calendar-picked-day"
      aria-live="polite"
      className="flex flex-col gap-1 rounded-control bg-surface px-3.5 py-3 text-sm"
    >
      <p id="calendar-picked-day" className="m-0 font-semibold text-heading">
        {dayFormat.format(date)}
      </p>
      {items.length === 0 ? (
        <p className="m-0 text-body">No Interviews this day.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((item) => (
            <PickedInterview key={item.interview.id} item={item} past={new Date(item.interview.at) < now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PickedInterview({ item: { application, interview }, past }: { item: DatedInterview; past: boolean }) {
  const at = new Date(interview.at);
  return (
    <li>
      <Link
        href={interviewHref(application.id, interview.id)}
        className="group -mx-1.5 flex items-center gap-2 rounded-control px-1.5 py-0.5 text-body transition-colors hover:bg-card hover:text-heading focus-visible:outline-2 focus-visible:outline-brand pointer-coarse:min-h-11"
      >
        <span className={`min-w-0 flex-1 break-words ${past ? "" : "text-heading"}`}>
          <span className="sr-only">Open Interview: </span>
          {timeFormat.format(at)} · {interview.title} · {application.company}
        </span>
        <ChevronRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}

/** Under the picked day: the agenda's window and its Interviews, or why there are none. */
function Agenda({
  span,
  items,
  isThisMonth,
  monthHasInterviews,
  hasInterviews,
  waiting,
  now,
  phone,
}: {
  span: string;
  items: DatedInterview[];
  isThisMonth: boolean;
  monthHasInterviews: boolean;
  hasInterviews: boolean;
  waiting: number;
  now: Date;
  phone: boolean;
}) {
  const soonest = items.find((d) => new Date(d.interview.at) >= now);
  if (items.length === 0 && isThisMonth) {
    return <NothingScheduled waiting={waiting} monthHasInterviews={monthHasInterviews} />;
  }
  if (items.length === 0) {
    return (
      <p className="m-0 border-t border-line px-4 py-5 text-sm text-body sm:px-6">
        {hasInterviews ? `Nothing in ${span} yet.` : "Add a dated Interview to an Application and it shows up here."}
      </p>
    );
  }
  return (
    <section aria-labelledby="calendar-agenda" className="border-t border-line">
      <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-4 sm:px-6">
        <h3 id="calendar-agenda" className="m-0 text-sm font-semibold text-heading">
          {agendaTitle(span)}
        </h3>
        <span className="text-[13px] text-body">{interviewCount(items.length)}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-0.5 px-1 pb-3 sm:px-3">
        {items.map((d) =>
          phone ? (
            <PhoneAgendaItem
              key={d.interview.id}
              item={d}
              past={new Date(d.interview.at) < now}
              soonest={d.interview.id === soonest?.interview.id}
              now={now}
            />
          ) : (
            <AgendaItem key={d.interview.id} item={d} past={new Date(d.interview.at) < now} />
          ),
        )}
      </ul>
    </section>
  );
}

/**
 * One Interview in the agenda, past or upcoming: a link to its Interview page, in this tab (a
 * page of Bigfoot's, so no external-link icon). The chevron says it opens another page.
 */
function AgendaItem({ item: { application, interview }, past }: { item: DatedInterview; past: boolean }) {
  const at = new Date(interview.at);
  return (
    <li>
      <Link
        href={interviewHref(application.id, interview.id)}
        className={`${agendaItemClasses} group transition-colors duration-200 hover:bg-card-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
      >
        {/* The link's name, in full; the row below is the same, laid out for the eye (WCAG 2.5.3:
            a name from the content, not an aria-label that leaves the visible text out). */}
        <span className="sr-only">
          {`Open Interview: ${application.company}, ${interview.title}, ${dayFormat.format(at)} at ${timeFormat.format(at)}`}
        </span>
        <time
          aria-hidden
          dateTime={interview.at}
          className={`${dateTileClasses} ${past ? "bg-card-strong text-body" : "bg-tone-blue text-tone-blue-fg"}`}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.06em]">{weekdayFormat.format(at)}</span>
          <span className="text-xl font-bold leading-[1.1]">{at.getDate()}</span>
        </time>
        <span aria-hidden className="flex min-w-0 flex-1 flex-col gap-px">
          <span className={`break-words font-semibold ${past ? "text-body" : "text-heading"}`}>{interview.title}</span>
          <span className="break-words text-sm text-body">
            {application.company} · {application.title}
          </span>
        </span>
        <span aria-hidden className="shrink-0 whitespace-nowrap text-sm text-body">
          {timeFormat.format(at)}
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-body transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/**
 * One Interview in a phone's agenda (BIG-195): its date tile (month and day), title and company,
 * and on the right how far off it is over its time. The soonest upcoming one's tile is filled in the
 * brand colour, with "Today" or "Tomorrow" in the brand colour too.
 */
function PhoneAgendaItem({
  item: { application, interview },
  past,
  soonest,
  now,
}: {
  item: DatedInterview;
  past: boolean;
  soonest: boolean;
  now: Date;
}) {
  const at = new Date(interview.at);
  const days = calendarDaysBetween(now, at);
  const relative = relativeDays(days);
  const tile = soonest ? "bg-brand text-on-brand" : past ? "bg-card-strong text-body" : "border border-line-brand-subtle text-heading";
  return (
    <li>
      <Link
        href={interviewHref(application.id, interview.id)}
        className={`${agendaItemClasses} transition-colors duration-200 hover:bg-card-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
      >
        <span className="sr-only">
          {`Open Interview: ${application.company}, ${interview.title}, ${dayFormat.format(at)} at ${timeFormat.format(at)}`}
        </span>
        <time aria-hidden dateTime={interview.at} className={`${dateTileClasses} ${tile}`}>
          <span className="text-[11px] font-bold uppercase tracking-[0.06em]">{shortMonthFormat.format(at)}</span>
          <span className="text-xl font-bold leading-[1.1]">{at.getDate()}</span>
        </time>
        <span aria-hidden className="flex min-w-0 flex-1 flex-col gap-px">
          <span className={`break-words font-semibold ${past ? "text-body" : "text-heading"}`}>{interview.title}</span>
          <span className="break-words text-sm text-body">{application.company}</span>
        </span>
        <span aria-hidden className="flex shrink-0 flex-col items-end gap-px whitespace-nowrap text-sm text-body">
          <span className={soonest && days >= 0 && days <= 1 ? "font-semibold text-fg-brand" : "text-heading"}>
            {capitalize(relative)}
          </span>
          <span>{timeFormat.format(at)}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * This month's agenda with nothing to list (BIG-97, BIG-173): with Applications waiting to hear
 * back, Bigfoot checks the time; otherwise all is quiet.
 */
function NothingScheduled({ waiting, monthHasInterviews }: { waiting: number; monthHasInterviews: boolean }) {
  if (waiting > 0) {
    const one = waiting === 1;
    return (
      <EmptyAgenda
        illustration={<ClockBigfoot className="h-auto w-[200px] max-w-full" />}
        title={monthHasInterviews ? "No upcoming Interviews" : "No Interviews this month"}
      >
        {waiting} {one ? "Application is" : "Applications are"} waiting to hear back. When an Interview is booked, add
        it here.
      </EmptyAgenda>
    );
  }
  return (
    <EmptyAgenda illustration={<CalendarBigfoot className="h-auto w-[200px] max-w-full" />} title="All quiet in the woods">
      Interviews you add show up here and on the calendar.
    </EmptyAgenda>
  );
}

function EmptyAgenda({ illustration, title, children }: { illustration: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-line px-6 pb-8 pt-6 text-center">
      {illustration}
      <h3 className="m-0 text-xl font-bold leading-[1.25] text-heading">{title}</h3>
      <p className="m-0 max-w-xs text-sm leading-[1.6] text-body">{children}</p>
    </div>
  );
}

/**
 * The calendar while it waits for data or for the browser: the month grid (five weeks, the usual
 * month), the picked day and four agenda items, sized like the real ones.
 */
export function InterviewCalendarSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex h-5 justify-center pb-1">
              <Skeleton className="h-4 w-7" />
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="flex h-12 items-center justify-center p-0.5">
              <Skeleton className="size-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-control bg-surface px-3.5 py-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="border-t border-line">
        <div className="flex justify-between px-4 pb-2 pt-4 sm:px-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <ul className="m-0 flex list-none flex-col gap-0.5 px-1 pb-3 sm:px-3">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className={agendaItemClasses}>
              <Skeleton className="h-[52px] w-12 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-44 max-w-full" />
              </span>
              <Skeleton className="h-4 w-14 shrink-0" />
              <span className="size-4 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// The month arrows: ghost buttons, as in the design, tinted on hover.
const arrowClasses =
  "grid size-10 cursor-pointer place-items-center rounded-control text-heading transition-colors hover:bg-card-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

// Shared by the agenda and its skeleton, so the two can't drift apart.
const agendaItemClasses = "flex items-center gap-3.5 rounded-control px-3 py-2.5";
const dateTileClasses = "flex w-12 flex-none flex-col items-center rounded-control py-1.5";
