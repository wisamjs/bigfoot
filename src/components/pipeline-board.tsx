import { CalendarClock } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui";
import { getBoardColumns, ROUND_OPTIONS, STAGE_OPTIONS, type Application } from "@/lib/applications";

type Props = {
  title: string;
  subtitle: string;
  applications: Application[];
  /** Render as a decorative picture (landing page) instead of readable content. */
  decorative?: boolean;
};

export function PipelineBoard({ title, subtitle, applications, decorative = false }: Props) {
  const columns = getBoardColumns(applications);
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
        <span className="flex items-center gap-1.5 text-sm text-body">
          <CalendarClock className="size-4" aria-hidden />
          {subtitle}
        </span>
      </div>
      {columns.length === 0 ? (
        <p className="m-0 rounded-control bg-surface p-6 text-center text-sm text-body">
          Open applications show up here, grouped by their next round.
        </p>
      ) : (
        // Columns wrap onto new rows rather than scrolling sideways, so the later rounds and
        // Offer are never hidden off-screen.
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
                {column.applications.map((job) => {
                  const badge =
                    job.stage === "offer"
                      ? STAGE_OPTIONS.offer
                      : job.previous_round
                        ? { ...ROUND_OPTIONS[job.previous_round], label: `After ${ROUND_OPTIONS[job.previous_round].label}` }
                        : null;
                  return (
                    <li key={job.id} className="rounded-control border border-line bg-card-strong p-3 shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="m-0 min-w-0 text-sm font-medium leading-5 text-heading">{job.company}</p>
                        {job.is_sample && <SampleBadge />}
                      </div>
                      <p className={`m-0 text-xs leading-4 text-body ${badge ? "mb-2" : ""}`}>{job.title}</p>
                      {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
