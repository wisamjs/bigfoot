"use client";

import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, cardClasses } from "@/features/applications/pipeline-card";
import { getBoardColumns, type Application } from "@/lib/applications";

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
  /** Makes each card a link to its Application's page. */
  linked?: boolean;
  /** Render as a decorative picture (landing page) instead of readable content. */
  decorative?: boolean;
};

export function PipelineBoard({
  title,
  subtitle,
  applications,
  showDone = false,
  actions,
  linked = false,
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
                  <Card key={job.id} job={job} linked={linked} />
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
