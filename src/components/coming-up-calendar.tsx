"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsClient } from "@/components/use-is-client";
import { buttonClasses, toneClasses } from "@/components/ui";
import { ROUND_OPTIONS, type DatedApplication } from "@/lib/applications";
import { dayKey, groupByDay, monthStart, monthWeeks, type CalendarDay } from "@/lib/calendar";

const SHOWN_PER_DAY = 2;

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weekdayLongFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const fullFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function label(a: DatedApplication) {
  return `${a.next_round ? ROUND_OPTIONS[a.next_round].label : "Next round"} · ${a.company}`;
}

function rounds(n: number) {
  return `${n} Next ${n === 1 ? "round" : "rounds"}`;
}

/**
 * Coming up as a month grid (BIG-36). Days and times are the job seeker's own, so the grid
 * renders only in the browser; the server sends a placeholder of the same size.
 */
export function ComingUpCalendar({ nextRounds }: { nextRounds: DatedApplication[] }) {
  const isClient = useIsClient();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (selected) selectedHeading.current?.focus();
  }, [selected]);

  if (!isClient) return <div className="card h-[28rem] animate-pulse" aria-hidden />;

  const now = new Date();
  const todayKey = dayKey(now);
  const start = monthStart(now, offset);
  const weeks = monthWeeks(start);
  const byDay = groupByDay(nextRounds);
  const selectedDay = weeks.flat().find((d) => d.key === selected && d.inMonth);

  const goTo = (next: number) => {
    setOffset(next);
    setSelected(null);
  };
  const select = (key: string) => setSelected((current) => (current === key ? null : key));

  return (
    <div className="card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 id="calendar-month" aria-live="polite" className="m-0 text-base font-medium text-heading">
          {monthFormat.format(start)}
        </h3>
        <div className="flex items-center gap-2">
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
              <th key={d.key} scope="col" className="pb-2 text-xs font-medium text-body">
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
              {week.map((day, column) => (
                <DayCell
                  key={day.key}
                  day={day}
                  events={day.inMonth ? (byDay.get(day.key) ?? []) : []}
                  isToday={day.key === todayKey}
                  isSelected={day.key === selected}
                  alignTooltipRight={column >= 4}
                  now={now}
                  onSelect={() => select(day.key)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {nextRounds.length === 0 && (
        <p className="m-0 mt-4 text-sm text-body">Add a Next round date to an Application and it shows up here.</p>
      )}

      {selectedDay && (
        <section aria-labelledby="calendar-day" className="mt-4 rounded-control bg-surface p-4">
          <h3
            id="calendar-day"
            ref={selectedHeading}
            tabIndex={-1}
            className="m-0 mb-3 text-sm font-medium text-heading focus-visible:outline-none"
          >
            {dayFormat.format(selectedDay.date)}
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {(byDay.get(selectedDay.key) ?? []).map((a) => {
              const at = new Date(a.next_round_at);
              return (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-baseline justify-between gap-x-4 text-sm ${at < now ? "text-body" : "text-heading"}`}
                >
                  <span className="font-medium">{label(a)}</span>
                  <time dateTime={a.next_round_at} className="text-body">
                    {timeFormat.format(at)}
                    {at < now && <span className="sr-only"> (past)</span>}
                  </time>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function DayCell({
  day,
  events,
  isToday,
  isSelected,
  alignTooltipRight,
  now,
  onSelect,
}: {
  day: CalendarDay;
  events: DatedApplication[];
  isToday: boolean;
  isSelected: boolean;
  alignTooltipRight: boolean;
  now: Date;
  onSelect: () => void;
}) {
  if (!day.inMonth) return <td className="border border-line-medium" />;

  const number = (
    <span
      className={`inline-grid size-6 place-items-center rounded-full text-xs font-medium ${
        isToday ? "bg-brand text-on-brand" : "text-heading"
      }`}
    >
      {day.date.getDate()}
    </span>
  );
  const hidden = events.length - SHOWN_PER_DAY;

  return (
    <td
      aria-current={isToday ? "date" : undefined}
      className={`h-12 border border-line-medium p-0.5 align-top sm:h-28 sm:p-1.5 ${isSelected ? "bg-surface" : ""}`}
    >
      {events.length === 0 ? (
        <div className="flex justify-center sm:justify-start">{number}</div>
      ) : (
        <>
          {/* Phones: the day itself opens its list. */}
          <button
            type="button"
            aria-pressed={isSelected}
            aria-label={`${dayFormat.format(day.date)}, ${rounds(events.length)}`}
            className="flex min-h-10 w-full flex-col items-center gap-0.5 rounded-control hover:bg-surface sm:hidden"
            onClick={onSelect}
          >
            {number}
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
          </button>

          {/* Wide screens: chips, then "+n more". */}
          <div className="hidden sm:flex sm:flex-col sm:items-start">
            {number}
            <ul className="m-0 mt-1 flex w-full list-none flex-col gap-1 p-0">
              {events.slice(0, SHOWN_PER_DAY).map((a) => (
                <EventChip key={a.id} application={a} past={new Date(a.next_round_at) < now} alignRight={alignTooltipRight} />
              ))}
            </ul>
            {hidden > 0 && (
              <button
                type="button"
                aria-expanded={isSelected}
                className="mt-1 rounded-control px-1 text-xs font-medium text-fg-brand hover:underline"
                onClick={onSelect}
              >
                +{hidden} more
                <span className="sr-only"> on {dayFormat.format(day.date)}</span>
              </button>
            )}
          </div>
        </>
      )}
    </td>
  );
}

/** Display only: focusable so keyboard users can see the time, but it does nothing on click. */
function EventChip({ application: a, past, alignRight }: { application: DatedApplication; past: boolean; alignRight: boolean }) {
  const at = new Date(a.next_round_at);
  const tone = a.next_round ? ROUND_OPTIONS[a.next_round].tone : "neutral";
  return (
    <li
      tabIndex={0}
      className={`group relative rounded-control border px-1.5 py-0.5 text-xs font-medium leading-4 ${
        past ? "border-line bg-surface text-body" : toneClasses[tone]
      }`}
    >
      <span className="block truncate" aria-hidden>
        {label(a)}
      </span>
      <span className="sr-only">
        {label(a)}, {fullFormat.format(at)}
        {past && " (past)"}
      </span>
      <span
        aria-hidden
        className={`invisible absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-control bg-brand px-3 py-2 text-sm font-medium text-on-brand opacity-0 shadow-xs transition-opacity duration-300 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 ${
          alignRight ? "right-0" : "left-0"
        }`}
      >
        {timeFormat.format(at)}
      </span>
    </li>
  );
}
