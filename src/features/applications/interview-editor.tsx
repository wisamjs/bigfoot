"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteInterviewAndLeaveAction, updateInterviewAction } from "@/app/applications/actions";
import { Button } from "@/components/ui/button";
import { useSaveStatus } from "@/hooks/use-save-status";
import { DeleteInterviewDialog } from "@/features/applications/application-dialogs";
import { InterviewNotesForm } from "@/features/applications/interview-notes-form";
import type { Application, Interview } from "@/lib/applications";
import { interviewErrors, isValid } from "@/lib/validation";

/**
 * The Interview page's body, under its heading (InterviewHeading), which edits the kind and the
 * date: the Interview notes, saving by themselves with their own save status, then Delete
 * Interview. Deleting asks first, then goes to the dashboard, which says "Interview deleted".
 * Leaving with Interview notes not yet saved asks first: the page puts this inside UnsavedChanges
 * with the heading.
 */
export function InterviewEditor({ app, interview }: { app: Application; interview: Interview }) {
  const [deleting, setDeleting] = useState<Interview | null>(null);
  const notesSave = useSaveStatus();
  return (
    <div className="flex flex-col gap-6">
      <InterviewNotesForm
        key={interview.id}
        interview={interview}
        tracker={notesSave}
        // An Interview with no date saves nothing until it has one (docs/adr/0005): the notes say
        // so, as the date is set in the heading.
        onSave={(notes) => {
          const problems = interviewErrors({ notes }, { savedAt: interview.at });
          if (!isValid(problems)) return { problem: problems.notes ?? problems.at, sent: null };
          return { problem: undefined, sent: notesSave.run(() => updateInterviewAction(app.id, interview.id, { notes })) };
        }}
      />
      <div className="flex border-t border-line pt-4">
        <Button onClick={() => setDeleting(interview)} variant="danger">
          <Trash2 className="size-4" aria-hidden />
          Delete Interview
        </Button>
      </div>
      <DeleteInterviewDialog
        interview={deleting}
        onConfirm={(gone) => deleteInterviewAndLeaveAction(app.id, gone.id)}
        onClose={() => setDeleting(null)}
        // The action goes to the dashboard once it has deleted, so nothing is left to do here.
        onDeleted={() => {}}
      />
    </div>
  );
}
