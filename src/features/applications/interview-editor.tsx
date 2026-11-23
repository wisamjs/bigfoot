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
 * outlined, then the Interview notes card, which reads as text until edited and saves by itself
 * with its own save status. Leaving with the kind, the date or Interview notes not yet saved asks
 * first: the page puts this inside UnsavedChanges.
 */
export function InterviewEditor({ app, interview }: { app: Application; interview: Interview }) {
  const notesSave = useSaveStatus();
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <InterviewHeading app={app} interview={interview} />
      <InterviewProgress app={app} current={interview.id} />
      <div className="max-w-[768px]">
        <InterviewNotesForm
          key={interview.id}
          interview={interview}
          tracker={notesSave}
          onSave={(notes) => {
            const problems = interviewErrors({ notes });
            if (!isValid(problems)) return { problem: problems.notes, sent: null };
            return { problem: undefined, sent: notesSave.run(() => updateInterviewAction(app.id, interview.id, { notes })) };
          }}
        />
      </div>
    </div>
  );
}
