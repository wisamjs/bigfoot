"use client";

import { Pencil, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { GetReadyFor } from "@/features/applications/application-when";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { SaveStatus } from "@/components/ui/save-status";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import type { SaveResult, SaveTracker } from "@/hooks/use-save-status";
import { INTERVIEW_NOTES_MAX_LENGTH, INTERVIEW_PREP_NOTES_MAX_LENGTH, noteBlocks, type Interview } from "@/lib/applications";

/** How long typing must stop before Interview notes save by themselves. */
export const NOTES_PAUSE_MS = 1000;

/** The two notes an Interview carries, which read, edit and save the same way. */
export type NotesField = "notes" | "prep_notes";

const NOTES_FIELDS = {
  notes: {
    title: "Interview notes",
    idPrefix: "notes",
    placeholder: PLACEHOLDERS.notes,
    maxLength: INTERVIEW_NOTES_MAX_LENGTH,
  },
  prep_notes: {
    title: "Prep notes",
    idPrefix: "prep-notes",
    placeholder: PLACEHOLDERS.prep_notes,
    maxLength: INTERVIEW_PREP_NOTES_MAX_LENGTH,
  },
} as const;

/**
 * How a notes card sits on the Interview page (BIG-180). Plain: Interview notes of a completed
 * Interview. Before and after: an upcoming Interview's two cards, Prep notes ("Get ready for
 * Wednesday") then Interview notes, which is a dashed "Nothing yet, that's expected" until written.
 * Folded: a completed Interview's Prep notes under its Interview notes, shown as their first lines
 * until opened, and not at all when there are none.
 */
type Layout = "plain" | "before" | "after" | "folded";

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
export function InterviewNotesForm(props: NotesFormProps) {
  return <NotesForm {...props} field="notes" layout={props.interview.completed ? "plain" : "after"} />;
}

/**
 * An Interview's Prep notes card (BIG-180): what the job seeker writes to get ready for it, kept
 * apart from the Interview notes about how it went. It works as the Interview notes card does.
 * Before the Interview it is the first card ("Get ready for Wednesday"); afterwards it folds under
 * the Interview notes, and is left out while empty.
 */
export function PrepNotesForm(props: NotesFormProps) {
  return <NotesForm {...props} field="prep_notes" layout={props.interview.completed ? "folded" : "before"} />;
}

type NotesFormProps = {
  interview: Interview;
  /** Owned by the Interview page's editor, so "Saved" outlasts this form re-rendering with the saved notes. */
  tracker: SaveTracker;
  /** Checks and saves the notes, or says why not. */
  onSave: (notes: string | null) => NotesSave;
};

function NotesForm({
  interview,
  field,
  layout,
  tracker,
  onSave,
}: NotesFormProps & { field: NotesField; layout: Layout }) {
  const { title, idPrefix, placeholder, maxLength } = NOTES_FIELDS[field];
  const saved = interview[field];
  const [draft, setDraft] = useState(saved ?? "");
  const [seen, setSeen] = useState(saved);
  // What the server holds, for the unsaved check: the saved notes, or what a save just stored.
  const [stored, setStored] = useState(saved);
  const [error, setError] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  // Folded Prep notes show their first lines until opened.
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(editing);
  const fieldId = `${idPrefix}-${interview.id}`;
  const errorId = `${fieldId}-error`;
  const nearLimit = draft.length >= maxLength * 0.9;

  // Timers and saves run after this render, so they read the latest of these, not their own render's.
  const draftRef = useRef(draft);
  const onSaveRef = useRef(onSave);
  // What the server holds: the saved notes, or the ones a save just stored before the page catches up.
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

  // Notes saved elsewhere replace the draft, unless it was typed over; set during render, the way
  // React advises for state that follows a prop.
  if (saved !== seen) {
    setSeen(saved);
    setStored(saved);
    if ((draft.trim() || null) === seen) setDraft(saved ?? "");
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
    document.getElementById(fieldId)?.focus();
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
      document.getElementById(fieldId)?.focus();
      return;
    }
    setEditing(false);
  }

  return (
    <NotesCard
      title={title}
      placeholder={placeholder}
      maxLength={maxLength}
      layout={layout}
      at={interview.at}
      open={open}
      onToggle={() => setOpen((was) => !was)}
      headingId={headingId}
      fieldId={fieldId}
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

type CardProps = {
  title: string;
  placeholder: string;
  maxLength: number;
  layout: Layout;
  at: string;
  open: boolean;
  onToggle: () => void;
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
};

/**
 * The card itself: its heading and save status, then the text or, while editing, the field and
 * Done. `layout` says where it sits on the Interview page (see Layout).
 */
function NotesCard(props: CardProps) {
  const { notes, hidden, waiting, showing, className } = cardState(props);
  if (hidden) return null;
  return (
    <section aria-labelledby={props.headingId} className={className}>
      <NotesHeading {...props} canEdit={!props.editing && !!notes && showing} />
      <NotesBody {...props} notes={notes} showing={showing} waiting={waiting} />
    </section>
  );
}

/** What the card shows: the notes, whether it is left out (folded Prep notes with none), waiting (dashed) or showing in full. */
function cardState({ layout, editing, draft, open }: Pick<CardProps, "layout" | "editing" | "draft" | "open">) {
  const notes = draft.trim() || null;
  const folded = layout === "folded";
  const waiting = layout === "after" && !notes && !editing;
  const className = ["card flex min-w-0 flex-col gap-4 p-5 sm:p-7", editing && "border-line-brand-subtle", waiting && "border-dashed"]
    .filter(Boolean)
    .join(" ");
  // Prep notes of a completed Interview that has none aren't shown empty.
  return { notes, hidden: folded && !notes && !editing, waiting, showing: !folded || open || editing, className };
}

/** Under the heading: the "Get ready for" line, then the field, the text (folded or whole) or the Add button. */
function NotesBody(props: CardProps & { notes: string | null; showing: boolean; waiting: boolean }) {
  const { layout, at, editing, notes, showing, waiting, open, onToggle, title, editRef, onEdit } = props;
  return (
    <>
      {layout === "before" && (
        <p className="m-0 text-base font-medium text-heading">
          <GetReadyFor at={at} />
        </p>
      )}
      {editing ? (
        <NotesField {...props} />
      ) : notes ? (
        <>
          <NotesText notes={showing ? notes : firstLines(notes)} />
          {layout === "folded" && (
            <Button variant="tertiary" className="self-start px-2.5" onClick={onToggle} aria-expanded={open}>
              {open ? `Hide ${title}` : `Show ${title}`}
            </Button>
          )}
        </>
      ) : (
        <NoNotes title={title} layout={layout} waiting={waiting} editRef={editRef} onEdit={onEdit} />
      )}
    </>
  );
}

/** The heading with its "Before" or "After" label, the character count near the limit, the save status and Edit. */
function NotesHeading({
  title,
  layout,
  headingId,
  editing,
  draft,
  maxLength,
  nearLimit,
  tracker,
  canEdit,
  editRef,
  onEdit,
}: CardProps & { canEdit: boolean }) {
  const eyebrow = layout === "before" ? "Before" : layout === "after" ? "After" : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <p className="m-0 text-xs font-bold uppercase tracking-wide text-body">{eyebrow}</p>}
        <h2
          id={headingId}
          className={`m-0 font-bold leading-[1.25] text-heading ${layout === "folded" ? "text-xl" : "text-2xl"}`}
        >
          {title}
        </h2>
      </div>
      <span className="inline-flex flex-wrap items-center gap-3">
        {editing && nearLimit && (
          <span className="text-xs font-medium text-body">
            {draft.length.toLocaleString("en-CA")} of {maxLength.toLocaleString("en-CA")} characters
          </span>
        )}
        <SaveStatus status={tracker.status} label={title} onRetry={tracker.retry} />
        {canEdit && (
          <Button ref={editRef} variant="tertiary" className="px-2.5" onClick={onEdit} aria-label={`Edit ${title}`}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
        )}
      </span>
    </div>
  );
}

