"use client";

import { Ellipsis, Pencil, Trash2, UserPlus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { SaveStatus } from "@/components/ui/save-status";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSaveStatus } from "@/hooks/use-save-status";
import { useToday } from "@/hooks/use-today";
import { DeleteInterviewDialog } from "@/features/applications/application-dialogs";
import { CategoryBadge } from "@/features/applications/category-badge";
import { InterviewWhenLong } from "@/features/applications/application-when";
import { EditableHeading } from "@/features/applications/editable-heading";
import { fromLocalInput, toLocalInput } from "@/features/applications/local-datetime";
import {
  ParticipantsField,
  blankDraft,
  draftsOf,
  participantInputs,
  participantsProblem,
  type ParticipantDraft,
  type ParticipantsProblem,
} from "@/features/applications/participants-field";
import { ABANDONED_PILL, OUTCOME_TONE, UNSCHEDULED_PILL } from "@/features/applications/status-tone";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import {
  applicationParticipants,
  calendarDaysBetween,
  categoryLabel,
  DATE_TBD,
  DIDNT_HAPPEN,
  INTERVIEW_CATEGORIES,
  INTERVIEW_TITLE_MAX_LENGTH,
  isAbandoned,
  isDone,
  OUTCOME_OPTIONS,
  parseDay,
  relativeDays,
  roundNumber,
  STATUS_OPTIONS,
  type Application,
  type Interview,
  titleForCategory,
  withParticipants,
  type InterviewCategory,
  type InterviewFields,
  type Participant,
  type ParticipantInput,
} from "@/lib/applications";
import { interviewErrors, isValid, participantsError, type FieldErrors } from "@/lib/validation";

type Saved = Pick<Interview, "category" | "title" | "at" | "participants">;
/**
 * `noDate` is the switch beside the date: Date TBD on an In Progress Application, Didn't happen on a
 * Done one. On, the date and time are cleared and the Interview is Unscheduled, or Abandoned.
 */
type Values = Pick<Interview, "category" | "title"> & DateAndTime & { noDate: boolean; participants: ParticipantDraft[] };

/** What the save status and Retry name: the fields Edit details changes. */
const STATUS_LABEL = "Details";

function valuesOf(saved: Saved): Values {
  return {
    category: saved.category,
    title: saved.title,
    ...splitDateTime(toLocalInput(saved.at)),
    noDate: saved.at === null,
    // An Interview from before Participants starts with a blank row to fill in.
    participants: saved.participants.length > 0 ? draftsOf(saved.participants) : [blankDraft()],
  };
}

/** Saved Participants as the API takes them, to compare with what the field would send. */
function inputsOf(participants: Participant[]): ParticipantInput[] {
  return participants.map(({ id, role, name }) => ({ id, role, name }));
}

/** Whether two lists of Participants say the same thing, in the same order. */
function sameParticipants(a: Participant[], b: Participant[]) {
  return JSON.stringify(inputsOf(a)) === JSON.stringify(inputsOf(b));
}

/** The date and time as a datetime-local value; "" without a date. */
function localOf(values: DateAndTime) {
  return values.date ? `${values.date}T${values.time}` : "";
}

/**
 * What differs from what's saved. A date without a time is no date: no time is assumed. Turning
 * Date TBD (or Didn't happen) on clears the date (`noDate`); turning it off sends the date given, or
 * no date for validation to ask for (docs/adr/0009).
 */
function changesOf(values: Values, saved: Saved): Partial<InterviewFields> {
  const changes: Partial<InterviewFields> = {};
  const wasNoDate = saved.at === null;
  if (values.category !== saved.category) changes.category = values.category;
  if (values.title.trim() !== saved.title) changes.title = values.title.trim();
  if (values.noDate) {
    if (!wasNoDate) Object.assign(changes, { at: null, noDate: true });
  } else if (wasNoDate || localOf(values) !== toLocalInput(saved.at)) {
    changes.at = values.date && values.time ? fromLocalInput(localOf(values)) : null;
  }
  const { inputs } = participantInputs(values.participants);
  if (JSON.stringify(inputs) !== JSON.stringify(inputsOf(saved.participants))) changes.participants = inputs;
  return changes;
}

