"use client";

import { Pencil } from "lucide-react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { SaveStatus } from "@/components/ui/save-status";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import type { SaveResult, SaveTracker } from "@/hooks/use-save-status";
import { INTERVIEW_NOTES_MAX_LENGTH, noteBlocks, type Interview } from "@/lib/applications";

/** How long typing must stop before Interview notes save by themselves. */
export const NOTES_PAUSE_MS = 1000;

/** What saving the notes came to: the problem found before sending, and the save itself if one was sent. */
export type NotesSave = { problem: string | undefined; sent: Promise<SaveResult> | null };

/**
 * An Interview's notes card, on its Interview page (BIG-178): written, read and cleared here. It
 * reads as text until edited, lines starting "- " as a list, with Edit at the top right (Add
 * Interview notes while there are none). Edit turns the notes into a field, as the Details card does
 * its details, and Done goes back to the text, unless a save has failed or the notes are over the
 * limit: then focus stays in the field. The notes save by themselves, as a draft: about a second
 * after typing stops, and when the field is left. Each save replaces the last, so what's stored is
 * exactly what was typed, and a save waits for the one before it, so two are never in flight.
 * Typing carries on while one is. The field isn't remounted by a save: notes saved elsewhere only
 * replace what's typed when nothing was typed over the old ones.
 */
export function InterviewNotesForm({
  interview,
  tracker,
  onSave,
}: {
  interview: Interview;
  /** Owned by the Interview page's editor, so "Saved" outlasts this form re-rendering with the saved notes. */
  tracker: SaveTracker;
  /** Checks and saves the notes, or says why not. */
  onSave: (notes: string | null) => NotesSave;
}) {
  const [draft, setDraft] = useState(interview.notes ?? "");
  const [seen, setSeen] = useState(interview.notes);
  // What the server holds, for the unsaved check: the saved notes, or what a save just stored.
  const [stored, setStored] = useState(interview.notes);
  const [error, setError] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const headingId = useId();
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(editing);
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

  // Back from the field, focus returns to the button that opened it.
  useEffect(() => {
    if (wasEditingRef.current && !editing) editRef.current?.focus();
    wasEditingRef.current = editing;
  }, [editing]);

  // Notes still inside their typing pause, or whose save failed, are lost on leaving: the prompt's
  // Keep editing opens the field again.
  useUnsavedChanges((draft.trim() || null) !== stored, () => {
    setEditing(true);
    document.getElementById(`notes-${interview.id}`)?.focus();
  });

  /** Saves what's typed now, if it differs from what's stored, once no other save is in flight. Returns why it couldn't send them, if so. */
  function flush(): string | undefined {
    clearTimeout(timerRef.current);
    if (sendingRef.current) {
      flushAgainRef.current = true;
      return undefined;
    }
    // As the API stores them: ends trimmed, blank is none.
    const notes = draftRef.current.trim() || null;
    if (notes === storedRef.current) return undefined;
    const { problem, sent } = onSaveRef.current(notes);
    setError(problem);
    if (!sent) return problem;
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
    return undefined;
  }

  function done() {
    const problem = flush();
    if (problem || tracker.status.phase === "failed") {
      document.getElementById(`notes-${interview.id}`)?.focus();
      return;
    }
    setEditing(false);
  }

  return (
    <NotesCard
      headingId={headingId}
      fieldId={`notes-${interview.id}`}
      errorId={errorId}
      error={error}
      editing={editing}
      draft={draft}
      nearLimit={nearLimit}
      tracker={tracker}
      editRef={editRef}
      onEdit={() => setEditing(true)}
      onChange={(value) => {
        setDraft(value);
        setError(undefined);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, NOTES_PAUSE_MS);
      }}
      onBlur={() => void flush()}
      onDone={done}
    />
  );
}

/** The card itself: its heading and save status, then the text or, while editing, the field and Done. */
function NotesCard({
  headingId,
  fieldId,
  errorId,
  error,
  editing,
  draft,
  nearLimit,
  tracker,
  editRef,
  onEdit,
  onChange,
  onBlur,
  onDone,
}: {
  headingId: string;
  fieldId: string;
  errorId: string;
  error: string | undefined;
  editing: boolean;
  draft: string;
  nearLimit: boolean;
  tracker: SaveTracker;
  editRef: RefObject<HTMLButtonElement | null>;
  onEdit: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  onDone: () => void;
}) {
  const notes = draft.trim() || null;
  return (
    <section
      aria-labelledby={headingId}
      className={`card flex min-w-0 flex-col gap-4 p-5 sm:p-7 ${editing ? "border-line-brand-subtle" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="m-0 text-2xl font-bold leading-[1.25] text-heading">
          Interview notes
        </h2>
        <span className="inline-flex flex-wrap items-center gap-3">
          {editing && nearLimit && (
            <span className="text-xs font-medium text-body">
              {draft.length.toLocaleString("en-CA")} of {INTERVIEW_NOTES_MAX_LENGTH.toLocaleString("en-CA")} characters
            </span>
          )}
          <SaveStatus status={tracker.status} label="Interview notes" onRetry={tracker.retry} />
          {!editing && notes && (
            <Button ref={editRef} variant="tertiary" className="px-2.5" onClick={onEdit} aria-label="Edit Interview notes">
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
          )}
        </span>
      </div>
      {editing ? (
        <>
          <div>
            <textarea
              id={fieldId}
              aria-labelledby={headingId}
              value={draft}
              rows={3}
              maxLength={INTERVIEW_NOTES_MAX_LENGTH}
              placeholder={PLACEHOLDERS.notes}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- Pressing Edit or Add Interview notes is the request to write.
              autoFocus
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              {...invalidProps(errorId, error)}
              // Grows with the notes where the browser supports it; otherwise it scrolls and resizes.
              className={`${inputClasses} field-sizing-content max-h-96 min-h-20 resize-y`}
            />
            <FieldError id={errorId} error={error} />
          </div>
          <Button onClick={onDone} className="self-start">
            Done
          </Button>
        </>
      ) : notes ? (
        <NotesText notes={notes} />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="m-0 text-base text-body">No Interview notes yet.</p>
          <Button ref={editRef} variant="secondary" onClick={onEdit}>
            Add Interview notes
          </Button>
        </div>
      )}
    </section>
  );
}

/** The notes as text: lines starting "- " as a list, the rest as paragraphs. */
function NotesText({ notes }: { notes: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 break-words text-base leading-[1.6] text-body">
      {noteBlocks(notes).map((block) =>
        block.type === "list" ? (
          <ul key={block.id} className="m-0 flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        ) : (
          <p key={block.id} className="m-0 whitespace-pre-line">
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}
