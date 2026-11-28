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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useSaveStatus } from "@/hooks/use-save-status";
import { AddFormActions } from "@/features/applications/add-form-actions";
import { FormAlert } from "@/features/applications/details-fields";
import { fromLocalInput } from "@/features/applications/local-datetime";
import {
  ParticipantsField,
  participantInputs,
  participantsProblem,
  type ParticipantDraft,
} from "@/features/applications/participants-field";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { ADD_APPLICATION_HREF, applicationHref } from "@/features/applications/routes";
import { UnsavedChanges, useUnsavedChanges } from "@/features/applications/unsaved-changes";
import {
  applicationParticipants,
  categoryLabel,
  DATE_TBD,
  INTERVIEW_CATEGORIES,
  INTERVIEW_TITLE_MAX_LENGTH,
  titleForCategory,
  type Application,
  type InterviewCategory,
  type ParticipantInput,
} from "@/lib/applications";
import { interviewErrors, isValid, participantsError, summarize, type FieldErrors } from "@/lib/validation";

/** Each field's control id, after the form's own id, in the order focus looks for an error. */
const CONTROLS = {
  application: "application",
  category: "category",
  title: "title",
  date: "at",
  time: "at-time",
  unscheduled: "unscheduled",
  participants: "participants",
  how_it_went: "how-it-went",
} as const;
type Control = keyof typeof CONTROLS;

/** Where the category starts: the first conversation in most hiring processes. */
const FIRST_CATEGORY: InterviewCategory = "recruiter";

/**
 * An Interview that doesn't exist yet, on the Add Interview page: the Application it belongs to,
 * its Interview category, its title (filled in from the category until the job seeker edits it),
 * its date and time (both required, no time assumed) or Date TBD (Unscheduled, docs/adr/0009: ticking
 * it clears and disables them; it isn't offered for a Done Application), who the job seeker is meeting (at least one
 * Participant, picked from the Application's or added), and How it went (Interview notes;
 * the other two fields are written on its Interview page). Adding it
 * goes back to the Application page it was opened from, or to the dashboard. With no Applications,
 * it explains that an Interview needs one.
 */
export function NewInterviewForm(props: {
  applications: Application[];
  /** The Application already chosen, as when an Application page's Add Interview opens this page. */
  applicationId?: string;
}) {
  return (
    <UnsavedChanges>
      <NewInterviewFields {...props} />
    </UnsavedChanges>
  );
}

