import type { ReactNode } from "react";
import { AppFooter } from "@/features/shell/app-footer";
import { AppHeader } from "@/features/shell/app-header";
import { HangingBigfoot } from "@/features/shell/illustrations";
import { AddInterviewLink } from "@/features/applications/add-links";
import { ApplicationListSkeleton } from "@/features/applications/application-list";
import { NextInterviewCard } from "@/features/applications/next-interview-card";
import { DashboardApplications } from "@/features/dashboard/dashboard-applications";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { DashboardSummary } from "@/features/dashboard/dashboard-summary";
import { InterviewCalendar, InterviewCalendarSkeleton } from "@/features/dashboard/interview-calendar";
import { Container } from "@/components/ui/container";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import {
  dashboardSummary,
  getCalendarInterviews,
  getUnscheduled,
  getStats,
  nextUp,
  prepTakeaways,
  type Application,
} from "@/lib/applications";
import type { CurrentUser } from "@/lib/current-user";

/**
 * The dashboard (/dashboard) for a job seeker's Applications at `now`: the route loads them, and
 * the Pages/Dashboard stories pass fixed ones (BIG-203).
 */
export function DashboardPage({ user, applications, now }: { user: CurrentUser; applications: Application[]; now: Date }) {
  const next = nextUp(applications);

  return (
    <DashboardLayout
      header={<AppHeader user={user} current="/dashboard" />}
      summary={<DashboardSummary counts={dashboardSummary(applications, now)} />}
      nextUp={
        next && (
          <NextInterviewCard
            on="dashboard"
            app={next.application}
            interview={next.interview}
            lookBack={{ takeaways: prepTakeaways(applications, next.application, next.interview), theyAsked: null }}
          />
        )
      }
      applications={<DashboardApplications applications={applications} />}
      interviews={
        <InterviewCalendar
          interviews={getCalendarInterviews(applications)}
          unscheduled={getUnscheduled(applications)}
          waiting={getStats(applications).waiting}
        />
      }
      addInterview={<AddInterviewLink />}
    />
  );
}

/**
 * The dashboard with skeleton shapes wherever the job seeker's data goes (BIG-73). Text that
 * doesn't wait on data, such as the headings, is real.
 */
export function DashboardPageSkeleton() {
  return (
    <LoadingRegion label="Loading your dashboard…">
      <DashboardLayout
        header={<AppHeader current="/dashboard" />}
        summary={
          <p className="m-0">
            <Skeleton className="inline-block h-4 w-72 max-w-full align-middle" />
          </p>
        }
        nextUp={null}
        applications={
          <DashboardCard
            id="applications-title"
            title="Applications"
            actions={<Skeleton className="h-11 w-44" />}
          >
            <div className="pb-2">
              <ApplicationListSkeleton flush />
            </div>
          </DashboardCard>
        }
        interviews={<InterviewCalendarSkeleton />}
        addInterview={<Skeleton className="h-11 w-40" />}
      />
    </LoadingRegion>
  );
}

/**
 * The dashboard's layout (BIG-173), shared by the page and its skeleton so they can't drift apart:
 * the heading and summary line, with Bigfoot hanging above the Interviews card (BIG-226), then the Applications card, with the Next up card above it (BIG-183),
 * beside the Interviews card on wide screens, one above the other on narrow ones.
 */
function DashboardLayout({
  header,
  summary,
  nextUp,
  applications,
  interviews,
  addInterview,
}: {
  header: ReactNode;
  summary: ReactNode;
  nextUp: ReactNode;
  applications: ReactNode;
  interviews: ReactNode;
  addInterview: ReactNode;
}) {
  return (
    <>
      {header}
      <main id="main" className="py-8 sm:pb-16">
        <Container className="flex flex-col gap-6">
          <div className="relative flex flex-col gap-1">
            {/* Hangs from the header: over the Interviews column on wide screens, at the right of
                the title row below that, clear of the title. Out of the flow, so nothing moves, and
                short enough to end above the summary line. */}
            <HangingBigfoot className="pointer-events-none absolute -top-8 right-0 h-auto w-16 lg:right-[9.375rem] lg:w-20" />
            <h1 className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-heading">Dashboard</h1>
            {summary}
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23.75rem]">
            <div className="flex min-w-0 flex-col gap-6">
              {nextUp}
              {applications}
            </div>
            <DashboardCard id="interviews-title" title="Interviews" actions={addInterview}>
              {interviews}
            </DashboardCard>
          </div>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}
