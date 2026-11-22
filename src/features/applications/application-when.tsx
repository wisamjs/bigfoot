"use client";

import { useIsClient } from "@/hooks/use-is-client";
import { nextInterview, type Application } from "@/lib/applications";

const whenFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const sinceFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** The next Interview's date, or "Waiting since" the last one (or the applied date). */
export function ApplicationWhen({ app }: { app: Application }) {
  // The server can't know the viewer's time zone, so this renders after hydration.
  const isClient = useIsClient();
  if (!isClient) return <span className="block h-5" />;
  const next = nextInterview(app);
  if (next?.at) return <time dateTime={next.at}>{whenFormat.format(new Date(next.at))}</time>;
  if (app.is_waiting && app.waiting_since) {
    // A date-only value (YYYY-MM-DD) is the applied date: format it as that calendar day, not UTC midnight.
    const since = app.waiting_since.length === 10 ? new Date(`${app.waiting_since}T00:00`) : new Date(app.waiting_since);
    return <span className="text-body">Waiting since {sinceFormat.format(since)}</span>;
  }
  return <span className="text-body-subtle">—</span>;
}

// A card leaves out the year to keep each Interview short; its Interviews are rarely a year apart.
const shortWhenFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * One Interview's date and time, in the viewer's time zone, without the year; "Date needed" for one
 * saved before dates were required (docs/adr/0005).
 */
export function InterviewWhen({ at }: { at: string | null }) {
  if (!at) return <span className="font-medium text-fg-danger">Date needed</span>;
  return <InterviewDate at={at} />;
}

function InterviewDate({ at }: { at: string }) {
  const isClient = useIsClient();
  if (!isClient) return <span className="block h-5" />;
  return (
    <time dateTime={at} className="whitespace-nowrap">
      {shortWhenFormat.format(new Date(at))}
    </time>
  );
}
