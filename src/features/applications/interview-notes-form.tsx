"use client";

import { Lightbulb, Pencil, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { MarkdownView } from "@/components/ui/markdown-view";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { GetReadyFor } from "@/features/applications/application-when";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { PrepLookBack, TakeawayShowsOn } from "@/features/applications/prep-look-back";
import { SaveStatus } from "@/components/ui/save-status";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import { NotebookBigfoot, WritingBigfoot } from "@/features/shell/illustrations";
import type { SaveResult, SaveTracker } from "@/hooks/use-save-status";
import {
  INTERVIEW_NOTES_FIELDS,
  INTERVIEW_NOTES_LABELS,
  INTERVIEW_NOTES_MAX_LENGTHS,
  INTERVIEW_PREP_NOTES_MAX_LENGTH,
  hasInterviewNotes,
  questions,
  type Interview,
  type InterviewNotesField,
  type PrepLookBack as LookBack,
  type PrepTakeaway,
} from "@/lib/applications";

/** Nothing to look back at, or nowhere a takeaway shows: what a page with no other Applications passes. */
export const NO_LOOK_BACK: LookBack = { takeaways: [], theyAsked: null };
const NOWHERE: PrepTakeaway[] = [];

/** How long typing must stop before an Interview notes field saves by itself. */
export const NOTES_PAUSE_MS = 1000;

/** A field of notes an Interview carries: one of the Interview notes fields, or its Prep notes. */
export type NotesFieldName = InterviewNotesField | "prep_notes";

/** What saving a field came to: the problem found before sending, and the save itself if one was sent. */
export type NotesSave = { problem: string | undefined; sent: Promise<SaveResult> | null };

/** The id of a notes field's control. */
export function notesFieldId(interviewId: string, field: NotesFieldName) {
  return `${field}-${interviewId}`;
}

/**
 * An Interview's notes on its Interview page (BIG-178, BIG-179): What they asked, How it went and
 * Takeaway for next time, written, read and cleared here. They read as text until edited: the
 * takeaway in its own card above, then How it went (Markdown, formatted: BIG-214) and They asked,
 * one question per line, with Edit at the top right (Add Interview notes while there are none).
 * A completed Interview with none opens straight into the three empty fields under "How did it go?";
 * an upcoming one is the "After" card, dashed with "Nothing yet, that's expected" until written
 * (BIG-180). The takeaway's card says which upcoming Interviews' prep it shows on (BIG-181).
 * Edit turns them into fields, as the Details card does its details, and Done goes back to the
 * text, unless a save has failed or a field is over its limit: then focus goes to that field.
 * While there are none to read, Bigfoot writes in the card's empty right side (BIG-228).
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
  showsOn = NOWHERE,
}: {
  interview: Interview;
  /** The upcoming Interviews whose prep shows this one's takeaway (takeawayShowsOn). */
  showsOn?: PrepTakeaway[];
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
  // An upcoming Interview with nothing written yet waits for afterwards.
  const empty = !any && !editing;
  const waiting = empty && !interview.completed;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {!editing && shown.takeaway && <TakeawayCard takeaway={shown.takeaway} showsOn={showsOn} />}
      <NotesCard labelledBy={headingId} editing={editing} waiting={waiting} empty={empty} Art={WritingBigfoot}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <NotesHeading id={headingId} justFinished={editing && fresh && !asked} after={!interview.completed} />
          {!editing && <NotesStatuses trackers={trackers} canEdit={any} editRef={editRef} onEdit={edit} />}
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
          <NotesRead notes={shown} waiting={waiting} editRef={editRef} onAdd={edit} />
        )}
      </NotesCard>
    </div>
  );
}

/**
 * A notes card: outlined while editing, dashed while waiting for afterwards, and, while `empty`,
 * holding Bigfoot (`Art`) at its bottom right (BIG-228), with room kept for him so nothing runs
 * under him. He is out of the flow, so the card keeps its size, and as tall as the card allows up
 * to 150px. Decorative, and hidden on phones.
 */
function NotesCard({
  labelledBy,
  editing,
  waiting = false,
  empty,
  Art,
  children,
}: {
  labelledBy: string;
  editing: boolean;
  waiting?: boolean;
  empty: boolean;
  Art: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cardClasses(editing, waiting, empty)}>
      {children}
      {empty && (
        <Art className="pointer-events-none absolute bottom-2.5 right-8 hidden h-[min(150px,calc(100%-1.25rem))] w-auto sm:block" />
      )}
    </section>
  );
}

