import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui";
import { ApplicationWhen, InterviewWhen } from "@/components/application-when";
import {
  getBoardColumns,
  INTERVIEW_OPTIONS,
  OUTCOME_OPTIONS,
  type Application,
  type Interview,
} from "@/lib/applications";

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
    // Card (24px radius, 16px padding) → nested surfaces use 24 - 16 = 8px radius.
    <div className={`card p-4 text-left ${decorative ? "shadow-2xl" : ""}`} {...a11y}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
        <span className="text-base font-medium text-heading">{title}</span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm text-body">
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
        // Columns stretch to fill the board (auto-fit drops empty tracks) and wrap onto new rows
        // rather than scrolling sideways, so no column is hidden off-screen.
        <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-4">
          {columns.map((column) => (
            <section
              key={column.id}
              aria-label={decorative ? undefined : column.label}
              className="rounded-control bg-surface p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.4px] text-body">{column.label}</span>
                <span className="text-xs font-medium text-body">{column.applications.length}</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
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

function Card({ job, onOpen }: { job: Application; onOpen?: (app: Application) => void }) {
  return (
    <li
      className={`relative rounded-control border border-line bg-card-strong p-3 shadow-xs ${
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
              <span className="sr-only">Edit </span>
              {job.company}
              <span className="sr-only">, {job.title}</span>
            </button>
          ) : (
            job.company
          )}
        </p>
        {job.is_sample && <SampleBadge />}
      </div>
      <p className="m-0 mb-2 text-xs leading-4 text-body">{job.title}</p>
      <div className="flex flex-col items-start gap-2 text-xs text-body">
        {job.outcome && (
          <Badge tone={OUTCOME_OPTIONS[job.outcome].tone}>{OUTCOME_OPTIONS[job.outcome].label}</Badge>
        )}
        {job.interviews.length > 0 && (
          // Every Interview in date order (undated, then past, then upcoming), one row each.
          <ul aria-label="Interviews" className="m-0 flex w-full list-none flex-col gap-1.5 p-0">
            {job.interviews.map((interview) => (
              <InterviewItem key={interview.id} interview={interview} />
            ))}
          </ul>
        )}
        {job.is_waiting && <ApplicationWhen app={job} />}
      </div>
    </li>
  );
}

/**
 * One Interview as a row: its kind on the left, its date on the right. An upcoming one is a
 * coloured badge in a box; a completed one (past or undated) is plain, struck-through grey text.
 */
function InterviewItem({ interview }: { interview: Interview }) {
  const kind = INTERVIEW_OPTIONS[interview.kind];
  if (interview.completed) {
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border border-transparent px-2 py-0.5 text-body line-through">
        <span>{kind.label}</span>
        <span className="ml-auto">
          <InterviewWhen at={interview.at} />
        </span>
        <span className="sr-only">(past)</span>
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line bg-surface px-2 py-1.5 text-heading">
      <Badge tone={kind.tone}>{kind.label}</Badge>
      <span className="ml-auto">
        <InterviewWhen at={interview.at} />
      </span>
    </li>
  );
}
