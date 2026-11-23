"use client";

import { useIsClient } from "@/hooks/use-is-client";
import { DaysFromToday } from "@/features/applications/application-when";
import { COMPLETED_MARK } from "@/features/applications/status-tone";
import { INTERVIEW_OPTIONS, nextInterview, type Application, type Interview, type Status } from "@/lib/applications";

const dayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/**
 * The Application's Interviews as a strip of segments, by date (BIG-174): one for each completed
 * Interview, green while the Application is In Progress and grey once it is Done (BIG-177), the
 * brand colour for the next, a light line for the rest, each with its date and kind under it. On a
 * phone, the segments alone and "2 of 4 Interviews completed". Nothing when there are no Interviews.
 */
export function InterviewProgress({ app }: { app: Application }) {
  const next = nextInterview(app);
  const completed = app.interviews.filter((interview) => interview.completed).length;
  if (app.interviews.length === 0) return null;
  return (
    <div>
      <ol
        aria-label="Interviews by date"
        className="m-0 grid list-none auto-cols-fr grid-flow-col gap-2 p-0 sm:grid-flow-row sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] sm:gap-3"
      >
        {app.interviews.map((interview) => (
          <Segment key={interview.id} interview={interview} status={app.status} next={interview.id === next?.id} />
        ))}
      </ol>
      <p className="m-0 mt-2 text-sm text-body sm:hidden">
        {completed} of {app.interviews.length} Interviews completed
      </p>
    </div>
  );
}

function Segment({ interview, status, next }: { interview: Interview; status: Status; next: boolean }) {
  const bar = interview.completed ? COMPLETED_MARK[status] : next ? "bg-brand" : "bg-line-medium";
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

/** "Nov 6 · Completed", "Nov 25 · Next, in 2 days", or "Dec 2". */
function SegmentWhen({ interview, next }: { interview: Interview; next: boolean }) {
  const isClient = useIsClient();
  if (!isClient) return <span className="inline-block h-4" />;
  const day = dayFormat.format(new Date(interview.at));
  if (interview.completed) return <>{day} · Completed</>;
  if (next)
    return (
      <>
        {day} · Next, <DaysFromToday date={interview.at} />
      </>
    );
  return <>{day}</>;
}
