"use client";

import { ExternalLink, Eye, Plus, Trash2 } from "lucide-react";
import { useId, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import {
  createApplicationAction,
  createInterviewAction,
  deleteInterviewAction,
  updateApplicationAction,
  updateInterviewAction,
  type ActionResult,
} from "@/app/dashboard/actions";
import { inputClasses } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  INTERVIEW_KINDS,
  INTERVIEW_NOTES_MAX_LENGTH,
  INTERVIEW_OPTIONS,
  OUTCOME_OPTIONS,
  OUTCOMES,
  STATUS_OPTIONS,
  STATUSES,
  type Application,
  type Interview,
  type InterviewKind,
  type Outcome,
  type Status,
} from "@/lib/applications";

/** An ISO timestamp as the viewer's local date and time, for a datetime-local input. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** A datetime-local value (the viewer's local time) as an ISO timestamp; blank is no date. */
function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function todayLocal() {
  return toLocalInput(new Date().toISOString()).slice(0, 10);
}

function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="m-0 text-sm text-fg-danger">
      {error}
    </p>
  );
}

/**
 * The whole Application, editable: Status and Outcome, the details, then the Interview list.
 * Interviews save one row at a time through the nested API routes, each one's Interview notes
 * with their own button; Status and Outcome save together, because Done needs an Outcome.
 */
