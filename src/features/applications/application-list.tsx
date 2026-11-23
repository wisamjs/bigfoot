"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ApplicationRow,
  cellClasses,
  locationCellClasses,
  progressCellClasses,
  rowBorderClasses,
} from "@/features/applications/application-row";
import { useMovedCard } from "@/features/applications/use-moved-card";
import { getApplicationGroups, type Application, type ApplicationGroup } from "@/lib/applications";

// Also draws the landing page's decorative list (src/features/landing/hero.tsx): after a
// layout change, check docs/screenshots/landing.png too.

type Props = {
  applications: Application[];
  /** Show Done Applications other than Offers, after the others. */
  showDone?: boolean;
  /** Makes each row a link to its Application's page. */
  linked?: boolean;
  /** Render as a decorative picture (landing page) instead of readable content. */
  decorative?: boolean;
};

/**
 * The dashboard's Applications: one table, a row per Application, ordered by what they are waiting
 * on (Waiting, Interview scheduled, Offer, and Done on request).
 */
export function ApplicationList({ applications, showDone = false, linked = false, decorative = false }: Props) {
  const groups = getApplicationGroups(applications, { showDone });
  const { listRef, announcement, onChanged } = useMovedCard(applications, showDone);
  const a11y = decorative ? decorativeProps(groups) : {};

  if (groups.length === 0) {
    return (
      <p className="m-0 rounded-control bg-surface p-6 text-center text-sm text-body">
        Open Applications show up here, ordered by whether an Interview is booked.
      </p>
    );
  }

  return (
    <div ref={listRef} className={`flex flex-col gap-3 ${decorative ? "text-left shadow-2xl" : ""}`} {...a11y}>
      {linked && <Announcement text={announcement} />}
      <div className={frameClasses}>
        <table className={tableClasses}>
          <TableHead />
          <tbody>
            {groups.flatMap((group) =>
              group.applications.map((job) => (
                <ApplicationRow
                  key={job.id}
                  job={job}
                  group={group.label}
                  linked={linked}
                  onChanged={linked ? onChanged : undefined}
                />
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHead() {
  return (
    <thead>
      <tr className={headRowClasses}>
        <th scope="col" className={cellClasses}>
          Application
        </th>
        <th scope="col" className={`${cellClasses} ${progressCellClasses}`}>
          Progress
        </th>
        <th scope="col" className={cellClasses}>
          Next
        </th>
        <th scope="col" className={`${cellClasses} ${locationCellClasses}`}>
          Location
        </th>
        <th scope="col" className={cellClasses}>
          <span className="sr-only">Change Status</span>
        </th>
      </tr>
    </thead>
  );
}

/** Says what a row's Change Status menu just did, e.g. "Acme marked Rejected"; screen readers hear it politely. */
function Announcement({ text }: { text: string }) {
  return (
    <output aria-live="polite" className={text ? "text-sm font-medium text-heading" : "sr-only"}>
      {text}
    </output>
  );
}

/** Makes the landing page's list one labelled picture instead of readable content. */
function decorativeProps(groups: ApplicationGroup[]) {
  return { role: "img" as const, "aria-label": `Applications ordered as ${groups.map((g) => g.label).join(", ")}` };
}

/** The Applications table while it loads: its header and four rows in skeleton shapes. */
export function ApplicationListSkeleton() {
  return (
    <div aria-hidden className={frameClasses}>
      <table className={tableClasses}>
        <TableHead />
        <tbody>
          {[0, 1, 2, 3].map((row) => (
            <tr key={row} className={rowBorderClasses}>
              <td className={cellClasses}>
                <Skeleton className="my-0.5 h-4 w-28" />
                <Skeleton className="mt-1 h-3 w-36" />
              </td>
              <td className={`${cellClasses} ${progressCellClasses}`}>
                <Skeleton className="h-3 w-24" />
              </td>
              <td className={cellClasses}>
                <Skeleton className="h-5 w-24" />
              </td>
              <td className={`${cellClasses} ${locationCellClasses}`}>
                <Skeleton className="h-4 w-32" />
              </td>
              <td className={cellClasses}>
                <Skeleton className="size-8" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shared by the table and its skeleton, so the two can't drift apart.
// No overflow-hidden on the frame: it would clip the Change Status menus, which open inside it. The
// corner cells round themselves instead (border-separate lets them).
const frameClasses = "rounded-control border border-line bg-card";
const tableClasses =
  "w-full border-separate border-spacing-0 text-left [&_th:first-child]:rounded-tl-control [&_th:last-child]:rounded-tr-control [&_tr:last-child>td:first-child]:rounded-bl-control [&_tr:last-child>td:last-child]:rounded-br-control";

const headRowClasses = "bg-surface text-xs font-medium uppercase tracking-[0.4px] text-heading";
