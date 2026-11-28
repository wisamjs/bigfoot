"use client";

import { ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApplicationRow,
  cellClasses,
  locationCellClasses,
  nextCellClasses,
  progressCellClasses,
  rowBorderClasses,
} from "@/features/applications/application-row";
import {
  APPLICATION_SORT_LABELS,
  getApplicationGroups,
  sortApplications,
  type Application,
  type ApplicationListRow,
  type ApplicationSort,
  type ProgressFilter,
} from "@/lib/applications";

// Also draws the landing page's decorative list (src/features/landing/hero.tsx): after a
// layout change, check docs/screenshots/landing.png too.

type Props = {
  applications: Application[];
  /** Which Applications show (BIG-252): In Progress ones and Offers by default. */
  shown?: ProgressFilter;
  /** Makes each row a link to its Application's page. */
  linked?: boolean;
  /** Render as a decorative picture (landing page) instead of readable content. */
  decorative?: boolean;
  /** Draw the table edge to edge inside a card (the Applications page's) instead of in a frame of its own. */
  flush?: boolean;
  /**
   * Sorts the rows (BIG-209), and with `onSort` makes each column header a button that sorts by
   * it. Without one, rows are in their Progress groups (Interview scheduled, Next round · date TBD,
   * Waiting, Offer, then Done), as the landing page shows them.
   */
  sort?: ApplicationSort;
  onSort?: (sort: ApplicationSort) => void;
};

/**
 * The Applications list: one table, a row per Application `shown`, in `sort` order, or in their
 * Progress groups.
 */
export function ApplicationList({
  applications,
  shown = "all",
  linked = false,
  decorative = false,
  flush = false,
  sort,
  onSort,
}: Props) {
  const rows = listRows(applications, shown, sort);
  const a11y = decorative ? decorativeProps(rows) : {};
  const look = flush ? FLUSH : FRAMED;

  if (rows.length === 0) {
    return (
      <p className={`m-0 rounded-control bg-surface p-6 text-center text-sm text-body ${look.empty}`}>
        Open Applications show up here, ordered by whether an Interview is booked.
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${decorative ? "text-left shadow-2xl" : ""}`} {...a11y}>
      <div className={look.frame}>
        <table className={look.table}>
          <TableHead flush={flush} sort={sort} onSort={onSort} />
          <tbody>
            {rows.map(({ application, group }) => (
              <ApplicationRow key={application.id} job={application} group={group} linked={linked} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function listRows(applications: Application[], shown: ProgressFilter, sort: ApplicationSort | undefined): ApplicationListRow[] {
  if (sort) return sortApplications(applications, { sort, shown });
  return getApplicationGroups(applications, { shown }).flatMap((group) =>
    group.applications.map((application) => ({ application, group })),
  );
}

type SortProps = { sort?: ApplicationSort; onSort?: (sort: ApplicationSort) => void };

function TableHead({ flush = false, sort, onSort }: { flush?: boolean } & SortProps) {
  return (
    <thead>
      <tr className={(flush ? FLUSH : FRAMED).headRow}>
        <ColumnHead column="application" className={cellClasses} sort={sort} onSort={onSort} />
        <ColumnHead column="progress" className={`${cellClasses} ${progressCellClasses}`} sort={sort} onSort={onSort} />
        <ColumnHead column="next" className={`${cellClasses} ${nextCellClasses}`} sort={sort} onSort={onSort} />
        <ColumnHead column="location" className={`${cellClasses} ${locationCellClasses}`} sort={sort} onSort={onSort} />
        <th scope="col" className={cellClasses}>
          <span className="sr-only">Opens the Application</span>
        </th>
      </tr>
    </thead>
  );
}

/**
 * A column's header. With `onSort`, a button that sorts the table by the column; the column it is
 * sorted by shows an arrow and tells screen readers through aria-sort.
 */
function ColumnHead({ column, className, sort, onSort }: { column: ApplicationSort; className: string } & SortProps) {
  const label = APPLICATION_SORT_LABELS[column];
  if (!onSort) {
    return (
      <th scope="col" className={className}>
        {label}
      </th>
    );
  }
  const active = sort === column;
  return (
    <th scope="col" className={className} aria-sort={active ? "ascending" : undefined}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`-mx-1 inline-flex items-center gap-1 rounded-control px-1 uppercase transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-brand pointer-coarse:min-h-11 ${active ? "text-heading" : ""}`}
      >
        {label}
        <ArrowDown aria-hidden className={`size-3.5 ${active ? "" : "invisible"}`} />
      </button>
    </th>
  );
}

/** Makes the landing page's list one labelled picture instead of readable content. */
function decorativeProps(rows: ApplicationListRow[]) {
  const labels = [...new Set(rows.map((row) => row.group.label))];
  return { role: "img" as const, "aria-label": `Applications ordered as ${labels.join(", ")}` };
}

/** The Applications table while it loads: its header and four rows in skeleton shapes. */
export function ApplicationListSkeleton({ flush = false }: { flush?: boolean }) {
  const look = flush ? FLUSH : FRAMED;
  return (
    <div aria-hidden className={look.frame}>
      <table className={look.table}>
        <TableHead flush={flush} />
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
              <td className={`${cellClasses} ${nextCellClasses}`}>
                <Skeleton className="h-5 w-24" />
              </td>
              <td className={`${cellClasses} ${locationCellClasses}`}>
                <Skeleton className="h-4 w-32" />
              </td>
              <td className={cellClasses}>
                <Skeleton className="size-4" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shared by the table and its skeleton, so the two can't drift apart.
// No overflow-hidden on the frame: the corner cells round themselves instead (border-separate lets them).
const frameClasses = "rounded-control border border-line bg-card";
const tableClasses =
  "w-full border-separate border-spacing-0 text-left [&_th:first-child]:rounded-tl-control [&_th:last-child]:rounded-tr-control [&_tr:last-child>td:first-child]:rounded-bl-control [&_tr:last-child>td:last-child]:rounded-br-control";

const headRowClasses = "bg-surface text-xs font-medium uppercase tracking-[0.4px] text-heading";
// Inside the dashboard's card: no frame or rounded corners, a tinted head row between rules, and
// the first and last columns lined up with the card's heading.
const flushTableClasses =
  "w-full border-separate border-spacing-0 text-left [&_tr>*:first-child]:pl-4 sm:[&_tr>*:first-child]:pl-6 [&_tr>*:last-child]:pr-2 sm:[&_tr>*:last-child]:pr-4";
const flushHeadRowClasses =
  "bg-card-strong text-xs font-semibold uppercase tracking-[0.04em] text-body [&>th]:border-t [&>th]:border-line [&>th]:py-2.5";

/** The table in a frame of its own (the landing page), or edge to edge in the dashboard's card. */
const FRAMED = { frame: frameClasses, table: tableClasses, headRow: headRowClasses, empty: "" };
const FLUSH = { frame: "", table: flushTableClasses, headRow: flushHeadRowClasses, empty: "mx-4 sm:mx-6" };