/**
 * The Interview page's heading (BIG-178, restyled in BIG-202): the company (in the brand colour) and
 * role, then its Round number ("Round 3", BIG-190) beside its Interview category, the Interview title,
 * and a line with its day and time ("Fri, Nov 13, 2026 · 11:00 AM") and badges for where it stands
 * ("Upcoming · in 2 days", "Completed · 10 days ago") and, once the Application is Done, its
 * "Done · Rejected". Under the title, who the job seeker is meeting ("With Dana Lee (Recruiter), Sam (EM)", BIG-191),
 * or, for an Interview from before Participants, "Add who you’re meeting", which opens Edit details.
 * On the right, level with that line,
 * Edit details turns the category, the title, the date and the Participants into fields in place
 * (EditableHeading); saving needs at least one Participant. ⋯ holds
 * Delete Interview, which asks first and goes back to the Application page. On a phone, Edit details
 * folds into ⋯. Enter, Save, or leaving the fields saves what changed, checked first with the API's
 * rules: the title can't be cleared and no time is assumed. On an In Progress Application, a Date TBD
 * switch beside the date and time makes the Interview Unscheduled ("Date TBD", docs/adr/0009), as for
 * one postponed with no new date: turning it on clears and disables them, and turning it off asks for
 * both. An Unscheduled Interview's line reads "Date TBD" and "Upcoming · date TBD". On a Done
 * Application the switch is Didn't happen (BIG-222): on, the Interview is Abandoned ("Didn't
 * happen"); off, it needs a date in the past, which makes it Completed. `editOnOpen`
 * opens Edit details at once, as the Application page's Add the date asks. The title follows
 * a new category while it is still the old category's name. A problem shows beside
 * its field and sends nothing. Escape and Cancel put back what was saved. Leaving the page with a
 * change not yet saved asks first (UnsavedChanges).
 */
