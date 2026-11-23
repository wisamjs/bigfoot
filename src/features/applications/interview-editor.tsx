"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteInterviewAndLeaveAction } from "@/app/applications/actions";
import { Button } from "@/components/ui/button";
import { RequiredNote } from "@/components/ui/field";
import { DeleteInterviewDialog } from "@/features/applications/application-dialogs";
import { InterviewFields } from "@/features/applications/interview-fields";
import { UnsavedChanges } from "@/features/applications/unsaved-changes";
import type { Application, Interview } from "@/lib/applications";

/**
 * The Interview page's body: the Interview's kind, date and time, and Interview notes, each saving
 * by itself with its own save status (InterviewFields), then Delete Interview. Deleting asks first,
 * then goes to the dashboard, which says "Interview deleted". Leaving with Interview notes not yet
 * saved asks first (UnsavedChanges).
 */
export function InterviewEditor({ app, interview }: { app: Application; interview: Interview }) {
  const [deleting, setDeleting] = useState<Interview | null>(null);
  return (
    <UnsavedChanges>
      <div className="flex flex-col gap-6">
        <RequiredNote />
        <div className="flex flex-wrap items-end gap-3">
          <InterviewFields key={interview.id} app={app} interview={interview} />
        </div>
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
    </UnsavedChanges>
  );
}
