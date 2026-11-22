"use client";

import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { RequiredNote } from "@/components/ui/field";
import { InterviewRow } from "@/features/applications/interview-row";
import { addInterviewHref } from "@/features/applications/routes";
import type { Application } from "@/lib/applications";

/**
 * An Application's Interviews, each editable in its own row, and Add Interview, which opens the
 * Add Interview page with this Application chosen.
 */
export function InterviewList({ app }: { app: Application }) {
  return (
    <section aria-labelledby="interviews-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="interviews-title" className="m-0 text-base font-bold leading-[1.25] text-heading">
          Interviews
        </h2>
        <Link href={addInterviewHref(app.id)} className={buttonClasses("secondary", "sm")}>
          <CalendarPlus className="size-4" aria-hidden />
          Add Interview
        </Link>
      </div>
      {app.interviews.length === 0 ? (
        <p className="m-0 text-sm text-body">No Interviews yet. Add one when you have a conversation lined up.</p>
      ) : (
        <>
          <RequiredNote />
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {app.interviews.map((interview, index) => (
              <InterviewRow key={interview.id} app={app} interview={interview} position={index + 1} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