export function InterviewHeading({
  app,
  interview,
  editOnOpen = false,
}: {
  app: Application;
  interview: Interview;
  editOnOpen?: boolean;
}) {
  const id = useId();
  const saved: Saved = {
    category: interview.category,
    title: interview.title,
    at: interview.at,
    participants: interview.participants,
  };
  const [shown, setShown] = useState(saved);
  const [seen, setSeen] = useState(saved);
  // Add the date on the Application page opens this page with Edit details already open.
  const [editing, setEditing] = useState(editOnOpen);
  const [values, setValues] = useState(() => valuesOf(saved));
  const [errors, setErrors] = useState<FieldErrors>({});
  // The Participants row a problem is about, to mark it.
  const [participantsKey, setParticipantsKey] = useState<string | undefined>();
  const tracker = useSaveStatus();
  const categoryRef = useRef<HTMLSelectElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState<Interview | null>(null);
  // Only read while the menu is open and when editing ends, so the server's guess never shows.
  const wide = useMediaQuery("(min-width: 640px)");
  const dateId = `${id}-at`;
  // Date TBD is for an Interview still ahead; a Done Application's Interview either happened, with a
  // date in the past, or didn't (BIG-222).
  const noDateChoice = isDone(app) ? DIDNT_HAPPEN : DATE_TBD;

  // Taken in when it changes elsewhere, set during render the way React advises for state that follows a prop.
  if (
    saved.category !== seen.category ||
    saved.title !== seen.title ||
    saved.at !== seen.at ||
    !sameParticipants(saved.participants, seen.participants)
  ) {
    setSeen(saved);
    setShown(saved);
  }

  const changed = editing && Object.keys(changesOf(values, shown)).length > 0;
  const focusDate = () => document.getElementById(dateId)?.focus();
  const participantsId = `${id}-participants`;
  const focusParticipants = (key?: string) =>
    (
      document.getElementById(`${participantsId}-${key ?? values.participants[0]?.key}-role`) ??
      document.getElementById(`${participantsId}-add`)
    )?.focus();
  const focusProblem = (problems: FieldErrors, key?: string) => {
    if (problems.category) categoryRef.current?.focus();
    else if (problems.title) titleRef.current?.focus();
    else if (problems.at) focusDate();
    else if (problems.participants) focusParticipants(key);
    else categoryRef.current?.focus();
  };
  useUnsavedChanges(changed, () => focusProblem(errors, participantsKey));

  /** Opens Edit details; `toParticipants` puts focus in the Participants instead of the category. */
  function startEditing(toParticipants = false) {
    const next = valuesOf(shown);
    setValues(next);
    setErrors({});
    setParticipantsKey(undefined);
    setEditing(true);
    if (toParticipants) {
      requestAnimationFrame(() => document.getElementById(`${participantsId}-${next.participants[0].key}-role`)?.focus());
    }
  }

  function stopEditing() {
    setEditing(false);
    setErrors({});
    setParticipantsKey(undefined);
  }

  async function save() {
    if (tracker.saving) return;
    const changes = changesOf(values, shown);
    // Edit details needs someone, even when only the title changes on an Interview from before Participants.
    const { inputs, keys } = participantInputs(values.participants);
    const people = participantsProblem(participantsError(inputs), keys);
    if (Object.keys(changes).length === 0 && !people) {
      stopEditing();
      return;
    }
    const problems = interviewErrors(changes, { noDateChoice, latest: isDone(app) ? new Date() : undefined });
    if (people) problems.participants = people.message;
    setErrors(problems);
    setParticipantsKey(people?.key);
    if (!isValid(problems)) {
      focusProblem(problems, people?.key);
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
        at: "at" in changes ? (changes.at ?? null) : prev.at,
        // Until the page reloads with their ids, someone new is shown by what was typed.
        participants: changes.participants
          ? changes.participants.map((p, i) => ({ id: p.id ?? `new-${i}`, role: p.role, name: p.name }))
          : prev.participants,
      }));
      stopEditing();
    }
  }

  const title = shown.title;
  const round = roundNumber(app, interview);
  const display = (
    <div className="flex items-start justify-between gap-3 sm:items-end">
      <div className="min-w-0">
        <p className="m-0 break-words text-base leading-[1.6] text-body">
          <span className="font-medium text-fg-brand">{app.company}</span> · {app.title}
        </p>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xl font-bold leading-[1.3] text-fg-brand md:text-2xl">Round {round}</span>
          <CategoryBadge category={shown.category} />
        </p>
        <h1 className="m-0 mt-1 break-words text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-heading md:text-[52px]">
          {/* The Round line above is in the heading's name too, as screen readers announce only the h1. */}
          <span className="sr-only">{`Round ${round} · `}</span>
          {title}
        </h1>
        <Participants participants={shown.participants} onAdd={() => startEditing(true)} />
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <WhenLine app={app} at={shown.at} />
          <WhenBadge app={app} at={shown.at} completed={interview.completed} />
          <DoneBadge app={app} />
        </div>
        <SaveStatus status={tracker.status} label={STATUS_LABEL} onRetry={tracker.retry} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button ref={editRef} variant="tertiary" className="hidden sm:inline-flex" onClick={() => startEditing()}>
          <Pencil className="size-4" aria-hidden />
          Edit details
        </Button>
        <MoreMenu
          label={`More actions, ${title}`}
          triggerRef={moreRef}
          showEdit={!wide}
          onEdit={() => startEditing()}
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
      <DateField
        id={dateId}
        values={values}
        error={errors.at}
        saving={tracker.saving}
        noDateChoice={noDateChoice}
        onInput={(next) => {
          setValues((prev) => ({ ...prev, ...next }));
          setErrors((prev) => ({ ...prev, at: shown.at || next.date ? undefined : prev.at }));
        }}
        onNoDate={(noDate) => {
          setValues((prev) => ({ ...prev, noDate, date: "", time: "" }));
          setErrors((prev) => ({ ...prev, at: undefined }));
        }}
      />
      <ParticipantsField
        id={participantsId}
        value={values.participants}
        disabled={tracker.saving}
        onChange={(participants) => {
          setValues((prev) => ({ ...prev, participants }));
          setErrors((prev) => ({ ...prev, participants: undefined }));
          setParticipantsKey(undefined);
        }}
        known={applicationParticipants(app)}
        problem={errors.participants ? ({ message: errors.participants, key: participantsKey } satisfies ParticipantsProblem) : undefined}
      />
    </EditableHeading>
  );
}

