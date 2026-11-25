"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useId, useRef, useState, type RefObject } from "react";
import { deleteInterviewAndLeaveAction, updateInterviewAction } from "@/app/applications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateTimePicker, splitDateTime, type DateAndTime } from "@/components/ui/date-time-picker";
import { Field, RequiredMark } from "@/components/ui/field";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { SaveStatus } from "@/components/ui/save-status";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSaveStatus } from "@/hooks/use-save-status";
import { useToday } from "@/hooks/use-today";
import { DeleteInterviewDialog } from "@/features/applications/application-dialogs";
import { CategoryBadge } from "@/features/applications/category-badge";
import { InterviewWhenLong } from "@/features/applications/application-when";
import { EditableHeading } from "@/features/applications/editable-heading";
import { fromLocalInput, toLocalInput } from "@/features/applications/local-datetime";
import { OUTCOME_TONE } from "@/features/applications/status-tone";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import {
  calendarDaysBetween,
  categoryLabel,
  INTERVIEW_CATEGORIES,
  INTERVIEW_TITLE_MAX_LENGTH,
  OUTCOME_OPTIONS,
  parseDay,
  relativeDays,
  STATUS_OPTIONS,
  type Application,
  type Interview,
  titleForCategory,
  type InterviewCategory,
  type InterviewFields,
} from "@/lib/applications";
import { interviewErrors, isValid, type FieldErrors } from "@/lib/validation";

type Saved = Pick<Interview, "category" | "title" | "at">;
type Values = Pick<Interview, "category" | "title"> & DateAndTime;

/** What the save status and Retry name: the fields Edit details changes. */
const STATUS_LABEL = "Category, title and date";

function valuesOf(saved: Saved): Values {
  return { category: saved.category, title: saved.title, ...splitDateTime(toLocalInput(saved.at)) };
}

/** The date and time as a datetime-local value; "" without a date. */
function localOf(values: DateAndTime) {
  return values.date ? `${values.date}T${values.time}` : "";
}

/** What differs from what's saved. A date without a time is no date: no time is assumed. */
function changesOf(values: Values, saved: Saved): Partial<InterviewFields> {
  const changes: Partial<InterviewFields> = {};
  if (values.category !== saved.category) changes.category = values.category;
  if (values.title.trim() !== saved.title) changes.title = values.title.trim();
  if (localOf(values) !== toLocalInput(saved.at)) {
    changes.at = values.date && values.time ? fromLocalInput(localOf(values)) : null;
  }
  return changes;
}

/**
 * The Interview page's heading (BIG-178): the company and role, the Interview title, its date
 * and time with the year, and badges for its Interview category and where it stands ("Upcoming · in 2 days",
 * "Completed · 10 days ago") and, once the Application is Done, its "Done · Rejected". On the right,
 * Edit details turns the category, the title and the date into fields in place (EditableHeading) and ⋯ holds
 * Delete Interview, which asks first and goes back to the Application page. On a phone, Edit details
 * folds into ⋯. Enter, Save, or leaving the fields saves what changed, checked first with the API's
 * rules: the title and date can't be cleared and no time is assumed (docs/adr/0005). The title follows
 * a new category while it is still the old category's name. A problem shows beside
 * its field and sends nothing. Escape and Cancel put back what was saved. Leaving the page with a
 * change not yet saved asks first (UnsavedChanges).
 */
