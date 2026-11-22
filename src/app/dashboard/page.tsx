import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { BriefcaseBusiness, CalendarCheck, CalendarClock } from "lucide-react";
import { AppFooter } from "@/features/shell/appFooter";
import { AppHeader } from "@/features/shell/appHeader";
import { AddApplicationLink, AddInterviewLink } from "@/features/applications/addLinks";
import { InterviewCalendar, InterviewCalendarSkeleton } from "@/features/dashboard/interviewCalendar";
import { NextInterviewStat } from "@/features/dashboard/nextInterviewStat";
import { DashboardApplications } from "@/features/dashboard/dashboardApplications";
import { ApplicationListSkeleton } from "@/features/applications/applicationList";
import { StatCard } from "@/components/ui/statCard";
import { Container } from "@/components/ui/container";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { listApplications, onboard } from "@/lib/api";
import { getCalendarInterviews, getStats } from "@/lib/applications";
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

  return (
    <DashboardLayout
      header={<AppHeader user={user} current="/dashboard" />}
      greeting={`Welcome back, ${user.firstName}`}
      addInterview={<AddInterviewLink />}
      addApplication={<AddApplicationLink />}
      stats={
        <>
          <StatCard icon={BriefcaseBusiness} label="Open" value={stats.open} note="Applications In Progress" />
          <StatCard icon={CalendarCheck} label="Active" value={stats.active} note="With an upcoming Interview" />
          <NextInterviewStat next={stats.next} />
        </>
      }
      calendar={<InterviewCalendar interviews={getCalendarInterviews(applications)} />}
      applicationsSubtitle={stats.waiting === 0 ? "None waiting on a reply" : `${stats.waiting} waiting on a reply`}
      applications={<DashboardApplications applications={applications} />}
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
        addInterview={<Skeleton className="h-11 w-40" />}
        addApplication={<Skeleton className="h-11 w-48" />}
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
        calendar={<InterviewCalendarSkeleton />}
        applicationsSubtitle={<Skeleton className="inline-block h-4 w-36 align-middle" />}
        applications={<ApplicationListSkeleton />}
      />
    </LoadingRegion>
  );
}

/** The dashboard's layout, shared by the page and its skeleton so they can't drift apart. */
function DashboardLayout({
  header,
  greeting,
  addInterview,
  addApplication,
  stats,
  calendar,
  applicationsSubtitle,
  applications,
}: {
  header: ReactNode;
  greeting: ReactNode;
  addInterview: ReactNode;
  addApplication: ReactNode;
  stats: ReactNode;
  calendar: ReactNode;
  applicationsSubtitle: ReactNode;
  applications: ReactNode;
}) {
  return (
    <>
      {header}
      <main id="main" className="py-12">
        <Container className="flex flex-col gap-8">
          <div>
            <h1 className="m-0 mb-2 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">
              {greeting}
            </h1>
            <p className="m-0 text-base leading-[1.7] text-body">Here’s where the hunt stands this week.</p>
          </div>

          <section aria-label="Search summary">
            <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:gap-6">{stats}</ul>
          </section>

          <section aria-labelledby="interviews-title">
            <SectionHeading id="interviews-title" title="Interviews" action={addInterview} />
            {calendar}
          </section>

          <section aria-labelledby="applications-title">
            <SectionHeading
              id="applications-title"
              title="Applications"
              subtitle={applicationsSubtitle}
              action={addApplication}
            />
            {applications}
          </section>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}

/** A dashboard section's h2 with its own Add button, and an optional subtitle under the h2. */
function SectionHeading({
  id,
  title,
  subtitle,
  action,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id={id} className="m-0 text-xl font-bold leading-[1.25] text-heading">
          {title}
        </h2>
        {subtitle ? <p className="m-0 mt-1 text-sm text-body">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