/**
 * The day and time with the year, "Fri, Nov 13, 2026 · 11:00 AM"; "Date TBD" for an Unscheduled
 * Interview; "No date" for an Abandoned one, whose badge says it didn't happen.
 */
function WhenLine({ app, at }: { app: Application; at: string | null }) {
  const withoutDate = isAbandoned(app, { at }) ? "No date" : DATE_TBD;
  return <p className="m-0 text-base leading-[1.6] text-body md:text-lg">{at === null ? withoutDate : <InterviewWhenLong at={at} />}</p>;
}

/**
 * Edit details' date and time, and beside them the switch that leaves the date out: Date TBD on an
 * In Progress Application (BIG-221), Didn't happen on a Done one (BIG-222). On, it clears and
 * disables them, as the date picker mounts again empty.
 */
function DateField({
  id,
  values,
  error,
  saving,
  noDateChoice,
  onInput,
  onNoDate,
}: {
  id: string;
  values: Values;
  error: string | undefined;
  saving: boolean;
  noDateChoice: typeof DATE_TBD | typeof DIDNT_HAPPEN;
  onInput: (next: DateAndTime) => void;
  onNoDate: (noDate: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-2 block text-sm font-medium text-heading">
        <span id={`${id}-label`}>Date and time</span>
        <RequiredMark />
      </div>
      <fieldset aria-labelledby={`${id}-label`} className="m-0 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-0 p-0">
        <div className="min-w-0 flex-[1_1_20rem]">
          <DateTimePicker
            key={values.noDate ? "no-date" : "dated"}
            id={id}
            dateLabel="Date"
            timeLabel="Time"
            value={localOf(values)}
            disabled={saving || values.noDate}
            onInput={onInput}
            invalid={error ? { date: true, time: true } : undefined}
            aria-describedby={`${id}-error`}
          />
        </div>
        <label htmlFor={`${id}-no-date`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-heading">
          <Switch
            id={`${id}-no-date`}
            checked={values.noDate}
            disabled={saving}
            aria-describedby={error ? `${id}-error` : undefined}
            onCheckedChange={onNoDate}
          />
          {noDateChoice}
        </label>
      </fieldset>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** "With Dana Lee (Recruiter), Sam (EM)", or, when nobody is recorded yet, "Add who you’re meeting". */
function Participants({ participants, onAdd }: { participants: Participant[]; onAdd: () => void }) {
  const line = withParticipants(participants);
  if (line) return <p className="m-0 mt-2 break-words text-base leading-[1.6] text-body md:text-lg">{line}</p>;
  return (
    <Button variant="tertiary" size="sm" className="mt-2 -ml-3" onClick={onAdd}>
      <UserPlus className="size-4" aria-hidden />
      Add who you’re meeting
    </Button>
  );
}

/**
 * Where the Interview stands, as a pill: "Upcoming · in 2 days" (blue), "Completed · 10 days ago"
 * (green, grey once the Application is Done), "Upcoming · date TBD" (neutral) for an Unscheduled one,
 * or "Didn't happen" (grey) for an Abandoned one (BIG-222).
 */
function WhenBadge({ app, at, completed }: { app: Application; at: string | null; completed: boolean }) {
  // The viewer's time zone counts the days, which the server doesn't know: the pill says just "Upcoming" until then.
  const today = useToday();
  if (isAbandoned(app, { at })) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${ABANDONED_PILL.pill}`}>
        <span aria-hidden className={`size-2 rounded-full ${ABANDONED_PILL.dot}`} />
        {DIDNT_HAPPEN}
      </span>
    );
  }
  if (at === null) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${UNSCHEDULED_PILL.pill}`}>
        <span aria-hidden className={`size-2 rounded-full ${UNSCHEDULED_PILL.dot}`} />
        Upcoming · date TBD
      </span>
    );
  }
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
