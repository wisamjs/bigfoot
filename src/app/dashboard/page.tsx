import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, CalendarCheck, CalendarClock, Gift, MessageSquareReply } from "lucide-react";
import { SignOutButton } from "@/components/auth-button";
import { ApplicationsTable } from "@/components/applications-table";
import { LocalTime } from "@/components/local-time";
import { PipelineBoard } from "@/components/pipeline-board";
import { Container, Wordmark } from "@/components/ui";
import { listApplications } from "@/lib/api";
import { getStats, getUpcoming, ROUND_OPTIONS } from "@/lib/applications";
import { getCurrentUser, type CurrentUser } from "@/lib/dal";

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
  const applications = await listApplications(user.id);
  const stats = getStats(applications);
  const upcoming = getUpcoming(applications);

  return (
    <>
      <DashboardHeader user={user} />
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
            <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={BriefcaseBusiness} label="Active applications" value={stats.active} />
              <StatCard icon={CalendarCheck} label="Interviewing" value={stats.interviewing} />
              <StatCard icon={MessageSquareReply} label="Response rate" value={`${stats.responseRate}%`} />
              <StatCard
                icon={Gift}
                label="Offers"
                value={stats.offers}
                note={stats.offers > 0 ? "You found your Bigfoot." : "Still out there."}
              />
            </ul>
          </section>

          <section aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="m-0 mb-4 text-xl font-bold leading-[1.25] text-heading">
              Coming up
            </h2>
            {upcoming.length === 0 ? (
              <p className="card m-0 p-6 text-sm text-body">
                Add a next round date to an application and it shows up here.
              </p>
            ) : (
              <ol className="card m-0 grid list-none grid-cols-1 gap-x-6 gap-y-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex min-w-0 items-start gap-3">
                    <span className="icon-shape size-8 shrink-0 rounded-control">
                      <CalendarClock className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-medium leading-5 text-heading">
                        {a.next_round ? ROUND_OPTIONS[a.next_round].label : "Next round"} · {a.company}
                      </p>
                      <p className="m-0 text-sm leading-[1.6] text-body">
                        <LocalTime iso={a.next_round_at} />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="pipeline-title">
            <h2 id="pipeline-title" className="sr-only">
              Pipeline
            </h2>
            <PipelineBoard
              title="Pipeline"
              subtitle={`${upcoming.length} upcoming ${upcoming.length === 1 ? "round" : "rounds"}`}
              applications={applications}
            />
          </section>

          <section aria-labelledby="apps-title" className="min-w-0">
            <ApplicationsTable applications={applications} />
          </section>
        </Container>
      </main>
      <footer className="border-t border-line py-6">
        <Container className="flex flex-wrap justify-between gap-2 text-sm leading-[1.6] text-body">
          <p className="m-0">Bigfoot</p>
          <Link
            href="/privacy"
            className="rounded-control underline underline-offset-4 transition-colors hover:text-heading"
          >
            Privacy Policy
          </Link>
        </Container>
      </footer>
    </>
  );
}

function DashboardHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-surface">
      <Container className="flex h-[72px] items-center justify-between gap-4">
        <Link href="/" aria-label="Bigfoot home" className="rounded-control">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2.5 sm:flex">
            <Avatar user={user} />
            <div className="leading-tight">
              <p className="m-0 text-sm font-medium text-heading">{user.name}</p>
              <p className="m-0 text-xs text-body">{user.email}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </Container>
    </header>
  );
}

/** avatars.md: base size 32px, circular, cover fit; initials when Google has no photo. */
function Avatar({ user }: { user: CurrentUser }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-medium text-fg-brand-strong"
    >
      {user.firstName.slice(0, 1).toUpperCase()}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <li className="card flex items-center gap-4 p-6">
      <span className="icon-shape size-12 shrink-0 rounded-card">
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <p className="m-0 text-sm leading-[1.6] text-body">{label}</p>
        <p className="m-0 text-[30px] font-bold leading-[1.25] text-heading">{value}</p>
        {note && <p className="m-0 text-xs leading-4 text-body">{note}</p>}
      </div>
    </li>
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-card" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-card bg-card" />
      </Container>
    </div>
  );
}