export function InterviewHeading({ app, interview }: { app: Application; interview: Interview }) {
  const id = useId();
  const saved: Saved = { category: interview.category, title: interview.title, at: interview.at };
  const [shown, setShown] = useState(saved);
  const [seen, setSeen] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => valuesOf(saved));
  const [errors, setErrors] = useState<FieldErrors>({});
  const tracker = useSaveStatus();
  const categoryRef = useRef<HTMLSelectElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState<Interview | null>(null);
  // Only read while the menu is open and when editing ends, so the server's guess never shows.
  const wide = useMediaQuery("(min-width: 640px)");
  const dateId = `${id}-at`;

  // Taken in when it changes elsewhere, set during render the way React advises for state that follows a prop.
  if (saved.category !== seen.category || saved.title !== seen.title || saved.at !== seen.at) {
    setSeen(saved);
    setShown(saved);
  }

  const changed = editing && Object.keys(changesOf(values, shown)).length > 0;
  const focusDate = () => document.getElementById(dateId)?.focus();
  const focusProblem = (problems: FieldErrors) => {
    if (problems.category) categoryRef.current?.focus();
    else if (problems.title) titleRef.current?.focus();
    else if (problems.at) focusDate();
    else categoryRef.current?.focus();
  };
  useUnsavedChanges(changed, () => focusProblem(errors));

  function startEditing() {
    setValues(valuesOf(shown));
    setErrors({});
    setEditing(true);
  }

  function stopEditing() {
    setEditing(false);
    setErrors({});
  }

  async function save() {
    if (tracker.saving) return;
    const changes = changesOf(values, shown);
    if (Object.keys(changes).length === 0) {
      stopEditing();
      return;
    }
    const problems = interviewErrors(changes);
    setErrors(problems);
    if (!isValid(problems)) {
      focusProblem(problems);
      return;
    }
    const result = await tracker.run(async () => {
      const outcome = await updateInterviewAction(app.id, interview.id, changes);
      if (!outcome.ok && outcome.fieldErrors) setErrors(outcome.fieldErrors);
      return outcome;
    });
    if (result.ok) {
      setShown((prev) => ({
        category: changes.category ?? prev.category,
        title: changes.title ?? prev.title,
        at: changes.at ?? prev.at,
      }));
      stopEditing();
    }
  }

  const title = shown.title;
  const display = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="m-0 break-words text-base leading-[1.6] text-body">
          {app.company} · {app.title}
        </p>
        <h1 className="m-0 mt-1 break-words text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-heading md:text-[44px]">
          {title}
        </h1>
        <p className="m-0 mt-2 text-base leading-[1.6] text-body md:text-lg">
          <InterviewWhenLong at={shown.at} />
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CategoryBadge category={shown.category} />
          <WhenBadge app={app} at={shown.at} completed={interview.completed} />
          <DoneBadge app={app} />
        </div>
        <SaveStatus status={tracker.status} label={STATUS_LABEL} onRetry={tracker.retry} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button ref={editRef} variant="secondary" className="hidden sm:inline-flex" onClick={startEditing}>
          <Pencil className="size-4" aria-hidden />
          Edit details
        </Button>
        <MoreMenu
          label={`More actions, ${title}`}
          triggerRef={moreRef}
          showEdit={!wide}
          onEdit={startEditing}
          onDelete={() => setDeleting(interview)}
        />
      </div>
      <DeleteInterviewDialog
        interview={deleting}
        onConfirm={(gone) => deleteInterviewAndLeaveAction(app.id, gone.id)}
        onClose={() => setDeleting(null)}
        // The action goes to the Application page once it has deleted, so nothing is left to do here.
        onDeleted={() => {}}
      />
    </div>
  );

  return (
    <EditableHeading
      title={title}
      display={display}
      editLabel="Edit details"
      statusLabel={STATUS_LABEL}
      editing={editing}
      onSave={() => void save()}
      onCancel={() => {
        setValues(valuesOf(shown));
        stopEditing();
      }}
      returnFocus={() => (wide ? editRef : moreRef).current?.focus()}
      tracker={tracker}
      errors={errors}
    >
      <Field label="Category" required id={`${id}-category`} error={errors.category}>
        <select
          ref={categoryRef}
          id={`${id}-category`}
          value={values.category}
          required
          // eslint-disable-next-line jsx-a11y/no-autofocus -- Pressing the edit button is the request to change these.
          autoFocus
          onChange={(e) => {
            const category = e.target.value as InterviewCategory;
            setValues((prev) => ({ ...prev, category, title: titleForCategory(prev.title, prev.category, category) }));
            setErrors((prev) => ({ ...prev, category: undefined }));
          }}
          className={inputClasses}
          {...invalidProps(`${id}-category-error`, errors.category)}
        >
          {INTERVIEW_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" required id={`${id}-title`} error={errors.title}>
        <input
          ref={titleRef}
          id={`${id}-title`}
          value={values.title}
          required
          maxLength={INTERVIEW_TITLE_MAX_LENGTH}
          autoComplete="off"
          onChange={(e) => {
            const title = e.target.value;
            setValues((prev) => ({ ...prev, title }));
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          className={inputClasses}
          {...invalidProps(`${id}-title-error`, errors.title)}
        />
      </Field>
      <div>
        <div className="mb-2 block text-sm font-medium text-heading">
          <span id={`${dateId}-label`}>Date and time</span>
          <RequiredMark />
        </div>
        <fieldset aria-labelledby={`${dateId}-label`} className="m-0 min-w-0 border-0 p-0">
          <DateTimePicker
            id={dateId}
            dateLabel="Date"
            timeLabel="Time"
            value={localOf(values)}
            disabled={tracker.saving}
            onInput={(next) => {
              setValues((prev) => ({ ...prev, ...next }));
              setErrors((prev) => ({ ...prev, at: shown.at || next.date ? undefined : prev.at }));
            }}
            invalid={errors.at ? { date: true, time: true } : undefined}
            aria-describedby={`${dateId}-error`}
          />
        </fieldset>
        <FieldError id={`${dateId}-error`} error={errors.at} />
      </div>
    </EditableHeading>
  );
}

/** Where the Interview stands, as a pill: "Upcoming · in 2 days" (blue), or "Completed · 10 days ago" (green, grey once the Application is Done). */
function WhenBadge({ app, at, completed }: { app: Application; at: string; completed: boolean }) {
  // The viewer's time zone counts the days, which the server doesn't know: the pill says just "Upcoming" until then.
  const today = useToday();
  const tone = completed
    ? app.status === "done"
      ? { pill: "border-tone-gray-line bg-tone-gray text-tone-gray-fg", dot: "bg-tone-gray-fg" }
      : { pill: "border-line-success-subtle bg-success-soft text-fg-success-strong", dot: "bg-fg-success-strong" }
    : { pill: "border-tone-blue-line bg-tone-blue text-tone-blue-fg", dot: "bg-tone-blue-fg" };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${tone.pill}`}>
      <span aria-hidden className={`size-2 rounded-full ${tone.dot}`} />
      {completed ? "Completed" : "Upcoming"}
      {today && ` · ${relativeDays(calendarDaysBetween(today, parseDay(at)))}`}
    </span>
  );
}

/** "Done · Rejected" once the Application is Done; nothing while it is In Progress. */
function DoneBadge({ app }: { app: Application }) {
  if (!app.outcome) return null;
  return (
    <Badge tone={OUTCOME_TONE[app.outcome]} pill>
      {`${STATUS_OPTIONS[app.status].label} · ${OUTCOME_OPTIONS[app.outcome].label}`}
    </Badge>
  );
}

/** ⋯: Delete Interview, and on a phone Edit details above it. */
function MoreMenu({
  label,
  triggerRef,
  showEdit,
  onEdit,
  onDelete,
}: {
  label: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  showEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // The menu opens inside the page's main landmark, not at the end of <body>.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <div ref={setContainer} className="relative">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button ref={triggerRef} variant="secondary" className="px-3" aria-label={label}>
            <Ellipsis className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" container={container}>
          {showEdit && (
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil aria-hidden />
              Edit details
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              // The dialog returns focus to what had it when it opened: ⋯, not this item, which goes.
              triggerRef.current?.focus();
              onDelete();
            }}
          >
            <Trash2 aria-hidden />
            Delete Interview
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
