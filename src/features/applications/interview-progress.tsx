"use client";

import Link from "next/link";
import { useIsClient } from "@/hooks/use-is-client";
import { DaysFromToday } from "@/features/applications/application-when";
import { interviewHref } from "@/features/applications/routes";
import { interviewMark } from "@/features/applications/status-tone";
import { DATE_TBD, nextInterview, roundNumber, type Application, type Interview, type Status } from "@/lib/applications";

const dayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/**
 * The Application's Interviews as a strip of segments, by date (BIG-174): one for each completed
 * Interview, green while the Application is In Progress and grey once it is Done (BIG-177), the
 * brand colour for the next, a light line for the rest, and a dashed one in the brand colour, last,
 * for each Unscheduled Interview (BIG-221), each with "R3 · Nov 25 · In 2 days" or "R4 · Date TBD"
 * (its Round number, BIG-190) and its title under it (BIG-202). Each segment opens its Interview page. On a phone, the segments
 * alone and "2 of 4 Interviews completed". Nothing when there are no Interviews.
 *
 * On an Interview page (`current` is that Interview's id, BIG-178), its segment is outlined and
 * labelled "This interview · Nov 13", and a phone's line reads "Round 2 of 4" with a link to
 * "R3 · <title> →", or "Round 4 of 4 · Date TBD" for an Unscheduled Interview.
 */
export function InterviewProgress({ app, current }: { app: Application; current?: string }) {
  const next = nextInterview(app);
  const completed = app.interviews.filter((interview) => interview.completed).length;
  if (app.interviews.length === 0) return null;
  const position = app.interviews.findIndex((interview) => interview.id === current);
  const following = position >= 0 ? app.interviews[position + 1] : undefined;
  return (
    <div>
      <ol
        aria-label="Interviews by date"
        className="m-0 grid list-none auto-cols-fr grid-flow-col gap-2 p-0 sm:grid-flow-row sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] sm:gap-3"
      >
        {app.interviews.map((interview) => (
          <Segment
            key={interview.id}
            applicationId={app.id}
            interview={interview}
            round={roundNumber(app, interview)}
            status={app.status}
            next={interview.id === next?.id}
            current={interview.id === current}
          />
        ))}
      </ol>
      <p className="m-0 mt-2 flex items-center justify-between gap-3 text-sm text-body sm:hidden">
        {position >= 0 ? (
          <>
            <span>
              Round {roundNumber(app, app.interviews[position])} of {app.interviews.length}
              {app.interviews[position].at === null && <> · {DATE_TBD}</>}
            </span>
            {following && (
              <Link
                href={interviewHref(app.id, following.id)}
                className="touch-target inline-flex pointer-fine:min-h-6 items-center rounded-control font-medium text-fg-brand underline underline-offset-4 hover:text-fg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="sr-only">Next: </span>R{roundNumber(app, following)} · {following.title} →
              </Link>
            )}
          </>
        ) : (
          <span>
            {completed} of {app.interviews.length} Interviews completed
          </span>
        )}
      </p>
    </div>
  );
}

function Segment({
  applicationId,
  interview,
  round,
  status,
  next,
  current,
}: {
  applicationId: string;
  interview: Interview;
  /** Its Round number, shown as "R3" before the title. */
  round: number;
  status: Status;
  next: boolean;
  current: boolean;
}) {
  const bar = interviewMark(interview, status, next);
  const title = interview.title;
  return (
    <li className="min-w-0">
      {/* A phone's thin bar gets a touch target of 44px from the link's own padding; the outline of the current Interview is drawn on the inner box, close around the segment. */}
      <Link
        href={interviewHref(applicationId, interview.id)}
        aria-current={current ? "page" : undefined}
        className="-my-[19px] block rounded-control py-[19px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:my-0 sm:py-0"
      >
        <span className={`-m-1.5 block rounded-control p-1.5 ${current ? "ring-2 ring-brand" : ""}`}>
          <span aria-hidden className={`block h-1.5 rounded-full ${bar}`} />
          {/* On a phone the bar shows alone, and these lines are left for screen readers. */}
          <span className="block max-sm:sr-only">
            <span className={`mt-2.5 block text-xs ${current ? "font-bold text-heading" : "text-body"}`}>
              <span aria-hidden className="font-bold text-heading">
                R{round}
              </span>
              <span className="sr-only">Round {round}</span>
              {" · "}
              <SegmentWhen interview={interview} current={current} />
            </span>
            <span className={`mt-1 block text-base sm:truncate ${current ? "font-bold text-heading" : "font-semibold text-body"}`}>
              {title}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * "Nov 6 · Completed", "Nov 25 · In 2 days", "Date TBD", or on an Interview's own page "This
 * interview · Nov 13" ("This interview · Date TBD").
 */
function SegmentWhen({ interview, current }: { interview: Interview; current: boolean }) {
  const isClient = useIsClient();
  if (interview.at === null) return <>{current ? `This interview · ${DATE_TBD}` : DATE_TBD}</>;
  if (!isClient) return <span className="inline-block h-4" />;
  const day = dayFormat.format(new Date(interview.at));
  if (current) return <>This interview · {day}</>;
  if (interview.completed) return <>{day} · Completed</>;
  return (
    <>
      {day} · <DaysFromToday date={interview.at} capitalize />
    </>
  );
}
