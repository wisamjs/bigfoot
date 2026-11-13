"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsClient } from "@/components/use-is-client";
import { Badge, buttonClasses } from "@/components/ui";
import { ROUND_OPTIONS, type DatedApplication } from "@/lib/applications";
import { dayKey, groupByDay, monthStart, monthWeeks, type CalendarDay } from "@/lib/calendar";

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const monthOnlyFormat = new Intl.DateTimeFormat(undefined, { month: "long" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weekdayLongFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function rounds(n: number) {
  return `${n} Next ${n === 1 ? "round" : "rounds"}`;
}

/**
 * Coming up as a small month grid beside an agenda (BIG-36): only Next rounds still ahead. The
 * API advances an In Progress Application's past round on read, so a past date here is an Offer's
 * or one that passed after the page loaded.
 * The grid marks days with a dot; the agenda lists the shown month's Next rounds, or one day's
 * once that day is picked.
 * Days and times are the job seeker's own, so the calendar renders only in the browser; the server
 * sends a placeholder of about the same size.
 */
export function ComingUpCalendar({ nextRounds }: { nextRounds: DatedApplication[] }) {
  const isClient = useIsClient();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const agendaHeading = useRef<HTMLHeadingElement>(null);
  // Set by the day buttons and "Show month", not by month navigation, so focus stays on the arrows.
  const focusAgenda = useRef(false);

  useEffect(() => {
    if (focusAgenda.current) {
      focusAgenda.current = false;
      agendaHeading.current?.focus();
    }
  }, [selected]);

  if (!isClient) return <div className="card h-[40rem] animate-pulse md:h-[25.5rem]" aria-hidden />;

  const now = new Date();
  const todayKey = dayKey(now);
  const start = monthStart(now, offset);
  const weeks = monthWeeks(start);
  const ahead = nextRounds.filter((a) => new Date(a.next_round_at) >= now);
  const byDay = groupByDay(ahead);
  const days = weeks.flat().filter((d) => d.inMonth);
  const selectedDay = days.find((d) => d.key === selected);
  const agendaDays = (selectedDay ? [selectedDay] : days).filter((d) => byDay.has(d.key));

  const goTo = (next: number) => {
    setOffset(next);
    setSelected(null);
  };
  const showAgenda = (key: string | null) => {
    focusAgenda.current = true;
    setSelected(key);
  };

  return (
    <div className="card flex flex-col gap-6 p-4 sm:p-6 md:flex-row">
      <div className="md:w-80 md:shrink-0">
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
              ref={agendaHeading}
              tabIndex={-1}
              className="m-0 text-base font-medium text-heading focus-visible:outline-none"
            >
              {selectedDay ? dayFormat.format(selectedDay.date) : `Next rounds in ${monthOnlyFormat.format(start)}`}
            </h3>
            {selectedDay && (
              <button type="button" className={buttonClasses("tertiary", "sm")} onClick={() => showAgenda(null)}>
                Show month
              </button>
            )}
          </div>

          {agendaDays.length === 0 ? (
            <p className="m-0 text-sm text-body">
              {ahead.length === 0
                ? "Add a Next round date to an Application and it shows up here."
                : `Nothing in ${monthOnlyFormat.format(start)} yet.`}
            </p>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="calendar-agenda"
              className="min-h-0 flex-1 overflow-y-auto rounded-control focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {agendaDays.flatMap((d) => byDay.get(d.key) ?? []).map((a) => (
                  <AgendaItem key={a.id} application={a} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DayCell({
  day,
  count,
  isToday,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  count: number;
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
  const dot = <span className={`size-1.5 rounded-full ${count > 0 ? "bg-brand" : ""}`} aria-hidden />;

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
          aria-label={`${dayFormat.format(day.date)}, ${rounds(count)}`}
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

function AgendaItem({ application: a }: { application: DatedApplication }) {
  const at = new Date(a.next_round_at);
  const round = a.next_round ? ROUND_OPTIONS[a.next_round] : null;
  return (
    <li className="flex items-center gap-3 rounded-control bg-surface px-3 py-2 text-sm">
      <time dateTime={a.next_round_at} className="flex w-10 shrink-0 flex-col items-center leading-tight">
        <span className="text-xs text-body">{weekdayFormat.format(at)}</span>
        <span className="text-base font-medium text-heading">{at.getDate()}</span>
      </time>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="truncate font-medium text-heading">{a.company}</span>
        <Badge tone={round?.tone ?? "neutral"}>{round?.label ?? "Next round"}</Badge>
      </div>
      <span className="shrink-0 text-body">{timeFormat.format(at)}</span>
    </li>
  );
}
