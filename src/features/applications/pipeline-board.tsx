"use client";

import type { ReactNode } from "react";
import { CalendarClock, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SampleBadge } from "@/features/applications/sample-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationWhen, InterviewWhen } from "@/features/applications/application-when";
import { INTERVIEW_TONE, OUTCOME_TONE } from "@/features/applications/status-tone";
import {
  getBoardColumns,
  INTERVIEW_OPTIONS,
  OUTCOME_OPTIONS,
  upcomingInterviews,
  type Application,
  type Interview,
} from "@/lib/applications";

// Also draws the landing page's decorative board (src/features/landing/hero.tsx): after a
// layout change, check docs/screenshots/landing.png too.

type Props = {
  title: string;
  subtitle: string;
  applications: Application[];
  /** Show Done Applications other than Offers in a Done column. */
  showDone?: boolean;
  /** Controls beside the subtitle, such as the Show done toggle. */
  actions?: ReactNode;
  /** Makes each card a button that opens the Application. */
  onOpen?: (app: Application) => void;
  /** Render as a decorative picture (landing page) instead of readable content. */
  decorative?: boolean;
};

export function PipelineBoard({
  title,
  subtitle,
  applications,
  showDone = false,
  actions,
  onOpen,
  decorative = false,
}: Props) {
  const columns = getBoardColumns(applications, { showDone });
  const a11y = decorative
    ? {
        role: "img" as const,
        "aria-label": `${title}: pipeline board with ${columns.map((c) => c.label).join(", ")} columns`,
      }
    : {};

  return (
    <div className={`${boardClasses} ${decorative ? "shadow-2xl" : ""}`} {...a11y}>
      <div className={boardHeaderClasses}>
        <span className="text-base font-medium text-heading">{title}</span>
        <div className="flex flex-wrap items-center gap-4">
          <span className={subtitleClasses}>
            <CalendarClock className="size-4" aria-hidden />
            {subtitle}
          </span>
          {actions}
        </div>
      </div>
      {columns.length === 0 ? (
        <p className="m-0 rounded-control bg-surface p-6 text-center text-sm text-body">
          Open applications show up here, grouped by whether an interview is booked.
        </p>
      ) : (
        <div className={columnsClasses}>
          {columns.map((column) => (
            <section
              key={column.id}
              aria-label={decorative ? undefined : column.label}
              className={columnClasses}
            >
              <div className={columnHeaderClasses}>
                <span className="text-xs font-medium uppercase tracking-[0.4px] text-body">{column.label}</span>
                <span className="text-xs font-medium text-body">{column.applications.length}</span>
              </div>
              <ul className={cardListClasses}>
                {column.applications.map((job) => (
                  <Card key={job.id} job={job} onOpen={onOpen} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The Pipeline board while its Applications load: the real title, and three columns of two
 * cards in skeleton shapes (sample Applications fill three columns on a first visit).
 */
export function PipelineBoardSkeleton({ title }: { title: string }) {
  return (
    <div className={boardClasses}>
      <div className={boardHeaderClasses}>
        <span className="text-base font-medium text-heading">{title}</span>
        <span className={`${subtitleClasses} h-5`}>
          <CalendarClock className="size-4" aria-hidden />
          <Skeleton className="h-4 w-36" />
        </span>
      </div>
      <div aria-hidden className={columnsClasses}>
        {[0, 1, 2].map((column) => (
          <div key={column} className={columnClasses}>
            <div className={columnHeaderClasses}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-3" />
            </div>
            <ul className={cardListClasses}>
              {[0, 1].map((card) => (
                <li key={card} className={cardClasses}>
                  <Skeleton className="my-0.5 h-4 w-28" />
                  <Skeleton className="mt-1 h-3 w-36" />
                  <Skeleton className="mt-2.5 h-8 w-full" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// Shared by the board and its skeleton, so the two can't drift apart.
// Card (24px radius, 16px padding) → nested surfaces use 24 - 16 = 8px radius.
const boardClasses = "card p-4 text-left";
const boardHeaderClasses = "mb-4 flex flex-wrap items-center justify-between gap-2 px-2 pt-1";
const subtitleClasses = "flex items-center gap-1.5 text-sm text-body";
// Columns stretch to fill the board (auto-fit drops empty tracks) and wrap onto new rows
// rather than scrolling sideways, so no column is hidden off-screen.
const columnsClasses = "grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-4";
const columnClasses = "rounded-control bg-surface p-3";
const columnHeaderClasses = "mb-3 flex items-center justify-between";
const cardListClasses = "m-0 flex list-none flex-col gap-3 p-0";
const cardClasses = "relative rounded-control border border-line bg-card-strong p-3 shadow-xs";

/**
 * One Application on the board, answering "what's next here?": its next Interview (or how long
 * it has been waiting), how many Interviews are completed, and its Outcome once Done. Every
 * Interview, with its Interview notes, is in the side panel.
 */
function Card({ job, onOpen }: { job: Application; onOpen?: (app: Application) => void }) {
  const upcoming = upcomingInterviews(job);
  const next = upcoming[0];
  const completed = job.interviews.filter((interview) => interview.completed);
  const withNotes = completed.filter((interview) => interview.notes).length;
  const hasBody = Boolean(job.outcome || next || job.is_waiting || completed.length > 0);

  return (
    <li
      className={`${cardClasses} ${
        onOpen ? "cursor-pointer transition-all duration-200 hover:border-line-medium hover:shadow-md" : ""
      }`}
    >
      <p className="m-0 min-w-0 text-sm font-medium leading-5 text-heading">
        {onOpen ? (
          // Stretched button: its ::after covers the card, so the whole card opens the Application.
          <button
            type="button"
            onClick={() => onOpen(job)}
            className="cursor-pointer text-left after:absolute after:inset-0 after:rounded-control focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
          >
            <span className="sr-only">Open </span>
            {job.company}
            <span className="sr-only">, {job.title}</span>
          </button>
        ) : (
          job.company
        )}
      </p>
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 min-w-0 text-xs leading-4 text-body">{job.title}</p>
        {job.is_sample && <SampleBadge />}
      </div>
      {hasBody && (
        <div className="mt-2 flex flex-col items-start gap-2 text-xs text-body">
          {job.outcome && <Badge tone={OUTCOME_TONE[job.outcome]}>{OUTCOME_OPTIONS[job.outcome].label}</Badge>}
          {next && <NextInterview interview={next} more={upcoming.length - 1} />}
          {job.is_waiting && <ApplicationWhen app={job} />}
          {completed.length > 0 && <CompletedCount count={completed.length} withNotes={withNotes} />}
        </div>
      )}
    </li>
  );
}

/**
 * The soonest upcoming Interview: its kind badge on the left and its date on the right, then how
 * many more are upcoming. A long kind wraps inside its badge, so the date keeps its place.
 */
function NextInterview({ interview, more }: { interview: Interview; more: number }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="m-0 flex w-full items-center gap-3 rounded-control border border-line bg-surface px-2 py-1.5 text-heading">
        <span className="sr-only">Next Interview: </span>
        <span className="min-w-0">
          <Badge tone={INTERVIEW_TONE[interview.kind]}>{INTERVIEW_OPTIONS[interview.kind].label}</Badge>
        </span>
        <span className="ml-auto shrink-0">
          <InterviewWhen at={interview.at} />
        </span>
      </p>
      {more > 0 && <p className="m-0">+{more} more upcoming</p>}
    </div>
  );
}

/** "3 completed", with a mark when any of them have Interview notes (read in the side panel). */
function CompletedCount({ count, withNotes }: { count: number; withNotes: number }) {
  return (
    <p className="m-0 inline-flex items-center gap-1.5">
      <span aria-hidden>{count} completed</span>
      {withNotes > 0 && <NotebookPen className="size-3.5" aria-hidden />}
      <span className="sr-only">
        {count} completed {count === 1 ? "Interview" : "Interviews"}
        {withNotes > 0 && `, ${withNotes} with notes`}
      </span>
    </p>
  );
}