/** The notes card's classes; an `empty` one keeps room at its right for Bigfoot. */
function cardClasses(editing: boolean, waiting: boolean, empty: boolean) {
  return [
    "card flex min-w-0 flex-col gap-4 p-5 sm:p-7",
    editing && "border-line-brand-subtle",
    waiting && "border-dashed",
    empty && "relative sm:pr-48",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Each field's save status, then Edit once there is something to edit. */
function NotesStatuses({
  trackers,
  canEdit,
  editRef,
  onEdit,
}: {
  trackers: Record<InterviewNotesField, SaveTracker>;
  canEdit: boolean;
  editRef: RefObject<HTMLButtonElement | null>;
  onEdit: () => void;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      {INTERVIEW_NOTES_FIELDS.map((field) => (
        <SaveStatus
          key={field}
          status={trackers[field].status}
          label={INTERVIEW_NOTES_LABELS[field]}
          onRetry={trackers[field].retry}
        />
      ))}
      {canEdit && <EditButton label="Edit Interview notes" editRef={editRef} onEdit={onEdit} />}
    </span>
  );
}

/** The Edit text button, in the brand colour (BIG-202), at a notes card's top right. */
function EditButton({
  label,
  editRef,
  onEdit,
}: {
  label: string;
  editRef: RefObject<HTMLButtonElement | null>;
  onEdit: () => void;
}) {
  return (
    <button
      ref={editRef}
      type="button"
      onClick={onEdit}
      aria-label={label}
      className="touch-target inline-flex items-center gap-1.5 rounded-control px-2 text-base font-semibold text-fg-brand transition-colors hover:text-fg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Pencil className="size-4" aria-hidden />
      Edit
    </button>
  );
}

/** The notes read as text, or, with none, says so with Add Interview notes. */
function NotesRead({
  notes,
  waiting,
  editRef,
  onAdd,
}: {
  notes: Record<InterviewNotesField, string | null>;
  /** An upcoming Interview with none: dashed "Nothing yet" instead of "No Interview notes yet." */
  waiting: boolean;
  editRef: RefObject<HTMLButtonElement | null>;
  onAdd: () => void;
}) {
  if (hasInterviewNotes(notes)) return <NotesText howItWent={notes.how_it_went} whatTheyAsked={notes.what_they_asked} />;
  return (
    <div className="flex flex-col items-start gap-3">
      {waiting ? (
        <div className="flex flex-col gap-1">
          <p className="m-0 text-base font-medium text-heading">Nothing yet, that’s expected</p>
          <p className="m-0 text-base text-body">Write down how it went once it’s over.</p>
        </div>
      ) : (
        <p className="m-0 text-base text-body">No Interview notes yet.</p>
      )}
      <Button ref={editRef} variant="secondary" onClick={onAdd}>
        Add Interview notes
      </Button>
    </div>
  );
}

/**
 * The card's heading: "Interview notes" (under "After" before the Interview), or "How did it go?"
 * for a completed Interview just opened with none.
 */
function NotesHeading({ id, justFinished, after }: { id: string; justFinished: boolean; after: boolean }) {
  if (!justFinished) {
    return (
      <div className="flex flex-col gap-1">
        {after && <p className="m-0 text-xs font-bold uppercase tracking-wide text-body">After</p>}
        <h2 id={id} className="m-0 text-2xl font-bold leading-[1.25] text-heading">
          Interview notes
        </h2>
      </div>
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
 * The draft of one Interview notes or Prep notes field: saved about a second after typing stops and when the
 * field is left (`flush`), one save at a time. A value saved elsewhere replaces the draft unless it
 * was typed over. Reports itself unsaved, so leaving the page asks first; Keep editing reopens it.
 */
function useNotesDraft<Field extends NotesFieldName>(
  interview: Interview,
  field: Field,
  onSave: (field: Field, value: string | null) => NotesSave,
  reopen: (field: Field) => void,
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

/**
 * One field while editing: its label and save status, the field, and its character count near the
 * limit. How it went formats as it's written (BIG-214); They asked stays a plain list, one per line.
 */
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
  const labelId = `${id}-label`;
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
        <label id={labelId} htmlFor={id} className="text-sm font-bold text-heading">
          {label}
        </label>
        <SaveStatus status={tracker.status} label={label} onRetry={tracker.retry} />
      </div>
      {field === "how_it_went" ? (
        <RichTextEditor
          id={id}
          value={draft.draft}
          onChange={draft.change}
          onBlur={() => void draft.flush()}
          placeholder={PLACEHOLDERS[field]}
          labelledBy={labelId}
          errorId={errorId}
          error={draft.error}
          focusOnOpen={focusFirst}
        />
      ) : field === "takeaway" ? (
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

/** The takeaway, read: its own card above the notes, with a lightbulb and where it shows. */
function TakeawayCard({ takeaway, showsOn }: { takeaway: string; showsOn: PrepTakeaway[] }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="card flex min-w-0 gap-3 border-brand p-5 sm:p-6"
    >
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-fg-brand" aria-hidden />
      <div className="min-w-0">
        <h2 id={headingId} className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-fg-brand">
          {INTERVIEW_NOTES_LABELS.takeaway}
        </h2>
        <p className="m-0 mt-1 break-words text-lg font-bold leading-[1.4] text-heading">{takeaway}</p>
        <TakeawayShowsOn showsOn={showsOn} />
      </div>
    </section>
  );
}

/** How it went formatted from its Markdown, then They asked as a list. */
function NotesText({ howItWent, whatTheyAsked }: { howItWent: string | null; whatTheyAsked: string | null }) {
  const asked = questions(whatTheyAsked);
  return (
    <div className="flex min-w-0 flex-col gap-4 break-words text-base leading-[1.7] text-heading md:text-lg">
      {howItWent && <MarkdownView markdown={howItWent} />}
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

/**
 * An Interview's Prep notes card (BIG-180): what the job seeker writes to get ready for it, kept
 * apart from the Interview notes about how it went. Before the Interview it is the first card
 * ("Get ready for Wednesday"); afterwards it folds under the Interview notes, as their first lines
 * until opened, and is left out while empty. It reads, edits and saves like the Interview notes:
 * as text until Edit, saving by itself with its own save status. Before the Interview, the
 * takeaways that apply and They asked last time show under its heading (BIG-181). Empty before
 * the Interview, Bigfoot holds a blank notebook in its right side (BIG-228).
 */
export function PrepNotesForm({
  interview,
  tracker,
  onSave,
  lookBack = NO_LOOK_BACK,
}: {
  interview: Interview;
  /** The takeaways and They asked last time this Interview's prep looks back at (prepLookBack). */
  lookBack?: LookBack;
  /** Owned by the Interview page's editor, so "Saved" outlasts this form re-rendering with the saved notes. */
  tracker: SaveTracker;
  /** Checks and saves the notes, or says why not. */
  onSave: (notes: string | null) => NotesSave;
}) {
  const folded = interview.completed;
  const [editing, setEditing] = useState(false);
  // Folded Prep notes show their first lines until opened.
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(editing);
  const draft = useNotesDraft(
    interview,
    "prep_notes",
    (_field, value) => onSave(value),
    () => setEditing(true),
  );
  const notes = draft.draft.trim() || null;

  // Back from the field, focus returns to the button that opened it.
  useEffect(() => {
    if (wasEditingRef.current && !editing) editRef.current?.focus();
    wasEditingRef.current = editing;
  }, [editing]);

  function done() {
    const problem = draft.flush();
    if (problem || tracker.status.phase === "failed") {
      document.getElementById(notesFieldId(interview.id, "prep_notes"))?.focus();
      return;
    }
    setEditing(false);
  }

  // Prep notes of a completed Interview that has none aren't shown empty.
  const empty = !notes && !editing;
  if (folded && empty) return null;
  return (
    <NotesCard labelledBy={headingId} editing={editing} empty={empty} Art={NotebookBigfoot}>
      <PrepHeading
        id={headingId}
        folded={folded}
        status={<SaveStatus status={tracker.status} label={PREP_NOTES_TITLE} onRetry={tracker.retry} />}
        edit={
          prepCanEdit({ editing, notes, folded, open }) && (
            <EditButton label={`Edit ${PREP_NOTES_TITLE}`} editRef={editRef} onEdit={() => setEditing(true)} />
          )
        }
      />
      {!folded && <GetReadyLine at={interview.at} />}
      {!folded && <PrepLookBack lookBack={lookBack} />}
      {editing ? (
        <PrepField id={notesFieldId(interview.id, "prep_notes")} headingId={headingId} draft={draft} onDone={done} />
      ) : (
        <PrepBody
          notes={notes}
          folded={folded}
          open={open}
          editRef={editRef}
          onToggle={() => setOpen((was) => !was)}
          onAdd={() => setEditing(true)}
        />
      )}
    </NotesCard>
  );
}

const PREP_NOTES_TITLE = "Prep notes";

/** Edit shows once there are notes to edit in full: not while editing, nor while they are still folded. */
function prepCanEdit({
  editing,
  notes,
  folded,
  open,
}: {
  editing: boolean;
  notes: string | null;
  folded: boolean;
  open: boolean;
}) {
  return !editing && Boolean(notes) && (!folded || open);
}

/** How many lines of folded Prep notes show before "Show Prep notes". */
const FOLDED_LINES = 2;

/** The first lines of some notes, with "…" when there are more. */
function firstLines(notes: string): string {
  const lines = notes.split("\n").filter((line) => line.trim());
  return lines.length > FOLDED_LINES ? `${lines.slice(0, FOLDED_LINES).join("\n")}\n…` : lines.join("\n");
}

/** "Get ready for Wednesday", above Prep notes before the Interview. */
function GetReadyLine({ at }: { at: string }) {
  return (
    <p className="m-0 text-base font-medium text-heading">
      <GetReadyFor at={at} />
    </p>
  );
}

/** The Prep notes heading, with its "Before" label while the Interview is ahead, the save status and Edit. */
function PrepHeading({
  id,
  folded,
  status,
  edit,
}: {
  id: string;
  folded: boolean;
  status: ReactNode;
  edit: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        {!folded && <p className="m-0 text-xs font-bold uppercase tracking-wide text-body">Before</p>}
        <h2 id={id} className={`m-0 font-bold leading-[1.25] text-heading ${folded ? "text-xl" : "text-2xl"}`}>
          {PREP_NOTES_TITLE}
        </h2>
      </div>
      <span className="inline-flex flex-wrap items-center gap-3">
        {status}
        {edit}
      </span>
    </div>
  );
}

/** Prep notes read as text, or, with none, the Add Prep notes button. */
function PrepBody({
  notes,
  folded,
  open,
  editRef,
  onToggle,
  onAdd,
}: {
  notes: string | null;
  folded: boolean;
  open: boolean;
  editRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
  onAdd: () => void;
}) {
  if (notes) return <PrepRead notes={notes} folded={folded} open={open} onToggle={onToggle} />;
  return (
    <Button ref={editRef} variant="secondary" className="self-start" onClick={onAdd}>
      <Plus className="size-4" aria-hidden />
      Add {PREP_NOTES_TITLE}
    </Button>
  );
}

/** Prep notes as text: whole, or while folded their first lines with Show or Hide Prep notes. */
function PrepRead({
  notes,
  folded,
  open,
  onToggle,
}: {
  notes: string;
  folded: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div className="flex min-w-0 flex-col gap-4 break-words text-base leading-[1.7] text-heading md:text-lg">
        <MarkdownView markdown={folded && !open ? firstLines(notes) : notes} />
      </div>
      {folded && (
        <Button variant="tertiary" className="self-start px-2.5" onClick={onToggle} aria-expanded={open}>
          {open ? `Hide ${PREP_NOTES_TITLE}` : `Show ${PREP_NOTES_TITLE}`}
        </Button>
      )}
    </>
  );
}

/** The Prep notes field that formats as it's written and saves by itself, its character count near the limit, its error and Done. */
function PrepField({
  id,
  headingId,
  draft,
  onDone,
}: {
  id: string;
  headingId: string;
  draft: NotesDraft;
  onDone: () => void;
}) {
  const errorId = `${id}-error`;
  const max = INTERVIEW_PREP_NOTES_MAX_LENGTH;
  return (
    <>
      <div>
        <RichTextEditor
          id={id}
          value={draft.draft}
          onChange={draft.change}
          onBlur={() => void draft.flush()}
          placeholder={PLACEHOLDERS.prep_notes}
          labelledBy={headingId}
          errorId={errorId}
          error={draft.error}
          // Pressing Edit or Add is the request to write.
          focusOnOpen
        />
        {draft.draft.length >= max * 0.9 && (
          <span className="text-xs font-medium text-body">
            {draft.draft.length.toLocaleString("en-CA")} of {max.toLocaleString("en-CA")} characters
          </span>
        )}
        <FieldError id={errorId} error={draft.error} />
      </div>
      <Button onClick={onDone} className="self-start">
        Done
      </Button>
    </>
  );
}
