import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AppFooter } from "@/features/shell/app-footer";
import { AppHeader } from "@/features/shell/app-header";
import { AddInterviewLink } from "@/features/applications/add-links";
import { ApplicationListSkeleton } from "@/features/applications/application-list";
import { DashboardApplications } from "@/features/dashboard/dashboard-applications";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { InterviewCalendar, InterviewCalendarSkeleton } from "@/features/dashboard/interview-calendar";
import { Container } from "@/components/ui/container";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { getApplications } from "@/lib/api";
import { dashboardSummary, getCalendarInterviews, getStats } from "@/lib/applications";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Dashboard · Bigfoot",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await getCurrentUser();
  const applications = await getApplications(user.id);

  return (
    <DashboardLayout
      header={<AppHeader user={user} current="/dashboard" />}
      summary={dashboardSummary(applications)}
      applications={<DashboardApplications applications={applications} />}
      interviews={
        <InterviewCalendar interviews={getCalendarInterviews(applications)} waiting={getStats(applications).waiting} />
      }
      addInterview={<AddInterviewLink />}
    />
  );
}

/**
 * The dashboard with skeleton shapes wherever the job seeker's data goes (BIG-73). Text that
 * doesn't wait on data, such as the headings, is real.
 */
function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading your dashboard…">
      <DashboardLayout
        header={<AppHeader current="/dashboard" />}
        summary={<Skeleton className="inline-block h-4 w-72 max-w-full align-middle" />}
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
 * the heading and summary line, then the Applications card beside the Interviews card on wide
 * screens, one above the other on narrow ones.
 */
function DashboardLayout({
  header,
  summary,
  applications,
  interviews,
  addInterview,
}: {
  header: ReactNode;
  summary: ReactNode;
  applications: ReactNode;
  interviews: ReactNode;
  addInterview: ReactNode;
}) {
  return (
    <>
      {header}
      <main id="main" className="py-8 sm:pb-16">
        <Container className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-heading">Dashboard</h1>
            <p className="m-0 text-body">{summary}</p>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23.75rem]">
            {applications}
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
