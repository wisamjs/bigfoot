"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { JourneyApplications } from "@/features/journey/journey-applications";
import { JourneyCalendar } from "@/features/journey/journey-calendar";
import { JourneyHeader } from "@/features/journey/journey-header";
import { JourneyNextInterview } from "@/features/journey/journey-next-interview";
import { FamilyBigfoot } from "@/features/shell/illustrations";
import { useToday } from "@/hooks/use-today";
import {
  journeyCounts,
  journeyInterviews,
  upcomingJourneyInterviews,
  viewerCopy,
  type Journey,
  type JourneyCount,
} from "@/lib/journey";

const COUNT_COLOUR: Record<JourneyCount["id"], string> = {
  offers: "text-fg-success-strong",
  upcoming: "text-fg-brand",
  completed: "text-heading",
  waiting: "text-fg-warning",
};

/** "Eastern Time": the Viewer's time zone as their browser names it. */
function timeZoneName(now: Date) {
  const part = new Intl.DateTimeFormat(undefined, { timeZoneName: "longGeneric" })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * A Share link's Journey (GLOSSARY.md, BIG-197): the job seeker's search as a Viewer sees it. Four
 * counts, the next Interview, the Interviews calendar, and Where things stand. Times and days are
 * the Viewer's own, so it renders in the browser; the server sends JourneySkeleton. `now` is for
 * stories and tests; the page leaves it out. The job seeker's own preview (BIG-198) passes no link
 * `id`, so there is no Lock, and a `banner` above it all. Right of the heading, a Bigfoot family in a
 * group hug (BIG-229): the people the Journey is shared with.
 */
export function JourneyView({
  id,
  journey,
  banner,
  now: fixedNow,
}: {
  id?: string;
  journey: Journey;
  banner?: ReactNode;
  now?: Date;
}) {
  const today = useToday();
  const now = fixedNow ?? today;
  const copy = viewerCopy(journey.shared_by);
  return (
    <div className="flex min-h-dvh flex-col">
      {banner}
      <JourneyHeader id={id} sharedBy={journey.shared_by} />
      <main id="main" className="flex-1 py-8 sm:py-12">
        <Container className="flex flex-col gap-6 max-sm:px-4">
          <div className="relative pr-20 sm:pr-28">
            {/* Out of the flow, so nothing moves; the padding keeps a long name from running under it.
                Smaller on a phone, where the heading needs the room. */}
            <FamilyBigfoot className="pointer-events-none absolute right-0 top-1/2 h-auto w-16 -translate-y-1/2 sm:w-24" />
            <h1 className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.01em] text-heading sm:text-[44px]">
              {copy.heading}
            </h1>
            <p className="m-0 mt-2 text-body">
              {now ? `Times are in your time zone (${timeZoneName(now)})` : <Skeleton className="inline-block h-4 w-64" />}
            </p>
          </div>
          {now ? <JourneyBody journey={journey} now={now} /> : <JourneySkeleton />}
        </Container>
      </main>
      <footer className="border-t border-line py-6">
        <Container className="flex flex-wrap items-center justify-between gap-4 text-sm text-body max-sm:px-4">
          <p className="m-0 flex items-center gap-2">
            <Lock className="size-4 shrink-0" aria-hidden />
            {copy.footer}
          </p>
          <Link href="/privacy" className="touch-target rounded-control text-fg-brand underline underline-offset-4 hover:text-fg-brand-strong">
            Privacy Policy
          </Link>
        </Container>
      </footer>
    </div>
  );
}

/**
 * The counts, the next Interview, the calendar and Where things stand. On a desktop the counts lead
 * and the calendar runs down the right; on a phone the next Interview leads, as in the designs.
 */
function JourneyBody({ journey, now }: { journey: Journey; now: Date }) {
  const upcoming = upcomingJourneyInterviews(journey.applications, now);
  const [next, ...after] = upcoming;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <ul aria-label="At a glance" className="m-0 grid list-none grid-cols-2 gap-3 p-0 max-lg:order-2 sm:gap-4 lg:col-span-2 lg:grid-cols-4">
        {journeyCounts(journey, now).map((count) => (
          <li key={count.id} className="card flex flex-col gap-1 p-4 sm:p-5">
            <span className={`text-3xl font-bold leading-none ${COUNT_COLOUR[count.id]}`}>{count.value}</span>
            <span className="text-sm text-body">{count.label}</span>
          </li>
        ))}
      </ul>
      {next && (
        <div className="max-lg:order-1 lg:col-start-1">
          <JourneyNextInterview next={next} now={now} />
        </div>
      )}
      <div className="max-lg:order-3 lg:col-start-2 lg:row-span-2 lg:row-start-2">
        <JourneyCalendar interviews={journeyInterviews(journey.applications)} upcoming={next ? after : []} now={now} />
      </div>
      <div className="max-lg:order-4 lg:col-start-1">
        <JourneyApplications applications={journey.applications} now={now} />
      </div>
    </div>
  );
}

/** The Journey while the browser learns the Viewer's time zone: the same layout in skeleton shapes. */
export function JourneySkeleton() {
  return (
    <LoadingRegion label="Loading the Journey…">
      <div aria-hidden className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-56" />
        <Skeleton className="h-96 lg:row-span-2" />
        <Skeleton className="h-80" />
      </div>
    </LoadingRegion>
  );
}
