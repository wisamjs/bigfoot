import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddApplicationLink } from "@/features/applications/add-links";
import { EmptyApplications, NoApplications } from "@/features/applications/no-applications";
import { applicationHref, applicationsHref } from "@/features/applications/routes";
import { GROUP_TONE } from "@/features/applications/status-tone";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { FolderHugBigfoot } from "@/features/shell/illustrations";
import {
  applicationsCardGroups,
  doneWithoutOffer,
  progressCounts,
  type Application,
  type ApplicationGroup,
} from "@/lib/applications";

/** The most company names a group's row shows before "+N more". */
const NAMES_SHOWN = 3;

/**
 * The dashboard's Applications card (BIG-253): "where do things stand?" at a glance. One row per
 * Progress group with Applications, in Progress order and never Done, each its badge and count, up
 * to three company names, and a link to the Applications behind it. "View all" opens the
 * Applications list: in the heading on wide screens, at the card's foot on a phone. With no
 * Applications, Bigfoot and a first Add button; with every one Done and none an Offer, Bigfoot,
 * "Every Application is wrapped up", and Add Application. Either way, one brand button.
 */
export function DashboardApplications({ applications }: { applications: Application[] }) {
  if (applications.length === 0) {
    return (
      <ApplicationsCard>
        <NoApplications className="border-t border-line" level={3} />
      </ApplicationsCard>
    );
  }

  const groups = applicationsCardGroups(applications);
  if (groups.length === 0) {
    return (
      <ApplicationsCard>
        <AllWrappedUp done={doneWithoutOffer(applications).length} />
      </ApplicationsCard>
    );
  }

  const all = progressCounts(applications).all;
  return (
    <ApplicationsCard
      actions={
        <>
          <span className="hidden sm:contents">
            <ViewAll count={all} />
          </span>
          <AddApplicationLink />
        </>
      }
    >
      <ul className="m-0 list-none p-0">
        {groups.map((group) => (
          <li key={group.id}>
            <GroupRow group={group} />
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-4 py-1 sm:hidden">
        <ViewAll count={all} noun />
      </div>
    </ApplicationsCard>
  );
}

function ApplicationsCard({ actions = null, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <DashboardCard id="applications-title" title="Applications" actions={actions} className="overflow-hidden">
      {children}
    </DashboardCard>
  );
}

/** The grid each group row lays out on wide screens: badge, names, chevron. */
const rowGrid = "sm:grid sm:grid-cols-[184px_minmax(0,1fr)_16px] sm:gap-4";

/**
 * One Progress group as a link: to the Application itself when it's the only one, else to the
 * Applications list filtered to the group. On a phone the names sit under the badge. Its name says
 * where it goes ("Show the 7 Waiting Applications"), then what it shows, as a name must hold the
 * text on screen (WCAG 2.5.3), so it isn't an aria-label.
 */
function GroupRow({ group }: { group: ApplicationGroup }) {
  const [only] = group.applications;
  const count = group.applications.length;
  const link =
    count === 1
      ? { href: applicationHref(only.id), label: `Open ${only.company}, ${only.title}` }
      : { href: applicationsHref(group.id), label: `Show the ${count} ${groupNoun(group)}` };

  return (
    <Link
      href={link.href}
      className={`group flex min-h-12 items-center gap-2 border-t border-line px-4 py-2 transition-colors hover:bg-card-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-6 ${rowGrid}`}
    >
      <span className="sr-only">{link.label}. </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:contents">
        <span>
          <Badge tone={GROUP_TONE[group.id]} pill dot nowrap>
            {group.label} · {count}
          </Badge>
        </span>{" "}
        <Names applications={group.applications} />
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-body-subtle transition group-hover:translate-x-0.5 group-hover:text-heading group-focus-visible:text-heading"
      />
    </Link>
  );
}

/** "Waiting Applications", or "Applications with an Interview scheduled": what a group's link shows. */
function groupNoun(group: ApplicationGroup): string {
  return group.id === "scheduled" ? "Applications with an Interview scheduled" : `${group.label} Applications`;
}

/** "Lumen Bio, Kestrel AI, Northwind Labs +1 more": up to three company names, wrapping on a phone. */
function Names({ applications }: { applications: Application[] }) {
  const more = applications.length - NAMES_SHOWN;
  return (
    <span className="m-0 text-sm leading-5 text-heading">
      {applications
        .slice(0, NAMES_SHOWN)
        .map((app) => app.company)
        .join(", ")}
      {more > 0 && <span className="text-body"> +{more} more</span>}
    </span>
  );
}

/** "View all 13 →" in the heading, or "View all 13 Applications →" at a phone's card foot (`noun`). */
function ViewAll({ count, noun = false }: { count: number; noun?: boolean }) {
  return (
    <ViewAllLink href={applicationsHref()}>
      View all {count}
      {noun ? " Applications" : <span className="sr-only"> Applications</span>}
    </ViewAllLink>
  );
}

function ViewAllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-control text-base font-medium text-fg-brand transition-colors hover:text-fg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {children}
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

/**
 * Every Application Done, none an Offer: no group has anything to show. Bigfoot hugging a folder,
 * Add Application, and a link to the Done ones on the Applications list.
 */
function AllWrappedUp({ done }: { done: number }) {
  return (
    <EmptyApplications
      className="border-t border-line"
      level={3}
      bigfoot={<FolderHugBigfoot className="h-auto w-[220px] max-w-full" />}
      heading="Every Application is wrapped up"
      action={
        <div className="flex flex-col items-center gap-2">
          <AddApplicationLink />
          <ViewAllLink href={applicationsHref("done")}>
            View all {done}
            <span className="sr-only"> Done Applications</span>
          </ViewAllLink>
        </div>
      }
    >
      Add the next role you apply for, or look back at the {done === 1 ? "one" : done} you’ve finished.
    </EmptyApplications>
  );
}

/** The card while the Applications load: its real heading, then four group rows in skeleton shapes. */
export function DashboardApplicationsSkeleton() {
  return (
    <ApplicationsCard actions={<Skeleton className="h-11 w-44" />}>
      <ul aria-hidden className="m-0 list-none p-0">
        {[0, 1, 2, 3].map((row) => (
          <li key={row} className={`flex min-h-12 items-center gap-2 border-t border-line px-4 py-2 sm:px-6 ${rowGrid}`}>
            <span className="flex flex-1 flex-col items-start gap-1 sm:contents">
              <Skeleton className="h-5 w-36 rounded-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </span>
            <Skeleton className="size-4" />
          </li>
        ))}
      </ul>
    </ApplicationsCard>
  );
}
