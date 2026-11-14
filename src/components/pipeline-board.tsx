import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui";
import { ApplicationWhen, InterviewWhen } from "@/components/application-when";
import {
  getBoardColumns,
  INTERVIEW_OPTIONS,
  upcomingInterviews,
  OUTCOME_OPTIONS,
  type Application,
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
        // Columns wrap onto new rows rather than scrolling sideways, so no column is
        // hidden off-screen.
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
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
  const upcoming = upcomingInterviews(job);
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
      {job.outcome ? (
        <Badge tone={OUTCOME_OPTIONS[job.outcome].tone}>{OUTCOME_OPTIONS[job.outcome].label}</Badge>
      ) : upcoming.length > 0 ? (
        // Every upcoming Interview, soonest first, each in its own box so its kind and date stay
        // together: side by side when they fit, the date below when the card is narrow.
        <ul aria-label="Upcoming Interviews" className="m-0 flex list-none flex-col gap-2 p-0">
          {upcoming.map((interview) => (
            <li
              key={interview.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control border border-line bg-surface px-2 py-1.5 text-xs text-body"
            >
              <Badge tone={INTERVIEW_OPTIONS[interview.kind].tone}>{INTERVIEW_OPTIONS[interview.kind].label}</Badge>
              <InterviewWhen at={interview.at} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-body">
          <ApplicationWhen app={job} />
        </div>
      )}
    </li>
  );
}