function NewInterviewFields({
  applications,
  applicationId: chosen = "",
}: {
  applications: Application[];
  applicationId?: string;
}) {
  const id = useId();
  const router = useRouter();
  const tracker = useSaveStatus();
  const [applicationId, setApplicationId] = useState(chosen);
  const [category, setCategory] = useState<InterviewCategory>(FIRST_CATEGORY);
  const [title, setTitle] = useState(() => categoryLabel(FIRST_CATEGORY));
  const [at, setAt] = useState<DateAndTime>({ date: "", time: "" });
  const [dateTbd, setDateTbd] = useState(false);
  const [howItWent, setHowItWent] = useState("");
  // One blank row to start, keyed the same on the server and in the browser.
  const [participants, setParticipants] = useState<ParticipantDraft[]>([{ key: "first", role: "", name: "" }]);
  // The row a Participants problem is about, to mark it.
  const [participantsKey, setParticipantsKey] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Control>>({});
  // What's wrong before anything is sent; errors from the save itself show in SaveStatus.
  const [invalid, setInvalid] = useState<string | null>(null);
  // Once it's added, the page is on its way back to the dashboard: nothing is lost by leaving.
  const [added, setAdded] = useState(false);
  // The first control changed from where the form started; the Application chosen for it doesn't count.
  const changed = (
    [
      ["application", applicationId !== chosen],
      ["category", category !== FIRST_CATEGORY],
      ["title", title !== categoryLabel(category)],
      ["date", at.date !== ""],
      ["time", at.time !== ""],
      ["unscheduled", dateTbd],
      ["participants", participantInputs(participants).inputs.length > 0 || participants.length !== 1],
      ["how_it_went", howItWent !== ""],
    ] as const
  ).find(([, differs]) => differs)?.[0];
  useUnsavedChanges(!added && changed !== undefined, () => {
    if (changed) focusControl(changed);
  });

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

  // Date TBD is for an Interview still ahead, so a Done Application's Interviews always have a date.
  const canBeUnscheduled = offersDateTbd(applications, applicationId);
  const unscheduled = dateTbd && canBeUnscheduled;
  const byCompany = applications.toSorted((a, b) => a.company.localeCompare(b.company, "en-CA"));
  const inProgress = byCompany.filter((app) => app.status === "in_progress");
  const done = byCompany.filter((app) => app.status !== "in_progress");

  /** Focus on a control; for Participants, the row with the problem, or else the first row or Add someone. */
  function focusControl(name: Control, rowKey?: string) {
    if (name === "participants") {
      const key = rowKey ?? participants[0]?.key;
      (document.getElementById(`${id}-participants-${key}-role`) ?? document.getElementById(`${id}-participants-add`))?.focus();
      return;
    }
    document.getElementById(`${id}-${CONTROLS[name]}`)?.focus();
  }

  function clear(...names: Control[]) {
    setFieldErrors((prev) => ({ ...prev, ...Object.fromEntries(names.map((name) => [name, undefined])) }));
  }

  /** What's missing or wrong, each keyed by the control it belongs beside. */
  function check(fields: {
    category: InterviewCategory;
    title: string;
    at: string | null;
    noDate?: boolean;
    how_it_went: string | null;
    participants: ParticipantInput[];
  }, keys: string[]): FieldErrors<Control> {
    const errors: FieldErrors<Control> = {};
    if (!applicationId) errors.application = "Choose the Application this Interview belongs to.";
    // A Done Application's new Interview took place already: a date in the past (BIG-222).
    const api = interviewErrors(fields, {
      creating: true,
      noDateChoice: canBeUnscheduled ? DATE_TBD : null,
      latest: canBeUnscheduled ? undefined : new Date(),
    });
    if (api.category) errors.category = api.category;
    if (api.title) errors.title = api.title;
    if (!unscheduled) Object.assign(errors, dateErrors(at, api.at));
    const people = participantsProblem(participantsError(fields.participants), keys);
    setParticipantsKey(people?.key);
    if (people) errors.participants = people.message;
    if (api.how_it_went) errors.how_it_went = api.how_it_went;
    return errors;
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The submit button is only aria-disabled while saving, so it keeps focus; refuse a second submit here.
    if (tracker.saving) return;
    const { inputs, keys } = participantInputs(participants);
    const fields = {
      category,
      title: title.trim(),
      ...whenOf(at, unscheduled),
      how_it_went: howItWent.trim() || null,
      participants: inputs,
    };
    const errors = check(fields, keys);
    setFieldErrors(errors);
    if (!isValid(errors)) {
      // Each error beside its field, the first announced, and focus on that field.
      setInvalid(summarize(errors));
      const first = (Object.keys(CONTROLS) as Control[]).find((name) => errors[name]);
      if (first) focusControl(first, participantsProblem(participantsError(inputs), keys)?.key);
      return;
    }
    setInvalid(null);
    void tracker
      .run(() => createInterviewAction(applicationId, fields))
      .then((result: ActionResult) => {
        if (!result.ok) {
          const { at: atError, ...rest } = result.fieldErrors ?? {};
          setFieldErrors({ ...rest, ...(atError ? { date: atError } : {}) });
        } else {
          setAdded(true);
          // Back where it was opened from: an Application page (the Application it was added to,
          // should another have been chosen), or the dashboard.
          router.push(chosen ? applicationHref(applicationId) : "/dashboard");
        }
      });
  }

  /** One Application as a choice: its company, and its role to tell two at one company apart. */
  const option = (app: Application) => (
    <option key={app.id} value={app.id}>
      {app.company} · {app.title}
    </option>
  );

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
            // People picked from the other Application aren't this one's: they stay, as someone new.
            setParticipants((prev) => prev.map(({ key, role, name }) => ({ key, role, name })));
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
      <Field id={`${id}-category`} label="Category" required error={fieldErrors.category}>
        <select
          id={`${id}-category`}
          value={category}
          required
          onChange={(e) => {
            const next = e.target.value as InterviewCategory;
            setCategory(next);
            setTitle((prev) => titleForCategory(prev, category, next));
            clear("category");
          }}
          className={inputClasses}
          {...invalidProps(`${id}-category-error`, fieldErrors.category)}
        >
          {INTERVIEW_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {categoryLabel(value)}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${id}-title`} label="Title" required error={fieldErrors.title}>
        <input
          id={`${id}-title`}
          value={title}
          required
          maxLength={INTERVIEW_TITLE_MAX_LENGTH}
          autoComplete="off"
          onChange={(e) => {
            setTitle(e.target.value);
            clear("title");
          }}
          className={inputClasses}
          {...invalidProps(`${id}-title-error`, fieldErrors.title)}
        />
      </Field>
      <DateOrTbdField
        id={id}
        unscheduled={unscheduled}
        canBeUnscheduled={canBeUnscheduled}
        errors={{ date: fieldErrors.date, time: fieldErrors.time }}
        onDate={(next) => {
          setAt(next);
          clear("date", "time");
        }}
        onUnscheduled={(checked) => {
          setDateTbd(checked);
          setAt({ date: "", time: "" });
          clear("date", "time");
        }}
      />
      <ParticipantsField
        id={`${id}-participants`}
        value={participants}
        onChange={(next) => {
          setParticipants(next);
          setParticipantsKey(undefined);
          clear("participants");
        }}
        known={applicationParticipants(applications.find((app) => app.id === applicationId) ?? { interviews: [] })}
        problem={fieldErrors.participants ? { message: fieldErrors.participants, key: participantsKey } : undefined}
      />
      <Field id={`${id}-how-it-went`} label="How it went" error={fieldErrors.how_it_went}>
        <RichTextEditor
          id={`${id}-how-it-went`}
          value={howItWent}
          onChange={(markdown) => {
            setHowItWent(markdown);
            clear("how_it_went");
          }}
          placeholder={PLACEHOLDERS.how_it_went}
          labelledBy={`${id}-how-it-went-label`}
          errorId={`${id}-how-it-went-error`}
          error={fieldErrors.how_it_went}
        />
      </Field>
      <FormAlert message={invalid} />
      <AddFormActions tracker={tracker} label="New Interview" submitText="Add Interview" />
    </form>
  );
}

/** Whether Date TBD is offered: not for a Done Application, whose Interviews always have a date. */
function offersDateTbd(applications: Application[], applicationId: string): boolean {
  return applications.find((app) => app.id === applicationId)?.status !== "done";
}

/** `at` and `noDate` as the form sends them: the date and time, or Date TBD's null (BIG-221). */
function whenOf(at: DateAndTime, unscheduled: boolean): { at: string | null; noDate?: true } {
  if (unscheduled) return { at: null, noDate: true };
  return { at: at.date && at.time ? fromLocalInput(`${at.date}T${at.time}`) : null };
}

/**
 * The date and time's problems, beside the part to fix: no date asks for a date and time or Date
 * TBD (`problem`, from interviewErrors); a date without a time asks for the time, as no time is
 * assumed. The time field stays disabled until there's a date.
 */
function dateErrors(at: DateAndTime, problem: string | undefined): FieldErrors<"date" | "time"> {
  if (!at.date) return { date: problem };
  if (!at.time) return { time: "Enter the time." };
  return problem ? { date: problem } : {};
}

/**
 * The date and time, two controls under one label, so a fieldset; each names itself "Date" and
 * "Time". Under them, Date TBD (BIG-221) unless the Application is Done: a native checkbox whose label
 * is its 44px touch target. Ticking it clears and disables the
 * date and time, as the picker mounts again empty.
 */
function DateOrTbdField({
  id,
  unscheduled,
  canBeUnscheduled,
  errors,
  onDate,
  onUnscheduled,
}: {
  id: string;
  unscheduled: boolean;
  canBeUnscheduled: boolean;
  errors: { date?: string; time?: string };
  onDate: (next: DateAndTime) => void;
  onUnscheduled: (checked: boolean) => void;
}) {
  const error = errors.date ?? errors.time;
  return (
    <fieldset aria-labelledby={`${id}-at-label`} className="m-0 min-w-0 border-0 p-0">
      <div className={fieldLabelClasses}>
        <span id={`${id}-at-label`}>Date and time</span>
        <RequiredMark />
      </div>
      <DateTimePicker
        key={unscheduled ? "tbd" : "dated"}
        id={`${id}-at`}
        dateLabel="Date"
        timeLabel="Time"
        value=""
        disabled={unscheduled}
        onChange={onDate}
        invalid={{ date: Boolean(errors.date), time: Boolean(errors.time) }}
        aria-describedby={`${id}-at-error`}
      />
      {canBeUnscheduled && (
        <label htmlFor={`${id}-unscheduled`} className="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-heading">
          <input
            type="checkbox"
            id={`${id}-unscheduled`}
            checked={unscheduled}
            aria-describedby={error ? `${id}-at-error` : undefined}
            onChange={(e) => onUnscheduled(e.target.checked)}
            className="size-[18px] cursor-pointer rounded-control accent-brand"
          />
          {DATE_TBD}
        </label>
      )}
      <FieldError id={`${id}-at-error`} error={error} />
    </fieldset>
  );
}
