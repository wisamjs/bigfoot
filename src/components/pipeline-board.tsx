import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui";
import { BOARD_STAGES, type Application } from "@/lib/mock-data";

type Props = {
  title: string;
  subtitle: string;
  applications: Application[];
  /** Render as a decorative picture (landing page) instead of readable content. */
  decorative?: boolean;
};

export function PipelineBoard({ title, subtitle, applications, decorative = false }: Props) {
  const a11y = decorative
    ? {
        role: "img" as const,
        "aria-label": `${title}: pipeline board with ${BOARD_STAGES.join(", ")} columns`,
      }
    : {};

  return (
    // Card (24px radius, 16px padding) → nested surfaces use 24 - 16 = 8px radius.
    <div className={`card p-4 text-left ${decorative ? "shadow-2xl" : ""}`} {...a11y}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
        <span className="text-base font-medium text-heading">{title}</span>
        <span className="flex items-center gap-1.5 text-sm text-body">
          <CalendarClock className="size-4" aria-hidden />
          {subtitle}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BOARD_STAGES.map((stage) => {
          const jobs = applications.filter((a) => a.stage === stage);
          return (
            <section key={stage} aria-label={decorative ? undefined : stage} className="rounded-control bg-surface p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.4px] text-body">{stage}</span>
                <span className="text-xs font-medium text-body">{jobs.length}</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {jobs.map((job) => (
                  <li key={job.id} className="rounded-control border border-line bg-card-strong p-3 shadow-xs">
                    <p className="m-0 text-sm font-medium leading-5 text-heading">{job.company}</p>
                    <p className="m-0 mb-2 text-xs leading-4 text-body">{job.role}</p>
                    <Badge tone={job.status.tone}>{job.status.label}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
