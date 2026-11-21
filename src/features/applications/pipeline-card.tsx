"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ApplicationWhen, InterviewWhen } from "@/features/applications/application-when";
import { SampleBadge } from "@/features/applications/sample-badge";
import { INTERVIEW_TONE, OUTCOME_TONE } from "@/features/applications/status-tone";
import { INTERVIEW_OPTIONS, OUTCOME_OPTIONS, type Application, type Interview } from "@/lib/applications";

/** A card on the Pipeline board, also drawn in skeleton shape while the board loads. */
export const cardClasses = "relative rounded-control border border-line bg-card-strong p-3 shadow-xs";

// A ghost icon button (modal close button style) at 24px, the WCAG 2.2 minimum target size.
// `relative z-10` lifts it above the card's stretched open button, so a click stays on it.
const cardControlClasses =
  "relative z-10 inline-grid size-6 cursor-pointer place-items-center rounded-control text-body transition-colors hover:bg-card hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * One Application on the board. With `controls`, the job seeker can hide its completed
 * Interviews and collapse it to its header; both choices last until the page reloads.
 */
export function Card({
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
