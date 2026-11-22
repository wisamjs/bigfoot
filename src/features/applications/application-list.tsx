"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, cardClasses } from "@/features/applications/application-card";
import { getApplicationGroups, type Application } from "@/lib/applications";

// Also draws the landing page's decorative list (src/features/landing/hero.tsx): after a
// layout change, check docs/screenshots/landing.png too.

type Props = {
  applications: Application[];
  /** Show Done Applications other than Offers in a Done group. */
  showDone?: boolean;
  /** Makes each card a link to its Application's page. */
  linked?: boolean;
  /** Render as a decorative picture (landing page) instead of readable content. */
  decorative?: boolean;
};

/**
 * The dashboard's Applications: one full-width group per thing they are waiting on (Waiting,
 * Interview scheduled, Offer, and Done on request), each holding full-width cards.
 */
export function ApplicationList({ applications, showDone = false, linked = false, decorative = false }: Props) {
  const groups = getApplicationGroups(applications, { showDone });
  const a11y = decorative
    ? {
        role: "img" as const,
        "aria-label": `Applications grouped as ${groups.map((g) => g.label).join(", ")}`,
      }
    : {};

  if (groups.length === 0) {
    return (
      <p className="m-0 rounded-control bg-surface p-6 text-center text-sm text-body">
        Open Applications show up here, grouped by whether an Interview is booked.
      </p>
    );
  }

  return (
    <div className={`${listClasses} ${decorative ? "card p-4 text-left shadow-2xl" : ""}`} {...a11y}>
      {groups.map((group) => (
        <section key={group.id} aria-label={decorative ? undefined : group.label} className={groupClasses}>
          <div className={groupHeaderClasses}>
            <span className="text-xs font-medium uppercase tracking-[0.4px] text-body">{group.label}</span>
            <span className="text-xs font-medium text-body">{group.applications.length}</span>
          </div>
          <ul className={cardListClasses}>
            {group.applications.map((job) => (
              <Card key={job.id} job={job} linked={linked} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The Applications list while they load: two groups of two cards in skeleton shapes. */
export function ApplicationListSkeleton() {
  return (
    <div aria-hidden className={listClasses}>
      {[0, 1].map((group) => (
        <div key={group} className={groupClasses}>
          <div className={groupHeaderClasses}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-3" />
          </div>
          <ul className={cardListClasses}>
            {[0, 1].map((card) => (
              <li key={card} className={`${cardClasses} flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4`}>
                <div className="sm:w-64 sm:shrink-0">
                  <Skeleton className="my-0.5 h-4 w-28" />
                  <Skeleton className="mt-1 h-3 w-36" />
                </div>
                <Skeleton className="h-8 w-full sm:max-w-xs" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Shared by the list and its skeleton, so the two can't drift apart.
// A group (8px radius, 12px padding) holds cards that use the same control radius.
const listClasses = "flex flex-col gap-4";
const groupClasses = "rounded-control bg-surface p-3";
const groupHeaderClasses = "mb-3 flex items-center justify-between";
const cardListClasses = "m-0 flex list-none flex-col gap-3 p-0";
