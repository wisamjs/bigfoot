"use client";

import { updateInterviewAction } from "@/app/applications/actions";
import { useSaveStatus } from "@/hooks/use-save-status";
import { InterviewHeading } from "@/features/applications/interview-heading";
import { InterviewNotesForm } from "@/features/applications/interview-notes-form";
import { InterviewProgress } from "@/features/applications/interview-progress";
import type { Application, Interview } from "@/lib/applications";
import { interviewErrors, isValid } from "@/lib/validation";

/**
 * The Interview page under its "← <company>" link (BIG-178): the heading (kind, date, badges, Edit
 * details and ⋯ with Delete Interview), the Application's Interviews as a strip with this one
 * outlined, then the Interview notes (BIG-179): What they asked, How it went and Takeaway for next
 * time, which read as text until edited and each save by themselves with their own save status.
 * Leaving with the kind, the date or an Interview notes field not yet saved asks first: the page
 * puts this inside UnsavedChanges.
 */
export function InterviewEditor({ app, interview }: { app: Application; interview: Interview }) {
  const trackers = {
    what_they_asked: useSaveStatus(),
    how_it_went: useSaveStatus(),
    takeaway: useSaveStatus(),
  };
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <InterviewHeading app={app} interview={interview} />
      <InterviewProgress app={app} current={interview.id} />
      <div className="max-w-[768px]">
        <InterviewNotesForm
          key={interview.id}
          interview={interview}
          trackers={trackers}
          onSave={(field, value) => {
            const changes = { [field]: value };
            const problems = interviewErrors(changes);
            if (!isValid(problems)) return { problem: problems[field], sent: null };
            return {
              problem: undefined,
              sent: trackers[field].run(() => updateInterviewAction(app.id, interview.id, changes)),
            };
          }}
        />
      </div>
    </div>
  );
}
