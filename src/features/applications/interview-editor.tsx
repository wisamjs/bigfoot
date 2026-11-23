"use client";

import { updateInterviewAction } from "@/app/applications/actions";
import { useSaveStatus, type SaveTracker } from "@/hooks/use-save-status";
import { InterviewHeading } from "@/features/applications/interview-heading";
import { InterviewNotesForm, PrepNotesForm, type NotesFieldName } from "@/features/applications/interview-notes-form";
import { InterviewProgress } from "@/features/applications/interview-progress";
import type { Application, Interview } from "@/lib/applications";
import { interviewErrors, isValid } from "@/lib/validation";

/**
 * The Interview page under its "← <company>" link (BIG-178): the heading (kind, date, badges, Edit
 * details and ⋯ with Delete Interview), the Application's Interviews as a strip with this one
 * outlined, then the notes cards (BIG-179, BIG-180). Before the Interview: Prep notes, then Interview
 * notes (What they asked, How it went and Takeaway for next time) waiting for afterwards. Once it
 * is completed: Interview notes, then Prep notes folded below them. Each reads as text until edited
 * and saves by itself with its own save status. Leaving with the kind, the date, an Interview notes
 * field or Prep notes not yet saved asks first: the page puts this inside UnsavedChanges.
 */
export function InterviewEditor({ app, interview }: { app: Application; interview: Interview }) {
  const trackers = {
    what_they_asked: useSaveStatus(),
    how_it_went: useSaveStatus(),
    takeaway: useSaveStatus(),
  };
  const prepSave = useSaveStatus();
  const save = (field: NotesFieldName, tracker: SaveTracker) => (value: string | null) => {
    const changes = { [field]: value };
    const problems = interviewErrors(changes);
    if (!isValid(problems)) return { problem: problems[field], sent: null };
    return { problem: undefined, sent: tracker.run(() => updateInterviewAction(app.id, interview.id, changes)) };
  };
  const interviewNotes = (
    <InterviewNotesForm
      key={`notes-${interview.id}`}
      interview={interview}
      trackers={trackers}
      onSave={(field, value) => save(field, trackers[field])(value)}
    />
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
