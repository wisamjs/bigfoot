"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import { DaysFromToday } from "@/features/applications/application-when";
import { InterviewRow } from "@/features/applications/interview-row";
import { addInterviewHref } from "@/features/applications/routes";
import { InterviewCardsBigfoot } from "@/features/shell/illustrations";
import { isDone, type Application, type Interview } from "@/lib/applications";

const ADD_INTERVIEW_ID = "add-interview";

/**
 * The Application page's Interviews card (BIG-174): Add Interview, then the Interviews still ahead
 * after the next one (Later; the next one has its own card above) and the completed ones, newest
 * first (Completed). Each row opens its Interview page. With no Interviews, Bigfoot and a first Add
 * Interview instead.
 */
export function InterviewList({
  app,
  later,
  completed,
  justAdded = false,
}: {
  app: Application;
  later: Interview[];
  completed: Interview[];
  justAdded?: boolean;
}) {
  const [announcement, setAnnouncement] = useState("");
  const empty = app.interviews.length === 0;

  // Straight after adding the Application, the page asks for its first Interview: focus lands on
  // Add Interview, and the "added" search param goes so a refresh or a shared link doesn't repeat it.
  useEffect(() => {
    if (!justAdded) return;
    window.history.replaceState(null, "", window.location.pathname);
    // After mount, so the live region exists before its text changes and is announced.
    const frame = requestAnimationFrame(() => {
      document.getElementById(ADD_INTERVIEW_ID)?.focus();
      setAnnouncement(`${app.company} added`);
    });
    return () => cancelAnimationFrame(frame);
  }, [justAdded, app.company]);

  return (
    <section aria-labelledby="interviews-title" className="card flex min-w-0 flex-col px-5 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 id="interviews-title" className="m-0 text-2xl font-bold leading-[1.25] text-heading">
          Interviews
        </h2>
        {!empty && (
          <Link id={ADD_INTERVIEW_ID} href={addInterviewHref(app.id)} className={buttonClasses("secondary")}>
            <Plus className="size-4" aria-hidden />
            Add Interview
          </Link>
        )}
      </div>
      {justAdded && <p className="m-0 mt-3 text-sm text-body">Added. Got an Interview lined up? Add it here.</p>}
      {empty ? (
        <NoInterviews app={app} />
      ) : (
        <div className="mt-6 flex flex-col">
          {later.length === 0 && completed.length === 0 && (
            <p className="m-0 mt-4 text-sm text-body">Nothing else booked yet.</p>
          )}
          <Group id="interviews-later" title="Later" interviews={later} applicationId={app.id} />
          <Group id="interviews-completed" title="Completed" interviews={completed} applicationId={app.id} />
        </div>
      )}
      <output className="sr-only">{announcement}</output>
    </section>
  );
}

function Group({
  id,
  title,
  interviews,
  applicationId,
}: {
  id: string;
  title: string;
  interviews: Interview[];
  applicationId: string;
}) {
  if (interviews.length === 0) return null;
  return (
    <div className="mt-5 border-t border-line pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <h3 id={id} className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-body">
        {title}
      </h3>
      <ul aria-labelledby={id} className="m-0 mt-2 list-none p-0">
        {interviews.map((interview) => (
          <InterviewRow key={interview.id} applicationId={applicationId} interview={interview} />
        ))}
      </ul>
    </div>
  );
}

/** No Interviews yet: Bigfoot, how long since applying, what adding one does, and Add Interview. */
function NoInterviews({ app }: { app: Application }) {
  return (
    <div className="flex flex-col items-center gap-4 pb-4 pt-6 text-center">
      <InterviewCardsBigfoot className="h-auto w-[340px] max-w-full" />
      <div className="flex max-w-[480px] flex-col gap-2">
        <h3 className="m-0 text-2xl font-bold leading-[1.25] text-heading">No Interviews yet</h3>
        <p className="m-0 text-base leading-[1.7] text-body">
          <Applied on={app.applied_on} />{" "}
          {isDone(app)
            ? "You can still add one to keep a record of how it went."
            : "When an Interview gets booked, add it here and this moves to Interview scheduled."}
        </p>
      </div>
      <Link id={ADD_INTERVIEW_ID} href={addInterviewHref(app.id)} className={buttonClasses("brand", "lg")}>
        <Plus className="size-4" aria-hidden />
        Add Interview
      </Link>
    </div>
  );
}

/** "You applied 5 days ago." */
function Applied({ on }: { on: string }): ReactNode {
  return (
    <>
      You applied <DaysFromToday date={on} />.
    </>
  );
}
