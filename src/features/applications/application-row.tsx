"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { InterviewWhen } from "@/features/applications/application-when";
import { applicationHref } from "@/features/applications/routes";
import { SampleBadge } from "@/features/applications/sample-badge";
import { GROUP_TONE, interviewMark, OUTCOME_TONE } from "@/features/applications/status-tone";
import { nextWhen } from "@/features/applications/when-text";
import { useIsClient } from "@/hooks/use-is-client";
import { useToday } from "@/hooks/use-today";
import {
  calendarDaysBetween,
  categoryLabel,
  locationText,
  nextInterview,
  OUTCOME_OPTIONS,
  parseDay,
  upcomingInterviews,
  type Application,
  type ApplicationGroup,
  type Interview,
} from "@/lib/applications";

/** A cell of the Applications table, also drawn in skeleton shape while the list loads. */
export const cellClasses = "px-2 py-3 align-middle sm:px-3";
/**
 * On a phone, each row stacks everything in its first cell (BIG-195), so Progress and Next have no
 * column; Location gives way on a narrow screen until md.
 */
export const locationCellClasses = "hidden md:table-cell";
export const progressCellClasses = "hidden sm:table-cell";
export const nextCellClasses = "hidden sm:table-cell";
/** Rows are divided by their cells' top borders: a border on a <tr> doesn't draw in border-separate. */
export const rowBorderClasses = "[&>td]:border-t [&>td]:border-line";

type Group = Pick<ApplicationGroup, "id" | "label">;

/**
 * One Application in the Applications table, answering "what's next here?": company and role,
 * Progress (its group as a coloured label and a mark per Interview), Next (the soonest upcoming
 * Interview and when, "Nothing booked" while Waiting, or its Outcome once Done) and Location. On a
 * phone the row stacks: company, "role · Location", Progress, then Next on one line (BIG-195). A
 * linked row opens its Application page and ends in a chevron saying so.
 */
export function ApplicationRow({ job, group, linked = false }: { job: Application; group: Group; linked?: boolean }) {
  const location = locationText(job);
  return (
    <tr
      data-application-id={job.id}
      // relative: the company link's ::after covers the whole row.
      className={`group relative ${rowBorderClasses} ${linked ? "cursor-pointer transition-colors hover:bg-card-strong" : ""}`}
    >
      <td className={cellClasses}>
        <p className="m-0 text-sm font-medium leading-5 text-heading">{linked ? <RowLink job={job} /> : job.company}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-xs leading-4 text-body">
            {job.title}
            {location && <span className="sm:hidden"> · {location}</span>}
          </p>
          {job.is_sample && <SampleBadge />}
        </div>
        <div className="mt-2 flex flex-col gap-1.5 sm:hidden">
          <Progress job={job} group={group} inline />
          <NextLine job={job} />
        </div>
      </td>
      <td className={`${cellClasses} ${progressCellClasses}`}>
        <Progress job={job} group={group} />
      </td>
      <td className={`${cellClasses} ${nextCellClasses}`}>
        <Next job={job} />
      </td>
      <td className={`${cellClasses} ${locationCellClasses} text-sm text-heading`}>
        {location ?? <span className="text-body-subtle">—</span>}
      </td>
      <td className={`${cellClasses} w-px pl-0 text-right sm:pl-0`}>
        {linked && (
          <ChevronRight
            aria-hidden
            className="size-4 text-body-subtle transition group-hover:translate-x-0.5 group-hover:text-heading group-focus-within:text-heading"
          />
        )}
      </td>
    </tr>
  );
}

/** Stretched link: its ::after covers the row, so the whole row opens the Application. */
function RowLink({ job }: { job: Application }) {
  return (
    <Link
      href={applicationHref(job.id)}
      // The Application page depends on the URL, so only a link that asks is prefetched (BIG-161).
      prefetch
      className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand"
    >
      <span className="sr-only">Open </span>
      {job.company}
      <span className="sr-only">, {job.title}</span>
    </Link>
  );
}

/**
 * The row's group as a coloured label ("Waiting · 13 days", "Interview scheduled", "Offer"), with a
 * mark per Interview by date: green when completed (grey once the Application is Done, BIG-177),
 * the brand colour for the next, muted for later ones, as on the Application page's strip. Beside
 * the label on a phone (`inline`), under it in the Progress column.
 */
function Progress({ job, group, inline = false }: { job: Application; group: Group; inline?: boolean }) {
  return (
    <div className={`flex items-center gap-x-2 gap-y-1.5 ${inline ? "flex-wrap" : "flex-col items-start"}`}>
      <Badge tone={GROUP_TONE[group.id]} pill dot nowrap>
        {group.id === "waiting" ? <WaitingFor job={job} /> : group.label}
      </Badge>
      <Marks job={job} />
    </div>
  );
}

/** "Waiting · 13 days": the days since Waiting since. Just "Waiting" until hydration, which can't know the viewer's day. */
function WaitingFor({ job }: { job: Application }) {
  const today = useToday();
  if (!today || !job.waiting_since) return <>Waiting</>;
  const days = calendarDaysBetween(parseDay(job.waiting_since), today);
  return (
    <>
      Waiting · {days} {days === 1 ? "day" : "days"}
    </>
  );
}

