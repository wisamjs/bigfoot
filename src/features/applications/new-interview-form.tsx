"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { createInterviewAction, type ActionResult } from "@/app/applications/actions";
import { buttonClasses } from "@/components/ui/button-classes";
import { DateTimePicker, type DateAndTime } from "@/components/ui/date-time-picker";
import { Field, RequiredMark, RequiredNote, fieldLabelClasses } from "@/components/ui/field";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { useSaveStatus } from "@/hooks/use-save-status";
import { AddFormActions } from "@/features/applications/add-form-actions";
import { FormAlert } from "@/features/applications/details-fields";
import { fromLocalInput } from "@/features/applications/local-datetime";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { ADD_APPLICATION_HREF } from "@/features/applications/routes";
import {
  INTERVIEW_KINDS,
  INTERVIEW_NOTES_MAX_LENGTH,
  INTERVIEW_OPTIONS,
  type Application,
  type InterviewKind,
} from "@/lib/applications";
import { interviewErrors, isValid, summarize, type FieldErrors } from "@/lib/validation";

/** Each field's control id, after the form's own id, in the order focus looks for an error. */
const CONTROLS = { application: "application", kind: "kind", date: "at", time: "at-time", notes: "notes" } as const;
type Control = keyof typeof CONTROLS;

/**
 * An Interview that doesn't exist yet, on the Add Interview page: the Application it belongs to,
 * its kind, its date and time (both required, no time assumed), and Interview notes. Adding it
 * goes back to the dashboard. With no Applications, it explains that an Interview needs one.
 */
