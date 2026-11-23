"use client";

import { ChevronRight, NotebookPen } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ApplicationWhen, InterviewWhen } from "@/features/applications/application-when";
import { applicationHref } from "@/features/applications/routes";
import { SampleBadge } from "@/features/applications/sample-badge";
import { COMPLETED_MARK, INTERVIEW_TONE, OUTCOME_TONE } from "@/features/applications/status-tone";
import { useIsClient } from "@/hooks/use-is-client";
import {
  INTERVIEW_OPTIONS,
  locationText,
  OUTCOME_OPTIONS,
  upcomingInterviews,
  type Application,
  type ApplicationGroup,
  type Interview,
} from "@/lib/applications";

/** A cell of the Applications table, also drawn in skeleton shape while the list loads. */
export const cellClasses = "px-2 py-3 align-middle sm:px-3";
/** Location gives way first on a narrow screen, then Progress moves under the role. */
export const locationCellClasses = "hidden md:table-cell";
export const progressCellClasses = "hidden sm:table-cell";
/** Rows are divided by their cells' top borders: a border on a <tr> doesn't draw in border-separate. */
export const rowBorderClasses = "[&>td]:border-t [&>td]:border-line";

/**
 * One Application in the Applications table, answering "what's next here?": company and role,
 * Progress (its group and a mark per completed Interview), Next (each upcoming Interview's kind,
 * "Waiting since", or its Outcome once Done) and Location. A linked row opens its Application page
 * and ends in a chevron saying so.
 */
export function ApplicationRow({
  job,
  group,
  linked = false,
}: {
  job: Application;
  group: ApplicationGroup["label"];
  linked?: boolean;
}) {
  return (
    <tr
      data-application-id={job.id}
      // relative: the company link's ::after covers the whole row.
      className={`group relative ${rowBorderClasses} ${linked ? "cursor-pointer transition-colors hover:bg-card-strong" : ""}`}
    >
      <td className={cellClasses}>
        <p className="m-0 text-sm font-medium leading-5 text-heading">{linked ? <RowLink job={job} /> : job.company}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-xs leading-4 text-body">{job.title}</p>
          {job.is_sample && <SampleBadge />}
        </div>
        <div className="mt-1.5 sm:hidden">
          <Progress job={job} group={group} />
        </div>
      </td>
      <td className={`${cellClasses} ${progressCellClasses}`}>
        <Progress job={job} group={group} />
      </td>
      <td className={cellClasses}>
        <Next job={job} />
      </td>
      <td className={`${cellClasses} ${locationCellClasses} text-sm text-heading`}>
        {locationText(job) ?? <span className="text-body-subtle">—</span>}
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
 * The row's group ("Interview scheduled"), with one mark per completed Interview under it: green
 * while the Application is In Progress, grey once it is Done (BIG-177).
 */
function Progress({ job, group }: { job: Application; group: string }) {
  const completed = job.interviews.filter((interview) => interview.completed);
  const withNotes = completed.filter((interview) => interview.notes).length;
  return (
    <div className="text-xs text-body">
      <p className="m-0">{group}</p>
      {completed.length > 0 && (
        <p className="m-0 mt-1 flex flex-wrap items-center gap-1">
          {completed.map((interview) => (
            <span key={interview.id} aria-hidden className={`h-1 w-4 rounded-full ${COMPLETED_MARK[job.status]}`} />
          ))}
          {withNotes > 0 && <NotebookPen className="ml-0.5 size-3" aria-hidden />}
          <span className="sr-only">
            {completed.length} completed {completed.length === 1 ? "Interview" : "Interviews"}
            {withNotes > 0 && `, ${withNotes} with notes`}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * What comes next: the Outcome of a Done Application other than an Offer, each upcoming Interview's
 * kind (soonest first, its date on hover and to screen readers), and "Waiting since".
 */
function Next({ job }: { job: Application }) {
  const upcoming = upcomingInterviews(job);
  const outcome = job.outcome && job.outcome !== "offer" ? job.outcome : null;

  if (!outcome && upcoming.length === 0 && !job.is_waiting) {
    return <span className="text-sm text-body-subtle">—</span>;
  }
  return (
    <div className="flex flex-col items-start gap-1.5 text-xs text-body">
      {outcome && <Badge tone={OUTCOME_TONE[outcome]}>{OUTCOME_OPTIONS[outcome].label}</Badge>}
      {upcoming.length > 0 && (
        <ul aria-label="Upcoming Interviews" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {upcoming.map((interview) => (
            <UpcomingInterview key={interview.id} interview={interview} />
          ))}
        </ul>
      )}
      {job.is_waiting && <ApplicationWhen app={job} />}
    </div>
  );
}

const hoverFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** An upcoming Interview's kind badge; its date shows on hover and is read after the kind. */
function UpcomingInterview({ interview }: { interview: Interview }) {
  // The server can't know the viewer's time zone, so the date is added after hydration.
  const isClient = useIsClient();
  const when = isClient ? hoverFormat.format(new Date(interview.at)) : undefined;
  return (
    <li title={when} className="inline-flex">
      <Badge tone={INTERVIEW_TONE[interview.kind]}>{INTERVIEW_OPTIONS[interview.kind].label}</Badge>
      <span className="sr-only">
        , <InterviewWhen at={interview.at} />
      </span>
    </li>
  );
}
