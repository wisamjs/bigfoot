"use client";

import { useId, useState, type ReactNode } from "react";
import { CalendarClock, ChevronDown, ChevronUp, Eye, EyeOff, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SampleBadge } from "@/features/applications/sample-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationWhen, InterviewWhen } from "@/features/applications/application-when";
import { INTERVIEW_TONE, OUTCOME_TONE } from "@/features/applications/status-tone";
import {
  getBoardColumns,
  INTERVIEW_OPTIONS,
  OUTCOME_OPTIONS,
  type Application,
  type Interview,
} from "@/lib/applications";

// Also draws the landing page's decorative board (src/components/landing/hero.tsx): after a
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
                  <Card key={job.id} job={job} onOpen={onOpen} controls={!decorative} />
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

// A ghost icon button (modal close button style) at 24px, the WCAG 2.2 minimum target size.
// `relative z-10` lifts it above the card's stretched open button, so a click stays on it.
const cardControlClasses =
  "relative z-10 inline-grid size-6 cursor-pointer place-items-center rounded-control text-body transition-colors hover:bg-card hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * One Application on the board. With `controls`, the job seeker can hide its completed
 * Interviews and collapse it to its header; both choices last until the page reloads.
 */
function Card({
  job,
  onOpen,
  controls,
}: {
  job: Application;
  onOpen?: (app: Application) => void;
  controls: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const bodyId = useId();
  const hasCompleted = job.interviews.some((interview) => interview.completed);
  const interviews = hideCompleted ? job.interviews.filter((interview) => !interview.completed) : job.interviews;
  // What collapsing hides; a card without any (a brand-new Waiting one) has no collapse button.
  const collapsible = Boolean(job.outcome) || job.interviews.length > 0;

  return (
    <li
      className={`${cardClasses} ${
        onOpen ? "cursor-pointer transition-all duration-200 hover:border-line-medium hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
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
        {controls && (
          <div className="-mt-0.5 -mr-1 flex shrink-0 items-center gap-0.5">
            {hasCompleted && (
              // Toggle button: its name stays fixed and aria-pressed carries the state.
              <button
                type="button"
                aria-pressed={hideCompleted}
                aria-label={`Hide completed Interviews, ${job.company}`}
                title={hideCompleted ? "Show completed Interviews" : "Hide completed Interviews"}
                onClick={() => setHideCompleted((hide) => !hide)}
                className={cardControlClasses}
              >
                {hideCompleted ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
              </button>
            )}
            {collapsible && (
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls={bodyId}
                aria-label={`${collapsed ? "Expand" : "Collapse"} card, ${job.company}`}
                title={collapsed ? "Expand card" : "Collapse card"}
                onClick={() => setCollapsed((c) => !c)}
                className={cardControlClasses}
              >
                {collapsed ? <ChevronDown className="size-4" aria-hidden /> : <ChevronUp className="size-4" aria-hidden />}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 min-w-0 text-xs leading-4 text-body">{job.title}</p>
        {job.is_sample && <SampleBadge />}
      </div>
      <div className={`flex flex-col items-start gap-2 text-xs text-body ${(collapsible && !collapsed) || job.is_waiting ? "mt-2" : ""}`}>
        {collapsible && (
          // Collapsing hides only this part; the header and "Waiting since" stay.
          <div id={bodyId} hidden={collapsed} className="flex w-full flex-col items-start gap-2">
            {job.outcome && (
              <Badge tone={OUTCOME_TONE[job.outcome]}>{OUTCOME_OPTIONS[job.outcome].label}</Badge>
            )}
            {interviews.length > 0 && (
              // Every Interview in date order (undated, then past, then upcoming), one row each.
              <ul aria-label="Interviews" className="m-0 flex w-full list-none flex-col gap-1.5 p-0">
                {interviews.map((interview) => (
                  <InterviewItem key={interview.id} interview={interview} />
                ))}
              </ul>
            )}
          </div>
        )}
        {job.is_waiting && <ApplicationWhen app={job} />}
      </div>
    </li>
  );
}

/**
 * One Interview as a row: its kind on the left, its date on the right. An upcoming one is a
 * coloured badge in a box; a completed one (past or undated) is plain, struck-through grey text.
 * One with Interview notes carries a small mark; the notes themselves are read in the side panel.
 */
function InterviewItem({ interview }: { interview: Interview }) {
  const kind = INTERVIEW_OPTIONS[interview.kind];
  if (interview.completed) {
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border border-transparent px-2 py-0.5 text-body line-through">
        <span>{kind.label}</span>
        {interview.notes && <NotesMark />}
        <span className="ml-auto">
          <InterviewWhen at={interview.at} />
        </span>
        <span className="sr-only">(past)</span>
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line bg-surface px-2 py-1.5 text-heading">
      <Badge tone={INTERVIEW_TONE[interview.kind]}>{kind.label}</Badge>
      {interview.notes && <NotesMark />}
      <span className="ml-auto">
        <InterviewWhen at={interview.at} />
      </span>
    </li>
  );
}

/** Says an Interview has Interview notes, without showing them. */
function NotesMark() {
  return (
    <span className="inline-flex items-center text-body">
      <NotebookPen className="size-3.5" aria-hidden />
      <span className="sr-only">(has notes)</span>
    </span>
  );
}
