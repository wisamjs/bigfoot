import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, CalendarCheck, CalendarClock, Gift, MessageSquareReply } from "lucide-react";
import { SignOutButton } from "@/components/auth-button";
import { PipelineBoard } from "@/components/pipeline-board";
import { Badge, Container, Wordmark } from "@/components/ui";
import { getCurrentUser, type CurrentUser } from "@/lib/dal";
import { applications, getStats, getUpcoming, type Stage } from "@/lib/mock-data";

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
  const stats = getStats(applications);
  const upcoming = getUpcoming(applications);

  return (
    <>
      <DashboardHeader user={user} />
      <main className="py-12">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge tone="warning" pill>
                Demo data
              </Badge>
              <h1 className="mt-3 mb-2 text-[32px] font-bold leading-[1.1] text-heading md:text-[40px]">
                Welcome back, {user.firstName}
              </h1>
              <p className="m-0 text-base leading-[1.7] text-body">
                Here’s where your search stands this week.
              </p>
            </div>
          </div>

          <section aria-label="Search summary">
            <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={BriefcaseBusiness} label="Active applications" value={stats.active} />
              <StatCard icon={CalendarCheck} label="Interviewing" value={stats.interviewing} />
              <StatCard icon={MessageSquareReply} label="Response rate" value={`${stats.responseRate}%`} />
              <StatCard icon={Gift} label="Offers" value={stats.offers} />
            </ul>
          </section>

          <section aria-labelledby="pipeline-title">
            <h2 id="pipeline-title" className="sr-only">
              Pipeline
            </h2>
            <PipelineBoard
              title="Pipeline"
              subtitle={`${upcoming.length} upcoming steps`}
              applications={applications}
            />
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <section aria-labelledby="apps-title" className="min-w-0 lg:col-span-2">
              <h2 id="apps-title" className="m-0 mb-4 text-xl font-bold leading-[1.25] text-heading">
                All applications
              </h2>
              <ApplicationsTable />
            </section>
            <section aria-labelledby="upcoming-title">
              <h2 id="upcoming-title" className="m-0 mb-4 text-xl font-bold leading-[1.25] text-heading">
                Coming up
              </h2>
              <ol className="card m-0 flex list-none flex-col gap-4 p-6">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className="icon-shape size-8 shrink-0 rounded-control">
                      <CalendarClock className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-medium leading-5 text-heading">{a.nextStep}</p>
                      <p className="m-0 text-sm leading-[1.6] text-body">
                        {a.company} · {a.nextStepDate}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </Container>
      </main>
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

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <li className="card flex items-center gap-4 p-6">
      <span className="icon-shape size-12 shrink-0 rounded-card">
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <p className="m-0 text-sm leading-[1.6] text-body">{label}</p>
        <p className="m-0 text-[30px] font-bold leading-[1.25] text-heading">{value}</p>
      </div>
    </li>
  );
}

const stageTone: Record<Stage, "neutral" | "brand" | "success" | "warning"> = {
  Saved: "neutral",
  Applied: "neutral",
  Interviewing: "brand",
  Offer: "success",
  Rejected: "warning",
};

/** tables.md: 24px wrapper, scrollable, row headers with scope="row", no border on last row. */
function ApplicationsTable() {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-xs">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm text-body">
        <caption className="sr-only">All applications with stage and next step</caption>
        <thead className="border-b border-line bg-surface">
          <tr>
            {["Company", "Role", "Stage", "Applied", "Next step"].map((h) => (
              <th key={h} scope="col" className="px-6 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.map((a, i) => (
            <tr
              key={a.id}
              className={`bg-surface-white transition-colors hover:bg-surface ${
                i < applications.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <th scope="row" className="whitespace-nowrap px-6 py-4 font-medium text-heading">
                {a.company}
              </th>
              <td className="px-6 py-4">{a.role}</td>
              <td className="px-6 py-4">
                <Badge tone={stageTone[a.stage]}>{a.stage}</Badge>
              </td>
              <td className="whitespace-nowrap px-6 py-4">{a.appliedOn ?? "Not yet"}</td>
              <td className="px-6 py-4">{a.nextStep}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