export function NewInterviewForm({
  applications,
  applicationId: chosen = "",
}: {
  applications: Application[];
  /** The Application already chosen, as when the panel's Add Interview opens this page. */
  applicationId?: string;
}) {
  const id = useId();
  const router = useRouter();
  const tracker = useSaveStatus();
  const [applicationId, setApplicationId] = useState(chosen);
  const [kind, setKind] = useState<InterviewKind>("informal_chat");
  const [at, setAt] = useState<DateAndTime>({ date: "", time: "" });
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Control>>({});
  // What's wrong before anything is sent; errors from the save itself show in SaveStatus.
  const [invalid, setInvalid] = useState<string | null>(null);

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="m-0 text-sm text-body">
          An Interview belongs to an Application. Add the Application for the role you’re interviewing for first.
        </p>
        <Link href={ADD_APPLICATION_HREF} className={buttonClasses("brand", "sm")}>
          Add Application
        </Link>
      </div>
    );
  }

  const byCompany = applications.toSorted((a, b) => a.company.localeCompare(b.company, "en-CA"));
  const inProgress = byCompany.filter((app) => app.status === "in_progress");
  const done = byCompany.filter((app) => app.status !== "in_progress");

  function clear(...names: Control[]) {
    setFieldErrors((prev) => ({ ...prev, ...Object.fromEntries(names.map((name) => [name, undefined])) }));
  }

  /** What's missing or wrong, each keyed by the control it belongs beside. */
  function check(fields: { kind: InterviewKind; at: string | null; notes: string | null }): FieldErrors<Control> {
    const errors: FieldErrors<Control> = {};
    if (!applicationId) errors.application = "Choose the Application this Interview belongs to.";
    const api = interviewErrors(fields);
    if (api.kind) errors.kind = api.kind;
    if (!at.date) errors.date = "Pick the date and enter the time.";
    else if (!at.time) errors.time = "Enter the time.";
    else if (api.at) errors.date = api.at;
    if (api.notes) errors.notes = api.notes;
    return errors;
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The submit button is only aria-disabled while saving, so it keeps focus; refuse a second submit here.
    if (tracker.saving) return;
    const fields = {
      kind,
      at: at.date && at.time ? fromLocalInput(`${at.date}T${at.time}`) : null,
      notes: notes.trim() || null,
    };
    const errors = check(fields);
    setFieldErrors(errors);
    if (!isValid(errors)) {
      // Each error beside its field, the first announced, and focus on that field.
      setInvalid(summarize(errors));
      const first = (Object.keys(CONTROLS) as Control[]).find((name) => errors[name]);
      if (first) document.getElementById(`${id}-${CONTROLS[first]}`)?.focus();
      return;
    }
    setInvalid(null);
    void tracker
      .run(() => createInterviewAction(applicationId, fields))
      .then((result: ActionResult) => {
        if (!result.ok) {
          const { at: atError, ...rest } = result.fieldErrors ?? {};
          setFieldErrors({ ...rest, ...(atError ? { date: atError } : {}) });
        } else router.push("/dashboard");
      });
  }

  /** One Application as a choice: its company, and its role to tell two at one company apart. */
  const option = (app: Application) => (
    <option key={app.id} value={app.id}>
      {app.company} · {app.title}
    </option>
  );

  const atError = fieldErrors.date ?? fieldErrors.time;

  return (
    // noValidate: every problem shows at once, beside its field, in Bigfoot's words.
    <form onSubmit={submit} noValidate aria-label="New Interview" className="flex flex-col gap-4">
      <RequiredNote />
      <Field id={`${id}-application`} label="Application" required error={fieldErrors.application}>
        <select
          id={`${id}-application`}
          value={applicationId}
          required
          onChange={(e) => {
            setApplicationId(e.target.value);
            clear("application");
          }}
          className={inputClasses}
          {...invalidProps(`${id}-application-error`, fieldErrors.application)}
        >
          <option value="" disabled>
            Choose an Application
          </option>
          {done.length > 0 ? (
            <>
              <optgroup label="In Progress">{inProgress.map(option)}</optgroup>
              <optgroup label="Done">{done.map(option)}</optgroup>
            </>
          ) : (
            inProgress.map(option)
          )}
        </select>
      </Field>
      <Field id={`${id}-kind`} label="Kind" required error={fieldErrors.kind}>
        <select
          id={`${id}-kind`}
          value={kind}
          required
          onChange={(e) => {
            setKind(e.target.value as InterviewKind);
            clear("kind");
          }}
          className={inputClasses}
          {...invalidProps(`${id}-kind-error`, fieldErrors.kind)}
        >
          {INTERVIEW_KINDS.map((value) => (
            <option key={value} value={value}>
              {INTERVIEW_OPTIONS[value].label}
            </option>
          ))}
        </select>
      </Field>
      {/* Two controls under one label, so a fieldset; each names itself "Date" and "Time". */}
      <fieldset aria-labelledby={`${id}-at-label`} className="m-0 min-w-0 border-0 p-0">
        <div className={fieldLabelClasses}>
          <span id={`${id}-at-label`}>Date and time</span>
          <RequiredMark />
        </div>
        <DateTimePicker
          id={`${id}-at`}
          dateLabel="Date"
          timeLabel="Time"
          value=""
          onChange={(next) => {
            setAt(next);
            clear("date", "time");
          }}
          invalid={{ date: Boolean(fieldErrors.date), time: Boolean(fieldErrors.time) }}
          aria-describedby={`${id}-at-error`}
        />
        <FieldError id={`${id}-at-error`} error={atError} />
      </fieldset>
      <Field id={`${id}-notes`} label="Interview notes" error={fieldErrors.notes}>
        <textarea
          id={`${id}-notes`}
          value={notes}
          rows={3}
          maxLength={INTERVIEW_NOTES_MAX_LENGTH}
          placeholder={PLACEHOLDERS.notes}
          onChange={(e) => {
            setNotes(e.target.value);
            clear("notes");
          }}
          {...invalidProps(`${id}-notes-error`, fieldErrors.notes)}
          className={`${inputClasses} field-sizing-content max-h-96 min-h-20 resize-y`}
        />
      </Field>
      <FormAlert message={invalid} />
      <AddFormActions tracker={tracker} label="New Interview" submitText="Add Interview" />
    </form>
  );
}
