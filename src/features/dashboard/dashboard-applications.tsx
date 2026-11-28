"use client";

import { useId, useState } from "react";
import { AddApplicationLink } from "@/features/applications/add-links";
import { ApplicationList } from "@/features/applications/application-list";
import { NoApplications } from "@/features/applications/no-applications";
import { SortMenu } from "@/features/applications/sort-menu";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { Switch } from "@/components/ui/switch";
import { doneWithoutOffer, type Application, type ApplicationSort } from "@/lib/applications";

/**
 * The dashboard's Applications card (BIG-173): its heading with Show done and Add Application, then
 * the table, each row a link to its Application's page. A line under the table says how many Done
 * Applications Show done would add. With no Applications at all, Bigfoot and a first Add button.
 * The table sorts by Progress, or by the column the job seeker picks (BIG-209): its headers on wide
 * screens, the "Sort by" menu on a phone. The sort's place in the URL moved to the Applications
 * page (BIG-252), so here it lasts as long as the page; BIG-253 replaces this card with a summary.
 */
export function DashboardApplications({ applications }: { applications: Application[] }) {
  const [showDone, setShowDone] = useState(false);
  const [sort, setSort] = useState<ApplicationSort>("progress");
  const doneCount = doneWithoutOffer(applications).length;

  return (
    <DashboardCard
      id="applications-title"
      title="Applications"
      actions={
        <>
          {applications.length > 1 && <SortMenu sort={sort} onSort={setSort} />}
          {doneCount > 0 && <ShowDoneSwitch checked={showDone} onChange={setShowDone} />}
          <AddApplicationLink />
        </>
      }
    >
      {applications.length === 0 ? (
        <NoApplications className="border-t border-line" level={3} />
      ) : (
        <div className="pb-2">
          <ApplicationList
            applications={applications}
            shown={showDone ? "everything" : "all"}
            linked
            flush
            sort={sort}
            onSort={setSort}
          />
          {doneCount > 0 && !showDone && <HiddenDone count={doneCount} />}
        </div>
      )}
    </DashboardCard>
  );
}

/** Show done, as the Switch Date TBD uses: its label is the 44px touch target. */
function ShowDoneSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-heading">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      Show done
    </label>
  );
}

function HiddenDone({ count }: { count: number }) {
  const one = count === 1;
  return (
    <p className="m-0 px-4 pb-2 pt-3.5 text-[13px] text-body sm:px-6">
      {count} Done {one ? "Application is" : "Applications are"} hidden. Turn on “Show done” to see {one ? "it" : "them"}.
    </p>
  );
}
