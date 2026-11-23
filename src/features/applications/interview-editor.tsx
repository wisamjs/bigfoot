"use client";

import { updateInterviewAction } from "@/app/applications/actions";
import { useSaveStatus, type SaveTracker } from "@/hooks/use-save-status";
import { InterviewHeading } from "@/features/applications/interview-heading";
import { InterviewNotesForm, PrepNotesForm, type NotesField } from "@/features/applications/interview-notes-form";
import { InterviewProgress } from "@/features/applications/interview-progress";
import type { Application, Interview } from "@/lib/applications";
import { interviewErrors, isValid } from "@/lib/validation";

/**
 * The Interview page under its "← <company>" link (BIG-178): the heading (kind, date, badges, Edit
 * details and ⋯ with Delete Interview), the Application's Interviews as a strip with this one
 * outlined, then the notes cards (BIG-180). Before the Interview: Prep notes, then Interview notes
 * waiting for afterwards. Once it is completed: Interview notes, then Prep notes folded below
 * them. Each card reads as text until edited and saves by itself with its own save status.
 * Leaving with the kind, the date, Interview notes or Prep notes not yet saved asks first: the
 * page puts this inside UnsavedChanges.
 */
export function InterviewEditor({ app, interview }: { app: Application; interview: Interview }) {
  const notesSave = useSaveStatus();
  const prepSave = useSaveStatus();
  const save = (field: NotesField, tracker: SaveTracker) => (notes: string | null) => {
    const problems = interviewErrors({ [field]: notes });
    if (!isValid(problems)) return { problem: problems[field], sent: null };
    return { problem: undefined, sent: tracker.run(() => updateInterviewAction(app.id, interview.id, { [field]: notes })) };
  };
  const interviewNotes = (
    <InterviewNotesForm key={`notes-${interview.id}`} interview={interview} tracker={notesSave} onSave={save("notes", notesSave)} />
  );
  const prepNotes = (
    <PrepNotesForm key={`prep-${interview.id}`} interview={interview} tracker={prepSave} onSave={save("prep_notes", prepSave)} />
  );
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <InterviewHeading app={app} interview={interview} />
      <InterviewProgress app={app} current={interview.id} />
      <div className="flex max-w-[768px] flex-col gap-6 sm:gap-8">
        {interview.completed ? (
          <>
            {interviewNotes}
            {prepNotes}
          </>
        ) : (
          <>
            {prepNotes}
            {interviewNotes}
          </>
        )}
      </div>
    </div>
  );
}
