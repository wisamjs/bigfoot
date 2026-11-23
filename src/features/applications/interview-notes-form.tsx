"use client";

import { Lightbulb, Pencil } from "lucide-react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { SaveStatus } from "@/components/ui/save-status";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import type { SaveResult, SaveTracker } from "@/hooks/use-save-status";
import {
  INTERVIEW_NOTES_FIELDS,
  INTERVIEW_NOTES_LABELS,
  INTERVIEW_NOTES_MAX_LENGTHS,
  hasInterviewNotes,
  noteBlocks,
  questions,
  type Interview,
  type InterviewNotesField,
} from "@/lib/applications";

/** How long typing must stop before an Interview notes field saves by itself. */
export const NOTES_PAUSE_MS = 1000;

/** What saving a field came to: the problem found before sending, and the save itself if one was sent. */
export type NotesSave = { problem: string | undefined; sent: Promise<SaveResult> | null };

/** The id of an Interview notes field's control. */
export function notesFieldId(interviewId: string, field: InterviewNotesField) {
  return `${field}-${interviewId}`;
}

/**
 * An Interview's notes on its Interview page (BIG-178, BIG-179): What they asked, How it went and
 * Takeaway for next time, written, read and cleared here. They read as text until edited: the
 * takeaway in its own card above, then How it went (lines starting "- " as a list) and They asked,
 * one question per line, with Edit at the top right (Add Interview notes while there are none).
 * A completed Interview with none opens straight into the three empty fields under "How did it go?".
 * Edit turns them into fields, as the Details card does its details, and Done goes back to the
 * text, unless a save has failed or a field is over its limit: then focus goes to that field.
 *
 * Each field saves by itself, as a draft, with its own save status: about a second after typing in
 * it stops, and when it's left. Each save replaces that field's last one, so what's stored is
 * exactly what was typed, and waits for the one before it, so two are never in flight for a field.
 * A field isn't remounted by a save: a value saved elsewhere only replaces what's typed when
 * nothing was typed over the old one.
 */