/** The textarea that saves by itself, its error, and Done. */
function NotesField({
  headingId,
  fieldId,
  errorId,
  error,
  draft,
  maxLength,
  placeholder,
  onChange,
  onBlur,
  onDone,
}: CardProps) {
  return (
    <>
      <div>
        <textarea
          id={fieldId}
          aria-labelledby={headingId}
          value={draft}
          rows={3}
          maxLength={maxLength}
          placeholder={placeholder}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- Pressing Edit or Add is the request to write.
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
  );
}

/** A card with nothing written: the dashed "Nothing yet" of the After card, "No … yet" or just the Add button. */
function NoNotes({
  title,
  layout,
  waiting,
  editRef,
  onEdit,
}: {
  title: string;
  layout: Layout;
  waiting: boolean;
  editRef: RefObject<HTMLButtonElement | null>;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      {waiting && (
        <div className="flex flex-col gap-1">
          <p className="m-0 text-base font-medium text-heading">Nothing yet, that’s expected</p>
          <p className="m-0 text-base text-body">Write down how it went once it’s over.</p>
        </div>
      )}
      {layout === "plain" && <p className="m-0 text-base text-body">No {title} yet.</p>}
      <Button ref={editRef} variant="secondary" onClick={onEdit}>
        {layout === "before" && <Plus className="size-4" aria-hidden />}
        Add {title}
      </Button>
    </div>
  );
}

/** How many lines of folded Prep notes show before "Show Prep notes". */
const FOLDED_LINES = 2;

/** The first lines of some notes, with "…" when there are more. */
function firstLines(notes: string): string {
  const lines = notes.split("\n").filter((line) => line.trim());
  return lines.length > FOLDED_LINES ? `${lines.slice(0, FOLDED_LINES).join("\n")}\n…` : lines.join("\n");
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
