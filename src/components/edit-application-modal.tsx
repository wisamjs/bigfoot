"use client";

import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import {
  createInterviewAction,
  deleteInterviewAction,
  updateApplicationAction,
  updateInterviewAction,
  type ActionResult,
} from "@/app/dashboard/actions";
import { buttonClasses, dangerButtonClasses, inputClasses } from "@/components/ui";
import {
  INTERVIEW_KINDS,
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

/**
 * The Application edit dialog's body: Status and Outcome, the details, then the Interview list. Interviews
 * save one row at a time through the nested API routes; Status and Outcome save together,
 * because Done needs an Outcome.
 */
export function EditApplicationForm({
  app,
  onDone,
  onDelete,
}: {
  app: Application;
  onDone: () => void;
  /** Asks to delete the Application; the caller confirms first. */
  onDelete: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /** Runs a save; shows its error, and tells the caller whether it worked. */
  function save(run: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      <p className="m-0 text-base leading-[1.625] text-heading">
        <span className="font-medium">{app.company}</span>, {app.title}
      </p>

      <StatusForm key={`${app.updated_at}-${app.status}-${app.outcome}`} app={app} onError={setError} />

      <DetailsForm
        key={`${app.company}-${app.title}-${app.applied_on}-${app.location}-${app.salary}-${app.posting_url}`}
        app={app}
        onError={setError}
      />

      <section aria-labelledby="interviews-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 id="interviews-title" className="m-0 text-base font-bold leading-[1.25] text-heading">
            Interviews
          </h3>
          <button
            type="button"
            disabled={isPending}
            onClick={() => save(() => createInterviewAction(app.id, { kind: "informal_chat" }))}
            className={`${buttonClasses("secondary", "sm")} disabled:opacity-60`}
          >
            <Plus className="size-4" aria-hidden />
            Add Interview
          </button>
        </div>
        {app.interviews.length === 0 ? (
          <p className="m-0 text-sm text-body">No Interviews yet. Add one when you have a conversation lined up.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {app.interviews.map((interview) => (
              <InterviewRow
                key={`${interview.id}-${interview.updated_at}`}
                app={app}
                interview={interview}
                disabled={isPending}
                save={save}
              />
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="flex justify-between gap-3 border-t border-line pt-4">
        <button type="button" onClick={onDelete} className={dangerButtonClasses}>
          <Trash2 className="size-4" aria-hidden />
          Delete application
        </button>
        <button type="button" onClick={onDone} className={buttonClasses("secondary", "md")}>
          Close
        </button>
      </div>
    </div>
  );
}

function StatusForm({ app, onError }: { app: Application; onError: (message: string | null) => void }) {
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
        <label htmlFor="edit-status" className="mb-2 block text-sm font-medium text-heading">
          Status
        </label>
        <select
          id="edit-status"
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
          <label htmlFor="edit-outcome" className="mb-2 block text-sm font-medium text-heading">
            Outcome
          </label>
          <select
            id="edit-outcome"
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
      <button
        type="submit"
        disabled={!dirty || isPending}
        className={`${buttonClasses("brand", "md")} disabled:opacity-60`}
      >
        {isPending ? "Saving…" : "Save status"}
      </button>
    </form>
  );
}

type DetailField = "company" | "title" | "applied_on" | "location" | "salary" | "posting_url";

/**
 * The Application's details: company, title, applied date, location, salary and job posting. They save together
 * with one button, so a value typed before closing the dialog is never half-saved.
 */
function DetailsForm({ app, onError }: { app: Application; onError: (message: string | null) => void }) {
  const saved: Record<DetailField, string> = {
    company: app.company,
    title: app.title,
    applied_on: app.applied_on,
    location: app.location ?? "",
    salary: app.salary ?? "",
    posting_url: app.posting_url ?? "",
  };
  const [values, setValues] = useState(saved);
  const [isPending, startTransition] = useTransition();
  const changed = (Object.keys(saved) as DetailField[]).filter((field) => values[field].trim() !== saved[field]);

  function field(name: DetailField) {
    return {
      id: `edit-${name.replace("_", "-")}`,
      value: values[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) => setValues({ ...values, [name]: e.target.value }),
      className: inputClasses,
    };
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    const changes = Object.fromEntries(changed.map((name) => [name, values[name].trim() || null]));
    startTransition(async () => {
      const result = await updateApplicationAction(app.id, changes);
      if (!result.ok) onError(result.error);
    });
  }

  return (
    <form onSubmit={submit} aria-labelledby="details-title" className="flex flex-col gap-4">
      <h3 id="details-title" className="m-0 text-base font-bold leading-[1.25] text-heading">
        Details
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-company" className="mb-2 block text-sm font-medium text-heading">
            Company
          </label>
          <input type="text" required {...field("company")} />
        </div>
        <div>
          <label htmlFor="edit-title" className="mb-2 block text-sm font-medium text-heading">
            Title
          </label>
          <input type="text" required {...field("title")} />
        </div>
        <div>
          <label htmlFor="edit-applied-on" className="mb-2 block text-sm font-medium text-heading">
            Applied
          </label>
          <input type="date" required {...field("applied_on")} />
        </div>
        <div>
          <label htmlFor="edit-location" className="mb-2 block text-sm font-medium text-heading">
            Location (optional)
          </label>
          <input type="text" placeholder="Remote" {...field("location")} />
        </div>
        <div>
          <label htmlFor="edit-salary" className="mb-2 block text-sm font-medium text-heading">
            Salary (optional)
          </label>
          <input type="text" placeholder="$150k–$180k" {...field("salary")} />
        </div>
        <div>
          <label htmlFor="edit-posting-url" className="mb-2 block text-sm font-medium text-heading">
            Job posting URL (optional)
          </label>
          <div className="flex items-center gap-1">
            <input type="url" placeholder="https://" {...field("posting_url")} />
            {app.posting_url && (
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
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={changed.length === 0 || isPending}
          className={`${buttonClasses("brand", "md")} disabled:opacity-60`}
        >
          {isPending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

function InterviewRow({
  app,
  interview,
  disabled,
  save,
}: {
  app: Application;
  interview: Interview;
  disabled: boolean;
  save: (run: () => Promise<ActionResult>) => void;
}) {
  const saved = toLocalInput(interview.at);
  const position = app.interviews.indexOf(interview) + 1;
  const label = `Interview ${position}`;

  return (
    <li className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-3">
      <div className="min-w-44 flex-1">
        <label htmlFor={`kind-${interview.id}`} className="mb-1 block text-xs font-medium text-body">
          Kind<span className="sr-only">, {label}</span>
        </label>
        <select
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
    </li>
  );
}