export function InterviewNotesForm({
  interview,
  trackers,
  onSave,
}: {
  interview: Interview;
  /** One per field, owned by the Interview page's editor, so "Saved" outlasts this form re-rendering with the saved value. */
  trackers: Record<InterviewNotesField, SaveTracker>;
  /** Checks and saves one field, or says why not. */
  onSave: (field: InterviewNotesField, value: string | null) => NotesSave;
}) {
  // Fresh: a completed Interview with nothing written yet opens straight into the fields.
  const [fresh] = useState(() => interview.completed && !hasInterviewNotes(interview));
  const [editing, setEditing] = useState(fresh);
  // Edit (or Add Interview notes) was pressed: the first field takes focus. Not on arriving at the page.
  const [asked, setAsked] = useState(false);
  const headingId = useId();
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(editing);

  const reopen = (field: InterviewNotesField) => {
    setEditing(true);
    requestAnimationFrame(() => document.getElementById(notesFieldId(interview.id, field))?.focus());
  };
  const drafts = {
    what_they_asked: useNotesDraft(interview, "what_they_asked", onSave, reopen),
    how_it_went: useNotesDraft(interview, "how_it_went", onSave, reopen),
    takeaway: useNotesDraft(interview, "takeaway", onSave, reopen),
  };

  // Back from the fields, focus returns to the button that opened them.
  useEffect(() => {
    if (wasEditingRef.current && !editing) editRef.current?.focus();
    wasEditingRef.current = editing;
  }, [editing]);

  function edit() {
    setAsked(true);
    setEditing(true);
  }

  function done() {
    const stuck = INTERVIEW_NOTES_FIELDS.find((field) => {
      const problem = drafts[field].flush();
      return problem || trackers[field].status.phase === "failed";
    });
    if (stuck) {
      document.getElementById(notesFieldId(interview.id, stuck))?.focus();
      return;
    }
    setEditing(false);
  }

  const shown = Object.fromEntries(
    INTERVIEW_NOTES_FIELDS.map((field) => [field, drafts[field].draft.trim() || null]),
  ) as Record<InterviewNotesField, string | null>;
  const any = hasInterviewNotes(shown);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {!editing && shown.takeaway && <TakeawayCard takeaway={shown.takeaway} />}
      <section
        aria-labelledby={headingId}
        className={`card flex min-w-0 flex-col gap-4 p-5 sm:p-7 ${editing ? "border-line-brand-subtle" : ""}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <NotesHeading id={headingId} justFinished={editing && fresh && !asked} />
          {!editing && (
            <span className="inline-flex flex-wrap items-center gap-3">
              {INTERVIEW_NOTES_FIELDS.map((field) => (
                <SaveStatus
                  key={field}
                  status={trackers[field].status}
                  label={INTERVIEW_NOTES_LABELS[field]}
                  onRetry={trackers[field].retry}
                />
              ))}
              {any && (
                <Button ref={editRef} variant="tertiary" className="px-2.5" onClick={edit} aria-label="Edit Interview notes">
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
              )}
            </span>
          )}
        </div>
        {editing ? (
          <>
            {INTERVIEW_NOTES_FIELDS.map((field, index) => (
              <NotesField
                key={field}
                id={notesFieldId(interview.id, field)}
                field={field}
                draft={drafts[field]}
                tracker={trackers[field]}
                focusOnOpen={asked && index === 0}
              />
            ))}
            <Button onClick={done} className="self-start">
              Done
            </Button>
          </>
        ) : (
          <NotesRead notes={shown} editRef={editRef} onAdd={edit} />
        )}
      </section>
    </div>
  );
}

/** The notes read as text, or, with none, says so with Add Interview notes. */
function NotesRead({
  notes,
  editRef,
  onAdd,
}: {
  notes: Record<InterviewNotesField, string | null>;
  editRef: RefObject<HTMLButtonElement | null>;
  onAdd: () => void;
}) {
  if (hasInterviewNotes(notes)) return <NotesText howItWent={notes.how_it_went} whatTheyAsked={notes.what_they_asked} />;
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="m-0 text-base text-body">No Interview notes yet.</p>
      <Button ref={editRef} variant="secondary" onClick={onAdd}>
        Add Interview notes
      </Button>
    </div>
  );
}

/** The card's heading: "Interview notes", or "How did it go?" for a completed Interview just opened with none. */
function NotesHeading({ id, justFinished }: { id: string; justFinished: boolean }) {
  if (!justFinished) {
    return (
      <h2 id={id} className="m-0 text-2xl font-bold leading-[1.25] text-heading">
        Interview notes
      </h2>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-fg-brand">
        Just finished · write it down while it’s fresh
      </p>
      <h2 id={id} className="m-0 text-2xl font-bold leading-[1.25] text-heading">
        How did it go?
      </h2>
      <p className="m-0 text-sm text-body">Two minutes now beats twenty from memory. Every field is optional.</p>
    </div>
  );
}

/** One field's draft: what's typed, why it can't be saved, and how to save it now. */
type NotesDraft = {
  draft: string;
  error: string | undefined;
  change: (value: string) => void;
  /** Saves what's typed now, if it differs from what's stored. Returns why it couldn't send it, if so. */
  flush: () => string | undefined;
};

/**
 * The draft of one Interview notes field: saved about a second after typing stops and when the
 * field is left (`flush`), one save at a time. A value saved elsewhere replaces the draft unless it
 * was typed over. Reports itself unsaved, so leaving the page asks first; Keep editing reopens it.
 */
function useNotesDraft(
  interview: Interview,
  field: InterviewNotesField,
  onSave: (field: InterviewNotesField, value: string | null) => NotesSave,
  reopen: (field: InterviewNotesField) => void,
): NotesDraft {
  const saved = interview[field];
  const [draft, setDraft] = useState(saved ?? "");
  const [seen, setSeen] = useState(saved);
  // What the server holds, for the unsaved check: the saved value, or what a save just stored.
  const [stored, setStored] = useState(saved);
  const [error, setError] = useState<string | undefined>();

  // Timers and saves run after this render, so they read the latest of these, not their own render's.
  const draftRef = useRef(draft);
  const onSaveRef = useRef(onSave);
  const storedRef = useRef(saved);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sendingRef = useRef(false);
  const flushAgainRef = useRef(false);

  useEffect(() => {
    draftRef.current = draft;
    onSaveRef.current = onSave;
  });
  useEffect(() => {
    storedRef.current = saved;
  }, [saved]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // A value saved elsewhere replaces the draft, unless it was typed over; set during render, the
  // way React advises for state that follows a prop.
  if (saved !== seen) {
    setSeen(saved);
    setStored(saved);
    if ((draft.trim() || null) === seen) setDraft(saved ?? "");
  }

  // A draft still inside its typing pause, or whose save failed, is lost on leaving.
  useUnsavedChanges((draft.trim() || null) !== stored, () => reopen(field));

  function flush(): string | undefined {
    clearTimeout(timerRef.current);
    if (sendingRef.current) {
      flushAgainRef.current = true;
      return undefined;
    }
    // As the API stores it: ends trimmed, blank is none.
    const value = draftRef.current.trim() || null;
    if (value === storedRef.current) return undefined;
    const { problem, sent } = onSaveRef.current(field, value);
    setError(problem);
    if (!sent) return problem;
    sendingRef.current = true;
    void sent.then((result) => {
      sendingRef.current = false;
      if (result.ok) {
        storedRef.current = value;
        setStored(value);
      }
      if (flushAgainRef.current) {
        flushAgainRef.current = false;
        flush();
      }
    });
    return undefined;
  }

  return {
    draft,
    error,
    flush,
    change(value) {
      setDraft(value);
      setError(undefined);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, NOTES_PAUSE_MS);
    },
  };
}

/** One field while editing: its label and save status, the field, and its character count near the limit. */
function NotesField({
  id,
  field,
  draft,
  tracker,
  focusOnOpen,
}: {
  id: string;
  field: InterviewNotesField;
  draft: NotesDraft;
  tracker: SaveTracker;
  /** Pressing Edit or Add Interview notes is the request to write; arriving at the page isn't. */
  focusOnOpen: boolean;
}) {
  const label = INTERVIEW_NOTES_LABELS[field];
  const max = INTERVIEW_NOTES_MAX_LENGTHS[field];
  const errorId = `${id}-error`;
  const nearLimit = draft.draft.length >= max * 0.9;
  const focusRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  // Focus once, when the fields open at the job seeker's request.
  const [focusFirst] = useState(focusOnOpen);
  useEffect(() => {
    if (focusFirst) focusRef.current?.focus();
  }, [focusFirst]);
  const shared = {
    id,
    value: draft.draft,
    maxLength: max,
    placeholder: PLACEHOLDERS[field],
    onBlur: () => void draft.flush(),
    ...invalidProps(errorId, draft.error),
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-heading">
          {label}
        </label>
        <SaveStatus status={tracker.status} label={label} onRetry={tracker.retry} />
      </div>
      {field === "takeaway" ? (
        <input
          ref={focusRef}
          {...shared}
          type="text"
          onChange={(e) => draft.change(e.target.value)}
          className={inputClasses}
        />
      ) : (
        <textarea
          ref={focusRef}
          {...shared}
          rows={3}
          onChange={(e) => draft.change(e.target.value)}
          // Grows with the text where the browser supports it; otherwise it scrolls and resizes.
          className={`${inputClasses} field-sizing-content max-h-96 min-h-20 resize-y`}
        />
      )}
      {nearLimit && (
        <span className="text-xs font-medium text-body">
          {draft.draft.length.toLocaleString("en-CA")} of {max.toLocaleString("en-CA")} characters
        </span>
      )}
      <FieldError id={errorId} error={draft.error} />
    </div>
  );
}

/** The takeaway, read: its own card above the notes, with a lightbulb. */
function TakeawayCard({ takeaway }: { takeaway: string }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="card flex min-w-0 gap-3 border-line-brand-subtle p-5 sm:p-6"
    >
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-fg-brand" aria-hidden />
      <div className="min-w-0">
        <h2 id={headingId} className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-fg-brand">
          {INTERVIEW_NOTES_LABELS.takeaway}
        </h2>
        <p className="m-0 mt-1 break-words text-lg font-bold leading-[1.4] text-heading">{takeaway}</p>
      </div>
    </section>
  );
}

/** How it went as text (lines starting "- " as a list, the rest as paragraphs), then They asked as a list. */
function NotesText({ howItWent, whatTheyAsked }: { howItWent: string | null; whatTheyAsked: string | null }) {
  const asked = questions(whatTheyAsked);
  return (
    <div className="flex min-w-0 flex-col gap-4 break-words text-base leading-[1.6] text-body">
      {howItWent && (
        <div className="flex flex-col gap-3">
          {noteBlocks(howItWent).map((block) =>
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
      )}
      {asked.length > 0 && <TheyAsked questions={asked} />}
    </div>
  );
}

/** What they asked, one question per line, as a list under "They asked". */
export function TheyAsked({ questions: asked, className = "" }: { questions: string[]; className?: string }) {
  const headingId = useId();
  // Keyed by their text, numbered when one repeats.
  const seen = new Map<string, number>();
  const items = asked.map((text) => {
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { text, key: `${count}:${text}` };
  });
  return (
    <div className={className}>
      <h3 id={headingId} className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-body">
        They asked
      </h3>
      <ul aria-labelledby={headingId} className="m-0 mt-2 flex list-disc flex-col gap-1 pl-5">
        {items.map((item) => (
          <li key={item.key}>{item.text}</li>
        ))}
      </ul>
    </div>
  );
}
