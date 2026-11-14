import type { Metadata } from "next";
import { Suspense } from "react";
import { BriefcaseBusiness, CalendarCheck } from "lucide-react";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { ApplicationsTable } from "@/components/applications-table";
import { ComingUpCalendar } from "@/components/coming-up-calendar";
import { NextInterviewStat } from "@/components/next-interview-stat";
import { PipelineBoard } from "@/components/pipeline-board";
import { StatCard } from "@/components/stat-card";
import { Container, Wordmark } from "@/components/ui";
import { listApplications, onboard } from "@/lib/api";
import { getStats, getUpcoming } from "@/lib/applications";
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
    <>
      <AppHeader user={user} current="/dashboard" />
      <main className="py-12">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="m-0 mb-2 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">
                Welcome back, {user.firstName}
              </h1>
              <p className="m-0 text-base leading-[1.7] text-body">
                Here’s where the hunt stands this week.
              </p>
            </div>
          </div>

          <section aria-label="Search summary">
            <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-3">
              <StatCard icon={BriefcaseBusiness} label="Open" value={stats.open} note="Applications In Progress" />
              <StatCard icon={CalendarCheck} label="Active" value={stats.active} note="With an upcoming Interview" />
              <NextInterviewStat next={stats.next} />
            </ul>
          </section>

          <section aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="m-0 mb-4 text-xl font-bold leading-[1.25] text-heading">
              Coming up
            </h2>
            <ComingUpCalendar interviews={upcoming} />
          </section>

          <section aria-labelledby="pipeline-title">
            <h2 id="pipeline-title" className="sr-only">
              Pipeline
            </h2>
            <PipelineBoard
              title="Pipeline"
              subtitle={`${upcoming.length} upcoming ${upcoming.length === 1 ? "interview" : "interviews"}`}
              applications={applications}
            />
          </section>

          <section aria-labelledby="apps-title" className="min-w-0">
            <ApplicationsTable applications={applications} />
          </section>
        </Container>
      </main>
      <AppFooter />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="border-b border-line">
        <Container className="flex h-[72px] items-center">
          <Wordmark />
        </Container>
      </header>
      <Container className="flex flex-col gap-8 py-12">
        <span className="sr-only">Loading your dashboard…</span>
        <div className="h-10 w-72 animate-pulse rounded-control bg-card" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-card" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-card bg-card" />
      </Container>
    </div>
  );
}
