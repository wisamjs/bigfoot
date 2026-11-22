"use client";

import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deleteInterviewAction } from "@/app/applications/actions";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { RequiredNote } from "@/components/ui/field";
import { DeleteInterviewDialog } from "@/features/applications/applicationDialogs";
import { deleteButtonId, InterviewRow } from "@/features/applications/interviewRow";
import { addInterviewHref } from "@/features/applications/routes";
import type { Application, Interview } from "@/lib/applications";

const ADD_INTERVIEW_ID = "add-interview";

/**
 * An Application's Interviews, each editable in its own row, and Add Interview, which opens the
 * Add Interview page with this Application chosen. Deleting asks first, in a dialog held here
 * because the row goes with the Interview. Once it's gone, focus moves to the next Interview's
 * delete button (the previous one's when it was the last), or to Add Interview when none is left,
 * and a status line tells screen readers.
 */
export function InterviewList({ app, justAdded = false }: { app: Application; justAdded?: boolean }) {
  const [deleting, setDeleting] = useState<Interview | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // The element to focus once the deleted Interview has left the list, and which one that was.
  const focusAfterRef = useRef<{ gone: string; target: string } | null>(null);

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

  useEffect(() => {
    const pending = focusAfterRef.current;
    if (!pending || app.interviews.some((interview) => interview.id === pending.gone)) return;
    focusAfterRef.current = null;
    // After the dialog has handed focus back, so this is the last move.
    const frame = requestAnimationFrame(() => document.getElementById(pending.target)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [app.interviews]);

  function deleted(interview: Interview) {
    const index = app.interviews.findIndex((other) => other.id === interview.id);
    const neighbour = app.interviews[index + 1] ?? app.interviews[index - 1];
    focusAfterRef.current = { gone: interview.id, target: neighbour ? deleteButtonId(neighbour.id) : ADD_INTERVIEW_ID };
    setDeleting(null);
    setAnnouncement("Interview deleted");
  }

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
        <>
          <RequiredNote />
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {app.interviews.map((interview, index) => (
              <InterviewRow
                key={interview.id}
                app={app}
                interview={interview}
                position={index + 1}
                onDelete={() => {
                  setAnnouncement("");
                  setDeleting(interview);
                }}
              />
            ))}
          </ul>
        </>
      )}
      <DeleteInterviewDialog
        interview={deleting}
        onConfirm={(interview) => deleteInterviewAction(app.id, interview.id)}
        onClose={() => setDeleting(null)}
        onDeleted={deleted}
      />
      <output className="sr-only">
        {announcement}
      </output>
    </section>
  );
}
