"use client";

import { useState, type FormEvent } from "react";
import { updateInterviewAction } from "@/app/applications/actions";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { SaveStatus } from "@/components/ui/save-status";
import type { SaveTracker } from "@/hooks/use-save-status";
import { INTERVIEW_NOTES_MAX_LENGTH, type Application, type Interview } from "@/lib/applications";
import { interviewErrors } from "@/lib/validation";

/**
 * An Interview's notes: written, read and cleared here, under their Interview. They save with
 * their own button, not on blur, so a long note is never sent half-written. While they save, the
 * notes are read-only: the form remounts with the saved notes when the save lands.
 */
export function InterviewNotesForm({
  app,
  interview,
  label,
  tracker,
}: {
  app: Application;
  interview: Interview;
  /** "Interview 2": tells the rows apart for screen readers. */
  label: string;
  /** Owned by the row, so "Saved" outlasts this form remounting with the saved notes. */
  tracker: SaveTracker;
}) {
  const [draft, setDraft] = useState(interview.notes ?? "");
  const [error, setError] = useState<string | undefined>();
  const errorId = `notes-${interview.id}-error`;
  // As the API stores them: ends trimmed, blank is none.
  const notes = draft.trim() || null;
  const nearLimit = draft.length >= INTERVIEW_NOTES_MAX_LENGTH * 0.9;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = interviewErrors({ notes }).notes;
    setError(problem);
    if (!problem) void tracker.run(() => updateInterviewAction(app.id, interview.id, { notes }));
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2">
      <div>
        <label htmlFor={`notes-${interview.id}`} className="mb-1 block text-xs font-medium text-body">
          Interview notes<span className="sr-only">, {label}</span>
        </label>
        <textarea
          id={`notes-${interview.id}`}
          value={draft}
          rows={3}
          maxLength={INTERVIEW_NOTES_MAX_LENGTH}
          readOnly={tracker.saving}
          placeholder={PLACEHOLDERS.notes}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(undefined);
          }}
          {...invalidProps(errorId, error)}
          // Grows with the notes where the browser supports it; otherwise it scrolls and resizes.
          className={`${inputClasses} field-sizing-content max-h-96 min-h-20 resize-y`}
        />
        <FieldError id={errorId} error={error} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {nearLimit && (
          <span className="text-xs text-body">
            {draft.length.toLocaleString("en-CA")} of {INTERVIEW_NOTES_MAX_LENGTH.toLocaleString("en-CA")} characters
          </span>
        )}
        <SaveStatus status={tracker.status} label={`${label} notes`} onRetry={tracker.retry} />
        <Button
          type="submit"
          disabled={tracker.saving || notes === interview.notes}
          aria-label={`Save notes, ${label}`}
          variant="secondary"
          size="sm"
        >
          Save notes
        </Button>
      </div>
    </form>
  );
}
