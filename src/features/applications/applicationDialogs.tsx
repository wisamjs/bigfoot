"use client";

import { useState, useTransition, type ReactNode } from "react";
import { deleteApplicationAction } from "@/app/applications/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { SaveResult } from "@/hooks/useSaveStatus";
import { INTERVIEW_OPTIONS, type Application, type Interview } from "@/lib/applications";

/**
 * The body of every Delete dialog: says what will be deleted, and deletes only once confirmed.
 * Cancel has focus when it opens. A failure stays in the dialog, beside Delete.
 * `onConfirm` does the delete; `onDeleted` runs after it worked (Delete application needs no
 * `onDeleted`, because its action takes the job seeker to the dashboard).
 */
export function DeleteConfirmation({
  children,
  onConfirm,
  onCancel,
  onDeleted,
}: {
  children: ReactNode;
  onConfirm: () => Promise<SaveResult>;
  onCancel: () => void;
  onDeleted?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) onDeleted?.();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <p className="m-0 text-base leading-[1.625] text-body">{children}</p>
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        <Button
          onClick={onCancel}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- opening a delete dialog moves focus to its safe choice (WAI-ARIA dialog pattern).
          autoFocus
          variant="secondary"
        >
          Cancel
        </Button>
        <Button onClick={remove} disabled={isPending} variant="danger">
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

/** The Delete application? dialog. On success the action redirects, so only a failure shows. */
export function DeleteApplicationDialog({
  app,
  open,
  onClose,
}: {
  app: Application;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Delete application?">
      <DeleteConfirmation onConfirm={() => deleteApplicationAction(app.id)} onCancel={onClose}>
        <span className="font-medium text-heading">
          {app.company}, {app.title}
        </span>{" "}
        will be deleted. This can’t be undone.
      </DeleteConfirmation>
    </Modal>
  );
}

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/**
 * The Delete Interview? dialog, for the Interview being deleted (null while closed). It names the
 * Interview by kind and date, and warns about its Interview notes when it has any.
 */
export function DeleteInterviewDialog({
  interview,
  onConfirm,
  onClose,
  onDeleted,
}: {
  interview: Interview | null;
  onConfirm: (interview: Interview) => Promise<SaveResult>;
  onClose: () => void;
  onDeleted: (interview: Interview) => void;
}) {
  return (
    <Modal open={interview !== null} onClose={onClose} title="Delete Interview?">
      {interview && (
        <DeleteConfirmation
          onConfirm={() => onConfirm(interview)}
          onCancel={onClose}
          onDeleted={() => onDeleted(interview)}
        >
          <span className="font-medium text-heading">
            {INTERVIEW_OPTIONS[interview.kind].label}
            {interview.at && ` on ${dayFormat.format(new Date(interview.at))}`}
          </span>{" "}
          will be deleted{interview.notes ? ", with its Interview notes" : ""}. This can’t be undone.
        </DeleteConfirmation>
      )}
    </Modal>
  );
}
