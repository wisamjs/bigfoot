"use client";

import { NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ApplicationWhen, InterviewWhen } from "@/features/applications/application-when";
import { SampleBadge } from "@/features/applications/sample-badge";
import { INTERVIEW_TONE, OUTCOME_TONE } from "@/features/applications/status-tone";
import {
  INTERVIEW_OPTIONS,
  OUTCOME_OPTIONS,
  upcomingInterviews,
  type Application,
  type Interview,
} from "@/lib/applications";

/** A card in the Applications list, also drawn in skeleton shape while the list loads. */
export const cardClasses = "relative rounded-control border border-line bg-card-strong p-3 shadow-xs";

/**
 * One Application in the list, answering "what's next here?": its next Interview (or how long
 * it has been waiting), any Interview whose date is needed, how many Interviews are completed, and
 * its Outcome once Done. Every Interview, with its Interview notes, is in the side panel. From
 * `sm` up, it is one row: company and role, then the next Interview, then the completed count.
 */
export function Card({ job, onOpen }: { job: Application; onOpen?: (app: Application) => void }) {
  const upcoming = upcomingInterviews(job);
  const next = upcoming[0];
  // Saved before dates were required (docs/adr/0005): they count as completed, but show as needing a date.
  const dateNeeded = job.interviews.filter((interview) => interview.at === null);
  const completed = job.interviews.filter((interview) => interview.completed && interview.at !== null);
  const withNotes = completed.filter((interview) => interview.notes).length;
  const hasBody = Boolean(job.outcome || next || job.is_waiting || dateNeeded.length > 0 || completed.length > 0);

  return (
    <li
      className={`${cardClasses} ${
        onOpen ? "cursor-pointer transition-all duration-200 hover:border-line-medium hover:shadow-md" : ""
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 sm:w-64 sm:shrink-0">
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
        </div>
        {hasBody && (
          <div className="flex min-w-0 flex-col items-start gap-2 text-xs text-body sm:flex-1 sm:flex-row sm:items-center sm:gap-4">
            {job.outcome && <Badge tone={OUTCOME_TONE[job.outcome]}>{OUTCOME_OPTIONS[job.outcome].label}</Badge>}
            {next && <NextInterview interview={next} more={upcoming.length - 1} />}
            {job.is_waiting && <ApplicationWhen app={job} />}
            {dateNeeded.map((interview) => (
              <InterviewLine key={interview.id} interview={interview} label="Interview with no date: " />
            ))}
            {completed.length > 0 && (
              <span className="sm:ml-auto">
                <CompletedCount count={completed.length} withNotes={withNotes} />
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * The soonest upcoming Interview: its kind badge on the left and its date on the right, then how
 * many more are upcoming. A long kind wraps inside its badge, so the date keeps its place.
 */
function NextInterview({ interview, more }: { interview: Interview; more: number }) {
  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto sm:max-w-sm">
      <InterviewLine interview={interview} label="Next Interview: " />
      {more > 0 && <p className="m-0">+{more} more upcoming</p>}
    </div>
  );
}

/** One Interview: its kind badge on the left and its date (or "Date needed") on the right. */
function InterviewLine({ interview, label }: { interview: Interview; label: string }) {
  return (
    <p className="m-0 flex w-full items-center gap-3 rounded-control border border-line bg-surface px-2 py-1.5 text-heading">
      <span className="sr-only">{label}</span>
      <span className="min-w-0">
        <Badge tone={INTERVIEW_TONE[interview.kind]}>{INTERVIEW_OPTIONS[interview.kind].label}</Badge>
      </span>
      <span className="ml-auto shrink-0">
        <InterviewWhen at={interview.at} />
      </span>
    </p>
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