export function ApplicationEditor({
  app,
  onDelete,
}: {
  app: Application;
  /** Asks to delete the Application; the caller confirms first. */
  onDelete: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  // Lives here, not in DetailsForm, so saving the details doesn't hide the salary again. This
  // component mounts each time the panel opens the Application, which does.
  const [salaryRevealed, setSalaryRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

  /** Runs a save and shows its error. */
  function save(run: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <StatusForm key={`${app.updated_at}-${app.status}-${app.outcome}`} app={app} onError={setError} />

      <DetailsForm
        key={`${app.company}-${app.title}-${app.applied_on}-${app.location}-${app.salary}-${app.posting_url}`}
        app={app}
        salaryHidden={Boolean(app.salary) && !salaryRevealed}
        onRevealSalary={() => setSalaryRevealed(true)}
        onError={setError}
      />

      <section aria-labelledby="interviews-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 id="interviews-title" className="m-0 text-base font-bold leading-[1.25] text-heading">
            Interviews
          </h3>
          <Button
            disabled={isPending}
            onClick={() => save(() => createInterviewAction(app.id, { kind: "informal_chat" }))}
            variant="secondary"
            size="sm"
          >
            <Plus className="size-4" aria-hidden />
            Add Interview
          </Button>
        </div>
        {app.interviews.length === 0 ? (
          <p className="m-0 text-sm text-body">No Interviews yet. Add one when you have a conversation lined up.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {app.interviews.map((interview, index) => (
              <InterviewRow
                key={interview.id}
                app={app}
                interview={interview}
                position={index + 1}
                disabled={isPending}
                save={save}
              />
            ))}
          </ul>
        )}
      </section>

      <ErrorMessage error={error} />
      <div className="flex border-t border-line pt-4">
        <Button onClick={onDelete} variant="danger">
          <Trash2 className="size-4" aria-hidden />
          Delete application
        </Button>
      </div>
    </div>
  );
}

/** The details of an Application that doesn't exist yet; adding it creates the Application. */
export function NewApplicationForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  return <DetailsForm error={error} onError={setError} onDone={onDone} />;
}

function StatusForm({ app, onError }: { app: Application; onError: (message: string | null) => void }) {
  const id = useId();
  const [status, setStatus] = useState<Status>(app.status);
  const [outcome, setOutcome] = useState<Outcome | "">(app.outcome ?? "");
  const [isPending, startTransition] = useTransition();
  const dirty = status !== app.status || (status === "done" && outcome !== (app.outcome ?? ""));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    startTransition(async () => {
      const result = await updateApplicationAction(
        app.id,
        status === "done" ? { status, outcome: outcome || null } : { status, outcome: null },
      );
      if (!result.ok) onError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-40 flex-1">
        <label htmlFor={`${id}-status`} className="mb-2 block text-sm font-medium text-heading">
          Status
        </label>
        <select
          id={`${id}-status`}
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className={inputClasses}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_OPTIONS[value].label}
            </option>
          ))}
        </select>
      </div>
      {status === "done" && (
        <div className="min-w-40 flex-1">
          <label htmlFor={`${id}-outcome`} className="mb-2 block text-sm font-medium text-heading">
            Outcome
          </label>
          <select
            id={`${id}-outcome`}
            value={outcome}
            required
            onChange={(e) => setOutcome(e.target.value as Outcome)}
            className={inputClasses}
          >
            <option value="" disabled>
              Choose an Outcome
            </option>
            {OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {OUTCOME_OPTIONS[value].label}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button
        type="submit"
        disabled={!dirty || isPending}
      >
        {isPending ? "Saving…" : "Save status"}
      </Button>
    </form>
  );
}

const DETAIL_FIELDS = ["company", "title", "applied_on", "location", "salary", "posting_url"] as const;
type DetailField = (typeof DETAIL_FIELDS)[number];

/**
 * An Application's details: company, title, applied date, location, salary and job posting. They
 * save together with one button, so a value typed before closing the panel is never half-saved.
 * Without `app` the form is empty and creates the Application.
 */
function DetailsForm({
  app,
  salaryHidden = false,
  onRevealSalary,
  error,
  onError,
  onDone,
}: {
  app?: Application;
  /** Shows a Reveal button in place of the salary, against someone looking at the screen. */
  salaryHidden?: boolean;
  onRevealSalary?: () => void;
  /** Shown above the buttons; the editor shows its own below all of its forms instead. */
  error?: string | null;
  onError: (message: string | null) => void;
  /** Called after the Application is created, and by Cancel. */
  onDone?: () => void;
}) {
  const id = useId();
  const [saved] = useState<Record<DetailField, string>>(() => ({
    company: app?.company ?? "",
    title: app?.title ?? "",
    applied_on: app?.applied_on ?? todayLocal(),
    location: app?.location ?? "",
    salary: app?.salary ?? "",
    posting_url: app?.posting_url ?? "",
  }));
  const [values, setValues] = useState(saved);
  // Only after Reveal is pressed: a form remounted by a save must not pull focus to the salary.
  const [focusSalary, setFocusSalary] = useState(false);
  const [isPending, startTransition] = useTransition();
  const changed = DETAIL_FIELDS.filter((name) => values[name].trim() !== saved[name]);

  function field(name: DetailField) {
    return {
      id: `${id}-${name}`,
      value: values[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) => setValues((prev) => ({ ...prev, [name]: e.target.value })),
      className: inputClasses,
    };
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    const fields = Object.fromEntries((app ? changed : DETAIL_FIELDS).map((name) => [name, values[name].trim() || null]));
    startTransition(async () => {
      const result = await (app ? updateApplicationAction(app.id, fields) : createApplicationAction(fields));
      if (!result.ok) onError(result.error);
      else if (!app) onDone?.();
    });
  }

  const labelClasses = "mb-2 block text-sm font-medium text-heading";

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-heading`} className="flex flex-col gap-4">
      <h3 id={`${id}-heading`} className="m-0 text-base font-bold leading-[1.25] text-heading">
        Details
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-company`} className={labelClasses}>
            Company
          </label>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the Add panel is a dialog; focus starts on its first field. */}
          <input type="text" required autoFocus={!app} {...field("company")} />
        </div>
        <div>
          <label htmlFor={`${id}-title`} className={labelClasses}>
            Title
          </label>
          <input type="text" required {...field("title")} />
        </div>
        <div>
          <label htmlFor={`${id}-applied_on`} className={labelClasses}>
            Applied
          </label>
          <input type="date" required {...field("applied_on")} />
        </div>
        <div>
          <label htmlFor={`${id}-location`} className={labelClasses}>
            Location (optional)
          </label>
          <input type="text" placeholder="Remote" {...field("location")} />
        </div>
        {salaryHidden ? (
          <fieldset aria-labelledby={`${id}-salary-label`} className="m-0 min-w-0 border-0 p-0">
            <span id={`${id}-salary-label`} className={labelClasses}>
              Salary (optional)
            </span>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-body">Hidden</span>
              <Button
                onClick={() => {
                  setFocusSalary(true);
                  onRevealSalary?.();
                }}
                variant="secondary"
              >
                <Eye className="size-4" aria-hidden />
                Reveal
              </Button>
            </div>
          </fieldset>
        ) : (
          <div>
            <label htmlFor={`${id}-salary`} className={labelClasses}>
              Salary (optional)
            </label>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- "Add salary" swaps its button for this field, so focus follows it. */}
            <input type="text" placeholder="$150k–$180k" autoFocus={focusSalary} {...field("salary")} />
          </div>
        )}
        <div>
          <label htmlFor={`${id}-posting_url`} className={labelClasses}>
            Job posting URL (optional)
          </label>
          <div className="flex items-center gap-1">
            <input type="url" placeholder="https://" {...field("posting_url")} />
            {app?.posting_url && (
              <a
                href={app.posting_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open the ${app.company} job posting in a new tab`}
                className="shrink-0 rounded-control p-2.5 text-body transition-colors hover:bg-card hover:text-heading"
              >
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
      <ErrorMessage error={error ?? null} />
      {app ? (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={changed.length === 0 || isPending}
          >
            {isPending ? "Saving…" : "Save details"}
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
          <Button onClick={onDone} variant="secondary">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding…" : "Add application"}
          </Button>
        </div>
      )}
    </form>
  );
}

function InterviewRow({
  app,
  interview,
  position,
  disabled,
  save,
}: {
  app: Application;
  interview: Interview;
  /** 1 for the Application's first Interview. */
  position: number;
  disabled: boolean;
  save: (run: () => Promise<ActionResult>) => void;
}) {
  const saved = toLocalInput(interview.at);
  const label = `Interview ${position}`;

  return (
    <li className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-3">
      <div className="min-w-44 flex-1">
        <label htmlFor={`kind-${interview.id}`} className="mb-1 block text-xs font-medium text-body">
          Kind<span className="sr-only">, {label}</span>
        </label>
        <select
          // Keyed by the saved value, like the other fields: a save resets only the field it changed,
          // so notes being written survive a change of kind or date.
          key={interview.kind}
          id={`kind-${interview.id}`}
          defaultValue={interview.kind}
          disabled={disabled}
          onChange={(e) =>
            save(() => updateInterviewAction(app.id, interview.id, { kind: e.target.value as InterviewKind }))
          }
          className={inputClasses}
        >
          {INTERVIEW_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {INTERVIEW_OPTIONS[kind].label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-52 flex-1">
        <label htmlFor={`at-${interview.id}`} className="mb-1 block text-xs font-medium text-body">
          Date and time (optional)<span className="sr-only">, {label}</span>
        </label>
        <input
          key={saved}
          id={`at-${interview.id}`}
          type="datetime-local"
          defaultValue={saved}
          disabled={disabled}
          onBlur={(e) => {
            if (e.currentTarget.value === saved) return;
            const at = fromLocalInput(e.currentTarget.value);
            save(() => updateInterviewAction(app.id, interview.id, { at }));
          }}
          className={inputClasses}
        />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => save(() => deleteInterviewAction(app.id, interview.id))}
        aria-label={`Delete ${INTERVIEW_OPTIONS[interview.kind].label} Interview, ${label}`}
        className="rounded-control p-2.5 text-body transition-colors hover:bg-danger-soft hover:text-fg-danger disabled:opacity-60"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      <InterviewNotesForm
        key={interview.notes ?? ""}
        app={app}
        interview={interview}
        label={label}
        disabled={disabled}
        save={save}
      />
    </li>
  );
}

/**
 * An Interview's notes: written, read and cleared here, under their Interview. They save with
 * their own button, not on blur, so a long note is never sent half-written.
 */
function InterviewNotesForm({
  app,
  interview,
  label,
  disabled,
  save,
}: {
  app: Application;
  interview: Interview;
  /** "Interview 2": tells the rows apart for screen readers. */
  label: string;
  disabled: boolean;
  save: (run: () => Promise<ActionResult>) => void;
}) {
  const [draft, setDraft] = useState(interview.notes ?? "");
  // As the API stores them: ends trimmed, blank is none.
  const notes = draft.trim() || null;
  const nearLimit = draft.length >= INTERVIEW_NOTES_MAX_LENGTH * 0.9;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save(() => updateInterviewAction(app.id, interview.id, { notes }));
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2">
      <div>
        <label htmlFor={`notes-${interview.id}`} className="mb-1 block text-xs font-medium text-body">
          Interview notes (optional)<span className="sr-only">, {label}</span>
        </label>
        <textarea
          id={`notes-${interview.id}`}
          value={draft}
          rows={3}
          maxLength={INTERVIEW_NOTES_MAX_LENGTH}
          placeholder="How it went, what you were asked, what you’d do differently"
          onChange={(e) => setDraft(e.target.value)}
          // Grows with the notes where the browser supports it; otherwise it scrolls and resizes.
          className={`${inputClasses} field-sizing-content max-h-96 min-h-20 resize-y`}
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        {nearLimit && (
          <span className="text-xs text-body">
            {draft.length.toLocaleString("en-CA")} of {INTERVIEW_NOTES_MAX_LENGTH.toLocaleString("en-CA")} characters
          </span>
        )}
        <Button
          type="submit"
          disabled={disabled || notes === interview.notes}
          aria-label={`Save notes, ${label}`}
          variant="secondary"
          size="sm"
        >
          Save notes
        </Button>
      </div>
    </form>
  );
}
