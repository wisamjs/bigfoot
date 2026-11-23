"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { updateInterviewAction } from "@/app/applications/actions";
import { DateTimePicker, splitDateTime, type DateAndTime } from "@/components/ui/date-time-picker";
import { Field, RequiredMark } from "@/components/ui/field";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { useSaveStatus } from "@/hooks/use-save-status";
import { InterviewWhenLong } from "@/features/applications/application-when";
import { EditableHeading } from "@/features/applications/editable-heading";
import { fromLocalInput, toLocalInput } from "@/features/applications/local-datetime";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import {
  INTERVIEW_KINDS,
  INTERVIEW_OPTIONS,
  type Application,
  type Interview,
  type InterviewFields,
  type InterviewKind,
} from "@/lib/applications";
import { DATE_NEEDED, interviewErrors, isValid, type FieldErrors } from "@/lib/validation";

type Saved = Pick<Interview, "kind" | "at">;
type Values = { kind: InterviewKind } & DateAndTime;

function valuesOf(saved: Saved): Values {
  return { kind: saved.kind, ...splitDateTime(toLocalInput(saved.at)) };
}

/** The date and time as a datetime-local value; "" without a date. */
function localOf(values: DateAndTime) {
  return values.date ? `${values.date}T${values.time}` : "";
}

/** What differs from what's saved. A date without a time is no date: no time is assumed. */
function changesOf(values: Values, saved: Saved): Partial<InterviewFields> {
  const changes: Partial<InterviewFields> = {};
  if (values.kind !== saved.kind) changes.kind = values.kind;
  if (localOf(values) !== toLocalInput(saved.at)) {
    changes.at = values.date && values.time ? fromLocalInput(localOf(values)) : null;
  }
  return changes;
}

/**
 * The Interview page's heading: the company, then the role, the Interview kind and its date and
 * time ("Date needed" without one), with `badge` beside them, and an edit button that turns the
 * kind and the date into fields in place (EditableHeading). Enter, Save, or leaving them saves
 * what changed, checked first with the API's rules: the date can't be cleared, no time is assumed,
 * and an Interview with no date saves nothing until it has one (docs/adr/0005). A problem shows
 * beside its field and sends nothing. Escape and Cancel put back what was saved. Leaving the page
 * with a change not yet saved asks first (UnsavedChanges).
 */
export function InterviewHeading({ app, interview, badge }: { app: Application; interview: Interview; badge?: ReactNode }) {
  const id = useId();
  const saved: Saved = { kind: interview.kind, at: interview.at };
  const [shown, setShown] = useState(saved);
  const [seen, setSeen] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => valuesOf(saved));
  const [errors, setErrors] = useState<FieldErrors>({});
  const tracker = useSaveStatus();
  const kindRef = useRef<HTMLSelectElement>(null);
  const dateId = `${id}-at`;

  // Taken in when it changes elsewhere, set during render the way React advises for state that follows a prop.
  if (saved.kind !== seen.kind || saved.at !== seen.at) {
    setSeen(saved);
    setShown(saved);
  }

  const changed = editing && Object.keys(changesOf(values, shown)).length > 0;
  const focusDate = () => document.getElementById(dateId)?.focus();
  useUnsavedChanges(changed, () => (errors.at && !errors.kind ? focusDate() : kindRef.current?.focus()));

  function startEditing() {
    setValues(valuesOf(shown));
    setErrors(shown.at ? {} : { at: DATE_NEEDED });
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
    const problems = interviewErrors(changes, { savedAt: shown.at });
    setErrors(problems);
    if (!isValid(problems)) {
      if (problems.kind) kindRef.current?.focus();
      else focusDate();
      return;
    }
    const result = await tracker.run(async () => {
      const outcome = await updateInterviewAction(app.id, interview.id, changes);
      if (!outcome.ok && outcome.fieldErrors) setErrors(outcome.fieldErrors);
      return outcome;
    });
    if (result.ok) {
      setShown((prev) => ({ kind: changes.kind ?? prev.kind, at: "at" in changes ? (changes.at ?? null) : prev.at }));
      stopEditing();
    }
  }

  return (
    <EditableHeading
      title={app.company}
      details={
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="m-0 break-words text-base leading-[1.7] text-body">
            {`${app.title} · ${INTERVIEW_OPTIONS[shown.kind].label} Interview · `}
            <InterviewWhenLong at={shown.at} />
          </p>
          {badge}
        </div>
      }
      editLabel="Edit kind and date"
      statusLabel="Kind and date"
      editing={editing}
      onEdit={startEditing}
      onSave={() => void save()}
      onCancel={() => {
        setValues(valuesOf(shown));
        stopEditing();
      }}
      tracker={tracker}
      errors={errors}
    >
      <Field label="Kind" required id={`${id}-kind`} error={errors.kind}>
        <select
          ref={kindRef}
          id={`${id}-kind`}
          value={values.kind}
          required
          // eslint-disable-next-line jsx-a11y/no-autofocus -- Pressing the edit button is the request to change these.
          autoFocus
          onChange={(e) => {
            setValues((prev) => ({ ...prev, kind: e.target.value as InterviewKind }));
            setErrors((prev) => ({ ...prev, kind: undefined }));
          }}
          className={inputClasses}
          {...invalidProps(`${id}-kind-error`, errors.kind)}
        >
          {INTERVIEW_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {INTERVIEW_OPTIONS[kind].label}
            </option>
          ))}
        </select>
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
