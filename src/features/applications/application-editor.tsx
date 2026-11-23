"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSaveStatus } from "@/hooks/use-save-status";
import { DeleteApplicationDialog } from "@/features/applications/application-dialogs";
import { DetailsForm } from "@/features/applications/details-form";
import { InterviewList } from "@/features/applications/interview-list";
import { StatusForm } from "@/features/applications/status-form";
import type { Application } from "@/lib/applications";

/**
 * The Application page's body: the Application but its heading, editable. Status and Outcome, the details,
 * then the Interview list, and Delete application.
 * Bigfoot autosaves here: each detail saves when it's left, each Interview's fields when they
 * change, and its Interview notes after a pause in typing and when they're left, so closing the
 * page loses nothing typed. Status and Outcome save the moment an Outcome is picked or the
 * Application is reopened, together, because Done needs an Outcome. Each save shows its own status
 * beside what started it (BIG-118).
 * `justAdded` is set when the page opens straight after adding the Application: the Interview list
 * then prompts for its first Interview.
 * Leaving with anything typed but not saved asks first: the page puts this inside UnsavedChanges
 * (FormPage `guarded`), shared with the heading.
 */
export function ApplicationEditor({ app, justAdded = false }: { app: Application; justAdded?: boolean }) {
  const [deleting, setDeleting] = useState(false);
  // Here too, not in the form: it's keyed by its saved values and remounts when its save lands,
  // and "Saved" must outlast that.
  const statusSave = useSaveStatus();

  return (
    <div className="flex flex-col gap-6">
      <StatusForm key={`${app.status}-${app.outcome}`} app={app} tracker={statusSave} />

      <DetailsForm app={app} />

      <InterviewList app={app} justAdded={justAdded} />

      <div className="flex border-t border-line pt-4">
        <Button onClick={() => setDeleting(true)} variant="danger">
          <Trash2 className="size-4" aria-hidden />
          Delete application
        </Button>
      </div>

      <DeleteApplicationDialog app={app} open={deleting} onClose={() => setDeleting(false)} />
    </div>
  );
}
