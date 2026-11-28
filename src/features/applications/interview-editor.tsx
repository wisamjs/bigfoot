"use client";

import { updateInterviewAction } from "@/app/applications/actions";
import { useSaveStatus, type SaveTracker } from "@/hooks/use-save-status";
import { InterviewHeading } from "@/features/applications/interview-heading";
import { InterviewNotesForm, PrepNotesForm, type NotesFieldName } from "@/features/applications/interview-notes-form";
import { InterviewProgress } from "@/features/applications/interview-progress";
import { RoundNav } from "@/features/applications/round-nav";
import { isAbandoned, type Application, type Interview, type PrepLookBack, type PrepTakeaway } from "@/lib/applications";
import { interviewErrors, isValid } from "@/lib/validation";

/**
 * The Interview page under its "← <company>" link (BIG-178): the heading (title, date, badges, Edit
 * details and ⋯ with Delete Interview), the Application's Interviews as a strip with this one
 * outlined, then the notes cards (BIG-179, BIG-180). Before the Interview: Prep notes, then Interview
 * notes (What they asked, How it went and Takeaway for next time) waiting for afterwards. Once it
 * is completed: Interview notes, then Prep notes folded below them. An Abandoned one (BIG-222) keeps
 * the order from before, Prep notes first, as nothing happened to write about, though Interview
 * notes can still be added. The cards span the page, and
 * links to the Rounds either side end it (RoundNav, BIG-202). Each reads as text until edited
 * and saves by itself with its own save status. Leaving with the category, the title, the date, an Interview notes
 * field or Prep notes not yet saved asks first: the page puts this inside UnsavedChanges.
 * The page works out, from every Application, what an upcoming Interview's prep looks back at
 * (`lookBack`) and where a completed one's takeaway shows (`showsOn`) (BIG-181).
 */
export function InterviewEditor({
  app,
  interview,
  lookBack,
  showsOn,
  editDetails = false,
}: {
  app: Application;
  interview: Interview;
  lookBack?: PrepLookBack;
  showsOn?: PrepTakeaway[];
  /** Opens Edit details at once, as the Application page's Add the date asks. */
  editDetails?: boolean;
}) {
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
  const upcoming = !interview.completed && !isAbandoned(app, interview);
  const interviewNotes = (
    <InterviewNotesForm
      key={`notes-${interview.id}`}
      interview={interview}
      upcoming={upcoming}
      trackers={trackers}
      onSave={(field, value) => save(field, trackers[field])(value)}
      showsOn={showsOn}
    />
  );
  const prepNotes = (
    <PrepNotesForm
      key={`prep-${interview.id}`}
      interview={interview}
      upcoming={upcoming}
      tracker={prepSave}
      onSave={save("prep_notes", prepSave)}
      lookBack={lookBack}
    />
  );
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <InterviewHeading app={app} interview={interview} editOnOpen={editDetails} />
      <InterviewProgress app={app} current={interview.id} />
      <div className="flex flex-col gap-6 sm:gap-8">
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
      <RoundNav app={app} interview={interview} />
    </div>
  );
}