function Marks({ job }: { job: Application }) {
  if (job.interviews.length === 0) return null;
  const next = job.status === "in_progress" ? nextInterview(job) : null;
  const completed = job.interviews.filter((interview) => interview.completed).length;
  return (
    <p className="m-0 flex flex-wrap items-center gap-1">
      {job.interviews.map((interview) => (
        <span
          key={interview.id}
          aria-hidden
          data-mark
          className={`h-1 w-4 rounded-full ${interviewMark(interview, job.status, interview.id === next?.id)}`}
        />
      ))}
      <span className="sr-only">
        {completed} of {job.interviews.length} {job.interviews.length === 1 ? "Interview" : "Interviews"} completed
      </span>
    </p>
  );
}

/**
 * What comes next, in two lines (BIG-195): the soonest upcoming Interview's title, then its day and
 * time (in the brand colour today or tomorrow) and "+1 later" when more are booked. While Waiting,
 * "Nothing booked" over the Waiting since date in the warning colour. A Done Application other than
 * an Offer shows its Outcome. Each upcoming Interview's category and date show on hover and are read
 * to screen readers.
 */
function Next({ job }: { job: Application }) {
  const upcoming = upcomingInterviews(job);
  const outcome = job.outcome && job.outcome !== "offer" ? job.outcome : null;
  const hover = useHoverText(upcoming);

  if (outcome) return <Badge tone={OUTCOME_TONE[outcome]}>{OUTCOME_OPTIONS[outcome].label}</Badge>;
  if (upcoming.length > 0) {
    const [first, ...later] = upcoming;
    return (
      <div title={hover} className="text-xs">
        <p className="m-0 text-sm font-semibold text-heading">{first.title}</p>
        <p className="m-0 mt-0.5">
          <NextWhen at={first.at} />
          {later.length > 0 && <span className="text-body"> · +{later.length} later</span>}
        </p>
        <UpcomingForScreenReaders interviews={upcoming} />
      </div>
    );
  }
  if (job.is_waiting) {
    return (
      <div className="text-xs">
        <p className="m-0 text-sm font-semibold text-heading">Nothing booked</p>
        <p className="m-0 mt-0.5 text-fg-warning">
          <WaitingSince job={job} />
        </p>
      </div>
    );
  }
  return <span className="text-sm text-body-subtle">—</span>;
}

/** Next on a phone, on one line: "Hiring Manager · tomorrow 2:00 PM", "Nothing booked · Waiting since Nov 10", or the Outcome. */
function NextLine({ job }: { job: Application }) {
  const upcoming = upcomingInterviews(job);
  const outcome = job.outcome && job.outcome !== "offer" ? job.outcome : null;
  const hover = useHoverText(upcoming);

  if (outcome) {
    return (
      <span className="flex">
        <Badge tone={OUTCOME_TONE[outcome]}>{OUTCOME_OPTIONS[outcome].label}</Badge>
      </span>
    );
  }
  if (upcoming.length > 0) {
    const [first, ...later] = upcoming;
    return (
      <p title={hover} className="m-0 text-xs">
        <span className="font-semibold text-heading">{first.title}</span>
        <span className="text-body"> · </span>
        <NextWhen at={first.at} short />
        {later.length > 0 && <span className="text-body"> · +{later.length} later</span>}
        <UpcomingForScreenReaders interviews={upcoming} />
      </p>
    );
  }
  if (job.is_waiting) {
    return (
      <p className="m-0 text-xs">
        <span className="font-semibold text-heading">Nothing booked</span>
        <span className="text-body"> · </span>
        <span className="text-fg-warning">
          <WaitingSince job={job} />
        </span>
      </p>
    );
  }
  return null;
}

const sinceFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/**
 * When the next Interview is, in the brand colour today or tomorrow: "Tomorrow · 2:00 PM", "In 2
 * days · Wed 11:00 AM", "In 11 days · Fri, Dec 4, 9:30 AM". `short`, for a phone's one line:
 * "tomorrow 2:00 PM", "in 2 days". Nothing until hydration, which can't know the viewer's time zone.
 */
function NextWhen({ at, short = false }: { at: string; short?: boolean }) {
  const today = useToday();
  if (!today) return <span className="inline-block h-4" />;
  const { text, soon } = nextWhen(new Date(at), today, short);
  return (
    <time aria-hidden dateTime={at} className={soon ? "font-medium text-fg-brand" : "text-body"}>
      {text}
    </time>
  );
}

/** "Waiting since Nov 10": the last completed Interview, or the applied date. */
function WaitingSince({ job }: { job: Application }) {
  const isClient = useIsClient();
  if (!isClient || !job.waiting_since) return null;
  return <>Waiting since {sinceFormat.format(parseDay(job.waiting_since))}</>;
}

const hoverFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Each upcoming Interview's title, category and date, one per line, for the hover tooltip. */
function useHoverText(interviews: Interview[]): string | undefined {
  // The server can't know the viewer's time zone, so the dates are added after hydration.
  const isClient = useIsClient();
  if (interviews.length === 0) return undefined;
  return interviews
    .map((interview) => {
      const category = categoryLabel(interview.category);
      return isClient ? `${interview.title} · ${category} · ${hoverFormat.format(new Date(interview.at))}` : `${interview.title} · ${category}`;
    })
    .join("\n");
}

/** The upcoming Interviews as screen readers hear them, soonest first: title, category and date. */
function UpcomingForScreenReaders({ interviews }: { interviews: Interview[] }) {
  return (
    <span className="sr-only">
      <span>{interviews.length === 1 ? "Upcoming Interview: " : "Upcoming Interviews: "}</span>
      {interviews.map((interview, i) => (
        <span key={interview.id}>
          {i > 0 && "; "}
          {interview.title}, {categoryLabel(interview.category)}, <InterviewWhen at={interview.at} />
        </span>
      ))}
    </span>
  );
}
