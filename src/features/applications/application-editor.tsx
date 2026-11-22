"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useSaveStatus } from "@/hooks/use-save-status";
import { DeleteConfirmation } from "@/features/applications/application-dialogs";
import { DetailsForm } from "@/features/applications/details-form";
import { InterviewList } from "@/features/applications/interview-list";
import { StatusForm } from "@/features/applications/status-form";
import type { Application } from "@/lib/applications";

/**
 * The Application page's body: the whole Application, editable. Status and Outcome, the details,
 * then the Interview list, and Delete application.
 * Interviews save one field at a time through the nested API routes, each one's Interview notes
 * with their own button; Status and Outcome save together, because Done needs an Outcome.
 * Each save shows its own status beside what started it, and disables only that control (BIG-118).
 */
export function ApplicationEditor({ app }: { app: Application }) {
  // Lives here, not in DetailsForm, so saving the details doesn't hide the salary again. This
  // component mounts each time the page opens, which does.
  const [salaryRevealed, setSalaryRevealed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Here too, not in the forms: a form keyed by its saved values remounts when its save lands,
  // and "Saved" must outlast that.
  const statusSave = useSaveStatus();
  const detailsSave = useSaveStatus();

  return (
    <div className="flex flex-col gap-6">
      <StatusForm key={`${app.status}-${app.outcome}`} app={app} tracker={statusSave} />

      <DetailsForm
        key={`${app.company}-${app.title}-${app.applied_on}-${app.location}-${app.salary}-${app.posting_url}`}
        app={app}
        salaryHidden={Boolean(app.salary) && !salaryRevealed}
        onRevealSalary={() => setSalaryRevealed(true)}
        tracker={detailsSave}
      />

      <InterviewList app={app} />

      <div className="flex border-t border-line pt-4">
        <Button onClick={() => setDeleting(true)} variant="danger">
          <Trash2 className="size-4" aria-hidden />
          Delete application
        </Button>
      </div>

      <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete application?">
        <DeleteConfirmation app={app} onCancel={() => setDeleting(false)} />
      </Modal>
    </div>
  );
}
