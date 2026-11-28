"use client";

import type { ReactNode } from "react";
import { AddApplicationLink } from "@/features/applications/add-links";
import { ApplicationList } from "@/features/applications/application-list";
import { useApplicationsView } from "@/features/applications/applications-view";
import { NoApplications, NoMatchingApplications } from "@/features/applications/no-applications";
import {
  ClearFilter,
  FilterStatus,
  progressLabel,
  ProgressMenu,
  ProgressToggleGroup,
} from "@/features/applications/progress-filter";
import { SortMenu } from "@/features/applications/sort-menu";
import { progressCounts, type Application } from "@/lib/applications";

/**
 * The Applications page's list (BIG-252), below its heading: the Progress filter (a toggle group
 * over the card on wide screens), then the card with the table. Below `lg` the card opens with a
 * toolbar: Sort by (on a phone, where the column headers are hidden), the filter's menu button, and
 * Add Application. Filter and sort are in the URL (useApplicationsView). A line under the table says
 * how many Done Applications the Done filter would show.
 */
export function FilteredApplications({ applications }: { applications: Application[] }) {
  const { progress, sort, setProgress, setSort } = useApplicationsView();

  if (applications.length === 0) {
    return (
      <ApplicationsCard label="Applications">
        <NoApplications />
      </ApplicationsCard>
    );
  }

  const counts = progressCounts(applications);
  const shown = counts[progress];
  const filter = { progress, counts, onProgress: setProgress };
  const label = progressLabel(progress);

  return (
    <>
      <div className="hidden flex-wrap items-center justify-between gap-4 lg:flex">
        <ProgressToggleGroup {...filter} />
        <FilterStatus {...filter} shown={shown} />
      </div>

      <ApplicationsCard label={`${label} Applications`}>
        <div className="flex flex-col p-4 lg:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {applications.length > 1 && <SortMenu sort={sort} onSort={setSort} />}
            <ProgressMenu {...filter} />
            <AddApplicationLink />
          </div>
          {/* Empty while unfiltered: the live region stays, without the gap. */}
          <FilterStatus {...filter} shown={shown} className={progress === "all" ? "" : "mt-3 justify-between"} />
        </div>

        {shown === 0 && progress !== "all" ? (
          <NoMatchingApplications
            label={label}
            action={<ClearFilter variant="brand" onClear={() => setProgress("all")} />}
            className="border-t border-line lg:border-t-0"
          />
        ) : (
          <div className="pb-2">
            <ApplicationList applications={applications} shown={progress} linked flush sort={sort} onSort={setSort} />
            {counts.done > 0 && progress !== "done" && <DoneNotShown count={counts.done} />}
          </div>
        )}
      </ApplicationsCard>
    </>
  );
}

/**
 * The card the table sits in, edge to edge, named for what it shows ("Waiting Applications"). On
 * wide screens the table's head row opens it, so the card clips its corners and drops the row's top
 * rule; below `lg` the toolbar opens it, and its menus mustn't be clipped.
 */
export function ApplicationsCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="card flex min-w-0 flex-col border-line-brand-subtle lg:overflow-hidden lg:[&_thead_th]:border-t-0"
    >
      {children}
    </section>
  );
}

/** "4 Done Applications aren't shown. Pick Done to see them." */
function DoneNotShown({ count }: { count: number }) {
  const one = count === 1;
  return (
    <p className="m-0 px-4 pb-2 pt-3.5 text-[13px] text-body sm:px-6">
      {count} Done {one ? "Application isn’t" : "Applications aren’t"} shown. Pick Done to see {one ? "it" : "them"}.
    </p>
  );
}
