"use client";

import { useIsClient } from "@/hooks/use-is-client";
import { DaysFromToday } from "@/features/applications/application-when";
import { INTERVIEW_OPTIONS, nextInterview, type Application, type Interview } from "@/lib/applications";

const dayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/**
 * The Application's Interviews as a strip of segments, by date (BIG-174): green for each completed
 * one, the brand colour for the next, grey for the rest, each with its date and kind under it. On a
 * phone, the segments alone and "2 of 4 Interviews done". Nothing when there are no Interviews.
 */
export function InterviewProgress({ app }: { app: Application }) {
  const next = nextInterview(app);
  const done = app.interviews.filter((interview) => interview.completed).length;
  if (app.interviews.length === 0) return null;
  return (
    <div>
      <ol
        aria-label="Interviews by date"
        className="m-0 grid list-none auto-cols-fr grid-flow-col gap-2 p-0 sm:grid-flow-row sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] sm:gap-3"
      >
        {app.interviews.map((interview) => (
          <Segment key={interview.id} interview={interview} next={interview.id === next?.id} />
        ))}
      </ol>
      <p className="m-0 mt-2 text-sm text-body sm:hidden">
        {done} of {app.interviews.length} Interviews done
      </p>
    </div>
  );
}

function Segment({ interview, next }: { interview: Interview; next: boolean }) {
  const bar = interview.completed ? "bg-fg-success-strong" : next ? "bg-brand" : "bg-line-medium";
  return (
    <li className="min-w-0">
      <span aria-hidden className={`block h-1.5 rounded-full ${bar}`} />
      <span className="hidden sm:block">
        <span className={`mt-2.5 block text-xs ${next ? "font-medium text-fg-brand" : "text-body"}`}>
          <SegmentWhen interview={interview} next={next} />
        </span>
        <span className="mt-1 block truncate text-sm font-bold text-heading">{INTERVIEW_OPTIONS[interview.kind].label}</span>
      </span>
    </li>
  );
}

/** "Nov 6 · Done", "Nov 25 · Next, in 2 days", "Dec 2", or "Date needed". */
function SegmentWhen({ interview, next }: { interview: Interview; next: boolean }) {
  const isClient = useIsClient();
  if (!interview.at) return <span className="text-fg-danger">Date needed</span>;
  if (!isClient) return <span className="inline-block h-4" />;
  const day = dayFormat.format(new Date(interview.at));
  if (interview.completed) return <>{day} · Done</>;
  if (next)
    return (
      <>
        {day} · Next, <DaysFromToday date={interview.at} />
      </>
    );
  return <>{day}</>;
}
