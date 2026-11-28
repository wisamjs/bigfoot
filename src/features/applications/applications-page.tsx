import type { ReactElement, ReactNode } from "react";
import { AddApplicationLink } from "@/features/applications/add-links";
import { ApplicationListSkeleton } from "@/features/applications/application-list";
import { ApplicationsCard, FilteredApplications } from "@/features/applications/filtered-applications";
import { AppFooter } from "@/features/shell/app-footer";
import { AppHeader } from "@/features/shell/app-header";
import { SummaryLine } from "@/features/shell/summary-line";
import { Container } from "@/components/ui/container";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { applicationsSummary, type Application } from "@/lib/applications";
import type { CurrentUser } from "@/lib/current-user";

/**
 * The Applications page (/applications, BIG-252): every Application of the job seeker, filtered by
 * Progress and sorted, in one table. The route loads them; the Pages/Applications stories pass fixed
 * ones.
 */
export function ApplicationsPage({ user, applications }: { user: CurrentUser; applications: Application[] }) {
  return (
    <ApplicationsLayout
      header={<AppHeader user={user} current="/applications" />}
      summary={<SummaryLine counts={applicationsSummary(applications)} />}
      // With no Applications, the empty card's own "Add your first Application" is the one brand button.
      add={applications.length > 0 ? <AddApplicationLink /> : undefined}
    >
      <FilteredApplications applications={applications} />
    </ApplicationsLayout>
  );
}

/**
 * The page with skeleton shapes wherever the job seeker's data goes. Text that doesn't wait on
 * data, the heading and the filter's label, is real.
 */
export function ApplicationsPageSkeleton() {
  return (
    <LoadingRegion label="Loading your Applications…">
      <ApplicationsLayout
        header={<AppHeader current="/applications" />}
        summary={
          <p className="m-0">
            <Skeleton className="inline-block h-4 w-56 max-w-full align-middle" />
          </p>
        }
        add={<Skeleton className="h-11 w-44" />}
      >
        <div className="hidden items-center gap-3 lg:flex">
          <span className="text-sm font-medium text-heading">Progress</span>
          <Skeleton className="h-11 w-[38rem] max-w-full" />
        </div>
        <ApplicationsCard label="Applications">
          <div className="flex flex-wrap gap-3 p-4 lg:hidden">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-24" />
          </div>
          <div className="pb-2">
            <ApplicationListSkeleton flush />
          </div>
        </ApplicationsCard>
      </ApplicationsLayout>
    </LoadingRegion>
  );
}

/**
 * The page's layout, shared by the page and its skeleton so they can't drift apart: the heading
 * and summary line, with Add Application on their right on wide screens (below `lg` it moves into
 * the card's toolbar), then the filter and the card.
 */
function ApplicationsLayout({
  header,
  summary,
  add,
  children,
}: {
  header: ReactNode;
  summary: ReactNode;
  add?: ReactElement;
  children: ReactNode;
}) {
  return (
    <>
      {header}
      <main id="main" className="py-8 sm:pb-16">
        <Container className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-heading">Applications</h1>
              {summary}
            </div>
            {add !== undefined && <div className="hidden lg:flex">{add}</div>}
          </div>
          {children}
        </Container>
      </main>
      <AppFooter />
    </>
  );
}
