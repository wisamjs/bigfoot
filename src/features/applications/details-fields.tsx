"use client";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { useId, useState, type ChangeEvent, type FocusEvent, type ReactNode } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { ExternalLink } from "@/components/ui/external-link";
import { Field } from "@/components/ui/field";
import { invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import { SalaryField } from "@/features/applications/salary-field";
import { APPLICATION_MAX_LENGTHS, type Application } from "@/lib/applications";
import { applicationErrors, isValid, summarize, type FieldErrors } from "@/lib/validation";

export const DETAIL_FIELDS = ["company", "title", "applied_on", "location", "salary", "posting_url"] as const;
export type DetailField = (typeof DETAIL_FIELDS)[number];
export type DetailValues = Record<DetailField, string>;

/**
 * What the details form being filled in holds: each detail as typed, the errors beside them, and
 * the error announced for the whole form. Shared by Add Application and the Application page's details.
 */
export function useDetails(initial: DetailValues) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // What's wrong before anything is sent; errors from the save itself show in SaveStatus.
  const [invalid, setInvalid] = useState<string | null>(null);

  function set(name: DetailField, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  /**
   * Checks `fields` with the API's rules. When something needs fixing, shows each error beside
   * its field, announces the first and focuses that field, and returns false.
   */
  function check(fields: Record<string, string | null>, { creating }: { creating: boolean }) {
    const errors = applicationErrors(fields, { creating });
    setFieldErrors(errors);
    if (isValid(errors)) {
      setInvalid(null);
      return true;
    }
    setInvalid(summarize(errors));
    const first = DETAIL_FIELDS.find((name) => errors[name]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
    return false;
  }

  /**
   * Checks one detail with the API's rules, for a form that saves each as it's left. Shows its
   * error beside it, announces it, and returns false; leaves the other fields and the focus alone,
   * because the job seeker is already on their way to another field.
   */
  function checkField(name: DetailField, value: string | null) {
    const problem = applicationErrors({ [name]: value }, { creating: false })[name];
    setFieldErrors((prev) => ({ ...prev, [name]: problem }));
    setInvalid(problem ?? null);
    return !problem;
  }

  /** Replaces details that changed elsewhere (another tab's save) with their saved values. */
  function adopt(changes: Partial<DetailValues>) {
    setValues((prev) => ({ ...prev, ...changes }));
  }

  return { id, values, set, fieldErrors, setFieldErrors, invalid, check, checkField, adopt };
}

export type Details = ReturnType<typeof useDetails>;

/**
 * An Application's details as fields: company, title, applied date, location, salary and job
 * posting. Company, Title and Applied are required. With `app`, the job posting has a link out.
 * With `onCommit`, each detail reports when it's left (the date, when it's picked), for a form that
 * saves them one by one; `status` then gives each its SaveStatus, shown beside its label.
 */
export function DetailsFields({
  details,
  app,
  salaryHidden = false,
  onRevealSalary,
  onCommit,
  status,
}: {
  details: Details;
  app?: Application;
  onCommit?: (name: DetailField, value: string) => void;
  status?: (name: DetailField) => ReactNode;
  /** Shows a Reveal button in place of the salary, against someone looking at the screen. */
  salaryHidden?: boolean;
  onRevealSalary?: () => void;
}) {
  const { id, values, set, fieldErrors } = details;

  /** The props of one typed detail's input. */
  function input(name: Exclude<DetailField, "applied_on">) {
    return {
      id: `${id}-${name}`,
      value: values[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) => set(name, e.target.value),
      onBlur: onCommit && ((e: FocusEvent<HTMLInputElement>) => onCommit(name, e.target.value)),
      maxLength: APPLICATION_MAX_LENGTHS[name],
      placeholder: PLACEHOLDERS[name],
      className: inputClasses,
      ...invalidProps(`${id}-${name}-error`, fieldErrors[name]),
    };
  }

  /** The props of one detail's Field, matching `input(name)`. */
  function field(name: DetailField) {
    return { id: `${id}-${name}`, error: fieldErrors[name], status: status?.(name) };
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Company" required {...field("company")}>
        <input type="text" required {...input("company")} />
      </Field>
      <Field label="Title" required {...field("title")}>
        <input type="text" required {...input("title")} />
      </Field>
      <Field label="Applied" required {...field("applied_on")}>
        <DatePicker
          id={`${id}-applied_on`}
          label="Applied"
          value={values.applied_on}
          onChange={(value) => {
            set("applied_on", value);
            onCommit?.("applied_on", value);
          }}
          {...invalidProps(`${id}-applied_on-error`, fieldErrors.applied_on)}
        />
      </Field>
      <Field label="Location" {...field("location")}>
        <input type="text" {...input("location")} />
      </Field>
      <SalaryField hidden={salaryHidden} onReveal={onRevealSalary} {...field("salary")} input={input("salary")} />
      <Field label="Job posting URL" {...field("posting_url")}>
        <div className="flex items-center gap-1">
          <input type="url" {...input("posting_url")} />
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
  );
}

/** The error announced for the whole form, under its fields, when anything needs fixing. */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 text-sm text-fg-danger">
      {message}
    </p>
  );
}
