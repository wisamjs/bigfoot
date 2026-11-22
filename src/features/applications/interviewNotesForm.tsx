"use client";

import { useEffect, useRef, useState } from "react";
import { FieldError, invalidProps } from "@/components/ui/fieldError";
import { inputClasses } from "@/components/ui/input";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { SaveStatus } from "@/components/ui/saveStatus";
import { useUnsavedChanges } from "@/features/applications/unsavedChanges";
import type { SaveResult, SaveTracker } from "@/hooks/useSaveStatus";
import { INTERVIEW_NOTES_MAX_LENGTH, type Interview } from "@/lib/applications";

/** How long typing must stop before Interview notes save by themselves. */
export const NOTES_PAUSE_MS = 1000;

/** What saving the notes came to: the problem found before sending, and the save itself if one was sent. */
export type NotesSave = { problem: string | undefined; sent: Promise<SaveResult> | null };

/**
 * An Interview's notes: written, read and cleared here, under their Interview. They save by
 * themselves, as a draft: about a second after typing stops, and when the field is left. Each save
 * replaces the last, so what's stored is exactly what was typed, and a save waits for the one
 * before it, so two are never in flight. Typing carries on while one is. The field isn't
 * remounted by a save: notes saved elsewhere only replace what's typed when nothing was typed over
 * the old ones.
 */
export function InterviewNotesForm({
  interview,
  label,
  tracker,
  onSave,
}: {
  interview: Interview;
  /** "Interview 2": tells the rows apart for screen readers. */
  label: string;
  /** Owned by the row, so "Saved" outlasts this form re-rendering with the saved notes. */
  tracker: SaveTracker;
  /** Checks and saves the notes with the row, which shows a missing date beside it. */
  onSave: (notes: string | null) => NotesSave;
}) {
  const [draft, setDraft] = useState(interview.notes ?? "");
  const [seen, setSeen] = useState(interview.notes);
  // What the server holds, for the unsaved check: the saved notes, or what a save just stored.
  const [stored, setStored] = useState(interview.notes);
  const [error, setError] = useState<string | undefined>();
  const errorId = `notes-${interview.id}-error`;
  const nearLimit = draft.length >= INTERVIEW_NOTES_MAX_LENGTH * 0.9;

  // Timers and saves run after this render, so they read the latest of these, not their own render's.
  const draftRef = useRef(draft);
  const onSaveRef = useRef(onSave);
  // What the server holds: the saved notes, or the ones a save just stored before the page catches up.
  const storedRef = useRef(interview.notes);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sendingRef = useRef(false);
  const flushAgainRef = useRef(false);

  useEffect(() => {
    draftRef.current = draft;
    onSaveRef.current = onSave;
  });
  useEffect(() => {
    storedRef.current = interview.notes;
  }, [interview.notes]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Notes saved elsewhere replace the draft, unless it was typed over; set during render, the way
  // React advises for state that follows a prop.
  if (interview.notes !== seen) {
    setSeen(interview.notes);
    setStored(interview.notes);
    if ((draft.trim() || null) === seen) setDraft(interview.notes ?? "");
  }

  // Notes still inside their typing pause, or whose save failed, are lost on leaving.
  useUnsavedChanges((draft.trim() || null) !== stored, () =>
    document.getElementById(`notes-${interview.id}`)?.focus(),
  );

  /** Saves what's typed now, if it differs from what's stored, once no other save is in flight. */
  function flush() {
    clearTimeout(timerRef.current);
    if (sendingRef.current) {
      flushAgainRef.current = true;
      return;
    }
    // As the API stores them: ends trimmed, blank is none.
    const notes = draftRef.current.trim() || null;
    if (notes === storedRef.current) return;
    const { problem, sent } = onSaveRef.current(notes);
    setError(problem);
    if (!sent) return;
    sendingRef.current = true;
    void sent.then((result) => {
      sendingRef.current = false;
      if (result.ok) {
        storedRef.current = notes;
        setStored(notes);
      }
      if (flushAgainRef.current) {
        flushAgainRef.current = false;
        flush();
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div>
        <div className="mb-1 flex min-h-4 flex-wrap items-center justify-between gap-x-2 text-xs font-medium text-body">
          <label htmlFor={`notes-${interview.id}`}>
            Interview notes<span className="sr-only">, {label}</span>
          </label>
          <span className="inline-flex flex-wrap items-center gap-3">
            {nearLimit && (
              <span>
                {draft.length.toLocaleString("en-CA")} of {INTERVIEW_NOTES_MAX_LENGTH.toLocaleString("en-CA")}{" "}
                characters
              </span>
            )}
            <SaveStatus status={tracker.status} label={`${label} notes`} onRetry={tracker.retry} />
          </span>
        </div>
        <textarea
          id={`notes-${interview.id}`}
          value={draft}
          rows={3}
          maxLength={INTERVIEW_NOTES_MAX_LENGTH}
          placeholder={PLACEHOLDERS.notes}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(undefined);
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(flush, NOTES_PAUSE_MS);
          }}
          onBlur={flush}
          {...invalidProps(errorId, error)}
          // Grows with the notes where the browser supports it; otherwise it scrolls and resizes.
          className={`${inputClasses} field-sizing-content max-h-96 min-h-20 resize-y`}
        />
        <FieldError id={errorId} error={error} />
      </div>
    </div>
  );
}
