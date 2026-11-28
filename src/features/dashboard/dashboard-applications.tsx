"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { AddApplicationLink } from "@/features/applications/add-links";
import { ApplicationList } from "@/features/applications/application-list";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { SORT_PARAM, setViewParams, useDashboardView } from "@/features/dashboard/dashboard-view";
import { ClipboardBigfoot } from "@/features/shell/illustrations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  APPLICATION_SORT_LABELS,
  APPLICATION_SORTS,
  doneWithoutOffer,
  parseApplicationSort,
  type Application,
  type ApplicationSort,
} from "@/lib/applications";

/**
 * The dashboard's Applications card (BIG-173): its heading with Show done and Add Application, then
 * the table, each row a link to its Application's page. A line under the table says how many Done
 * Applications Show done would add. With no Applications at all, Bigfoot and a first Add button.
 * The table sorts by Progress, or by the column the job seeker picks (BIG-209): its headers on wide
 * screens, the "Sort by" menu on a phone. The sort is kept in the dashboard's URL (`?sort=next`).
 */
export function DashboardApplications({ applications }: { applications: Application[] }) {
  const [showDone, setShowDone] = useState(false);
  const doneCount = doneWithoutOffer(applications).length;
  const sort = parseApplicationSort(useDashboardView().get(SORT_PARAM));
  const setSort = (next: ApplicationSort) => setViewParams({ [SORT_PARAM]: next === "progress" ? null : next });

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
        <NoApplications />
      ) : (
        <div className="pb-2">
          <ApplicationList applications={applications} showDone={showDone} linked flush sort={sort} onSort={setSort} />
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

/** "Sort by", on a phone, where the table's column headers are hidden: a menu like Mark done…. */
function SortMenu({ sort, onSort }: { sort: ApplicationSort; onSort: (sort: ApplicationSort) => void }) {
  // The menu opens inside the page's main landmark, not at the end of <body>.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <div ref={setContainer} className="relative sm:hidden">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" aria-label={`Sort by ${APPLICATION_SORT_LABELS[sort]}`}>
            <ArrowUpDown className="size-4" aria-hidden />
            {APPLICATION_SORT_LABELS[sort]}
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" container={container}>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSort(parseApplicationSort(value))}>
            {APPLICATION_SORTS.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {APPLICATION_SORT_LABELS[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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

/** No Applications yet: what the card is for, and a way to add the first one. */
function NoApplications() {
  return (
    <div className="flex flex-col items-center gap-4 border-t border-line px-6 pb-14 pt-10 text-center">
      <ClipboardBigfoot className="h-auto w-[300px] max-w-full" />
      <div className="flex max-w-[460px] flex-col gap-2">
        <h3 className="m-0 text-2xl font-bold leading-[1.25] text-heading">Your search starts here</h3>
        <p className="m-0 text-base leading-[1.7] text-body">
          Add each role as you apply. Bigfoot keeps every Application and what’s next for it in one place, until you
          find yours.
        </p>
      </div>
      <AddApplicationLink>Add your first Application</AddApplicationLink>
    </div>
  );
}
