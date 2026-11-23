"use client";

import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import { InterviewRow } from "@/features/applications/interview-row";
import { addInterviewHref } from "@/features/applications/routes";
import { nextInterview, type Application } from "@/lib/applications";

const ADD_INTERVIEW_ID = "add-interview";

/**
 * An Application's Interviews, by date, one short row each that opens its Interview page, where
 * it is edited and deleted; and Add Interview, which opens the Add Interview page with this
 * Application chosen.
 */
export function InterviewList({ app, justAdded = false }: { app: Application; justAdded?: boolean }) {
  const [announcement, setAnnouncement] = useState("");
  const next = nextInterview(app);

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
    <section aria-labelledby="interviews-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="interviews-title" className="m-0 text-base font-bold leading-[1.25] text-heading">
          Interviews
        </h2>
        <Link id={ADD_INTERVIEW_ID} href={addInterviewHref(app.id)} className={buttonClasses("secondary", "sm")}>
          <CalendarPlus className="size-4" aria-hidden />
          Add Interview
        </Link>
      </div>
      {justAdded && (
        <p className="m-0 text-sm text-body">Added. Got an Interview lined up? Add it here.</p>
      )}
      {app.interviews.length === 0 ? (
        <p className="m-0 text-sm text-body">No Interviews yet. Add one when you have a conversation lined up.</p>
      ) : (
        <ul aria-labelledby="interviews-title" className="m-0 flex list-none flex-col gap-2 p-0">
          {app.interviews.map((interview) => (
            <InterviewRow
              key={interview.id}
              applicationId={app.id}
              interview={interview}
              next={interview.id === next?.id}
            />
          ))}
        </ul>
      )}
      <output className="sr-only">{announcement}</output>
    </section>
  );
}
