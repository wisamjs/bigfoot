import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { BriefcaseBusiness, CalendarCheck, CalendarClock } from "lucide-react";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { AddApplicationButton } from "@/components/application-panel";
import { ComingUpCalendar, ComingUpCalendarSkeleton } from "@/components/coming-up-calendar";
import { NextInterviewStat } from "@/components/next-interview-stat";
import { DashboardPipeline } from "@/components/dashboard-pipeline";
import { PipelineBoardSkeleton } from "@/components/pipeline-board";
import { StatCard } from "@/components/stat-card";
import { Container, LoadingRegion, Skeleton } from "@/components/ui";
import { listApplications, onboard } from "@/lib/api";
import { getCalendarInterviews, getStats, getUpcoming } from "@/lib/applications";
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
  await onboard(user.id);
  const applications = await listApplications(user.id);
  const stats = getStats(applications);
  const upcoming = getUpcoming(applications);

  return (
    <DashboardLayout
      header={<AppHeader user={user} current="/dashboard" />}
      greeting={`Welcome back, ${user.firstName}`}
      addButton={<AddApplicationButton />}
      stats={
        <>
          <StatCard icon={BriefcaseBusiness} label="Open" value={stats.open} note="Applications In Progress" />
          <StatCard icon={CalendarCheck} label="Active" value={stats.active} note="With an upcoming Interview" />
          <NextInterviewStat next={stats.next} />
        </>
      }
      calendar={<ComingUpCalendar interviews={getCalendarInterviews(applications)} />}
      pipeline={
        <DashboardPipeline
          subtitle={`${upcoming.length} upcoming ${upcoming.length === 1 ? "interview" : "interviews"}`}
          applications={applications}
        />
      }
    />
  );
}

/**
 * The dashboard with skeleton shapes wherever the job seeker's data goes (BIG-73). Text that
 * doesn't wait on data, such as the headings and stat labels, is real.
 */
function DashboardSkeleton() {
  const value = <Skeleton className="inline-block h-7 w-12 align-middle" />;
  return (
    <LoadingRegion label="Loading your dashboard…">
      <DashboardLayout
        header={<AppHeader current="/dashboard" />}
        greeting={<Skeleton className="inline-block h-8 w-80 max-w-full align-middle md:h-9" />}
        addButton={<Skeleton className="h-11 w-44" />}
        stats={
          <>
            <StatCard icon={BriefcaseBusiness} label="Open" value={value} note="Applications In Progress" />
            <StatCard icon={CalendarCheck} label="Active" value={value} note="With an upcoming Interview" />
            <StatCard
              icon={CalendarClock}
              label="Next Interview"
              value={value}
              note={<Skeleton className="inline-block h-3 w-32 align-middle" />}
            />
          </>
        }
        calendar={<ComingUpCalendarSkeleton />}
        pipeline={<PipelineBoardSkeleton title="Pipeline" />}
      />
    </LoadingRegion>
  );
}

/** The dashboard's layout, shared by the page and its skeleton so they can't drift apart. */
function DashboardLayout({
  header,
  greeting,
  addButton,
  stats,
  calendar,
  pipeline,
}: {
  header: ReactNode;
  greeting: ReactNode;
  addButton: ReactNode;
  stats: ReactNode;
  calendar: ReactNode;
  pipeline: ReactNode;
}) {
  return (
    <>
      {header}
      <main className="py-12">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="m-0 mb-2 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">
                {greeting}
              </h1>
              <p className="m-0 text-base leading-[1.7] text-body">
                Here’s where the hunt stands this week.
              </p>
            </div>
            {addButton}
          </div>

          <section aria-label="Search summary">
            <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-3">{stats}</ul>
          </section>

          <section aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="m-0 mb-4 text-xl font-bold leading-[1.25] text-heading">
              Coming up
            </h2>
            {calendar}
          </section>

          <section aria-labelledby="pipeline-title">
            <h2 id="pipeline-title" className="sr-only">
              Pipeline
            </h2>
            {pipeline}
          </section>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}
