"use client";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import {
  createApplicationAction,
  updateApplicationAction,
  type ActionResult,
} from "@/app/dashboard/actions";
import { ExternalLink } from "@/components/ui/external-link";
import { Field } from "@/components/ui/field";
import { invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import type { SaveTracker } from "@/hooks/use-save-status";
import { DetailsFormActions } from "@/features/applications/details-form-actions";
import { todayLocal } from "@/features/applications/local-datetime";
import { SalaryField } from "@/features/applications/salary-field";
import { APPLICATION_MAX_LENGTHS, type Application } from "@/lib/applications";
import { applicationErrors, isValid, summarize, type FieldErrors } from "@/lib/validation";

const DETAIL_FIELDS = ["company", "title", "applied_on", "location", "salary", "posting_url"] as const;
type DetailField = (typeof DETAIL_FIELDS)[number];

/**
 * An Application's details: company, title, applied date, location, salary and job posting. They
 * save together with one button, so a value typed before closing the panel is never half-saved.
 * Without `app` the form is empty and creates the Application.
 */
export function DetailsForm({
  app,
  salaryHidden = false,
  onRevealSalary,
  tracker,
  onDone,
}: {
  app?: Application;
  /** Shows a Reveal button in place of the salary, against someone looking at the screen. */
  salaryHidden?: boolean;
  onRevealSalary?: () => void;
  /** Tracks the save; owned by the caller, so its status outlives this form remounting. */
  tracker: SaveTracker;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // What's wrong before anything is sent; errors from the save itself show in SaveStatus.
  const [invalid, setInvalid] = useState<string | null>(null);
  const changed = DETAIL_FIELDS.filter((name) => values[name].trim() !== saved[name]);

  /** The props of one detail's input. */
  function input(name: DetailField) {
    return {
      id: `${id}-${name}`,
      value: values[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setValues((prev) => ({ ...prev, [name]: e.target.value }));
        setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
      },
      maxLength: name === "applied_on" ? undefined : APPLICATION_MAX_LENGTHS[name],
      className: inputClasses,
      ...invalidProps(`${id}-${name}-error`, fieldErrors[name]),
    };
  }

  /** The props of one detail's Field, matching `input(name)`. */
  function field(name: DetailField) {
    return { id: `${id}-${name}`, error: fieldErrors[name] };
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The submit button is only aria-disabled while saving, so it keeps focus; refuse a second submit here.
    if (tracker.saving) return;
    const fields = Object.fromEntries((app ? changed : DETAIL_FIELDS).map((name) => [name, values[name].trim() || null]));
    const errors = applicationErrors(fields, { creating: !app });
    setFieldErrors(errors);
    if (!isValid(errors)) {
      // Each error beside its field, the first announced, and focus on that field.
      setInvalid(summarize(errors));
      const first = DETAIL_FIELDS.find((name) => errors[name]);
      if (first) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setInvalid(null);
    void tracker
      .run(() => (app ? updateApplicationAction(app.id, fields) : createApplicationAction(fields)))
      .then((result: ActionResult) => {
        if (!result.ok) setFieldErrors(result.fieldErrors ?? {});
        else if (!app) onDone?.();
      });
  }

  return (
    // noValidate: the browser's own bubbles would stop the submit before these checks, which
    // show every problem at once, beside its field, in Bigfoot's words.
    <form onSubmit={submit} noValidate aria-labelledby={`${id}-heading`} className="flex flex-col gap-4">
      <h3 id={`${id}-heading`} className="m-0 text-base font-bold leading-[1.25] text-heading">
        Details
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" {...field("company")}>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the Add panel is a dialog; focus starts on its first field. */}
          <input type="text" required autoFocus={!app} {...input("company")} />
        </Field>
        <Field label="Title" {...field("title")}>
          <input type="text" required {...input("title")} />
        </Field>
        <Field label="Applied" {...field("applied_on")}>
          <input type="date" required {...input("applied_on")} />
        </Field>
        <Field label="Location (optional)" {...field("location")}>
          <input type="text" placeholder="Remote" {...input("location")} />
        </Field>
        <SalaryField hidden={salaryHidden} onReveal={onRevealSalary} {...field("salary")} input={input("salary")} />
        <Field label="Job posting URL (optional)" {...field("posting_url")}>
          <div className="flex items-center gap-1">
            <input type="url" placeholder="https://" {...input("posting_url")} />
            {app && (
              <ExternalLink
                href={app.posting_url}
                aria-label={`Open the ${app.company} job posting in a new tab`}
                className="shrink-0 rounded-control p-2.5 text-body transition-colors hover:bg-card hover:text-heading"
              >
                <ExternalLinkIcon className="size-4" aria-hidden />
              </ExternalLink>
            )}
          </div>
        </Field>
      </div>
      {invalid && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {invalid}
        </p>
      )}
      <DetailsFormActions creating={!app} changed={changed.length > 0} tracker={tracker} onCancel={onDone} />
    </form>
  );
}
