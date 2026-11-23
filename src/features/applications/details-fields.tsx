"use client";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { useId, useState, type ChangeEvent, type FocusEvent, type ReactNode } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { ExternalLink } from "@/components/ui/external-link";
import { Field } from "@/components/ui/field";
import { invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PLACEHOLDERS } from "@/features/applications/placeholders";
import {
  APPLICATION_MAX_LENGTHS,
  LOCATION_OPTIONS,
  LOCATIONS,
  OFFICE_DAYS,
  type Application,
} from "@/lib/applications";
import { applicationErrors, isValid, summarize, type FieldErrors } from "@/lib/validation";

export const DETAIL_FIELDS = ["company", "title", "applied_on", "location", "office_days", "posting_url"] as const;
export type DetailField = (typeof DETAIL_FIELDS)[number];
/** Each detail as the form holds it: text, with "" for none (office days as "1" to "4"). */
export type DetailValues = Record<DetailField, string>;

/** A detail as the API takes it: trimmed text, office days as a number, and null for none. */
export function apiValue(name: DetailField, value: string): string | number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return name === "office_days" ? Number(trimmed) : trimmed;
}

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
  function check(fields: Record<string, unknown>, { creating }: { creating: boolean }) {
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
  function checkField(name: DetailField, value: unknown) {
    const problem = applicationErrors({ [name]: value }, { creating: false })[name];
    setFieldErrors((prev) => ({ ...prev, [name]: problem }));
    setInvalid(problem ?? null);
    return !problem;
  }

  /** Replaces details that changed elsewhere (another tab's save) with their saved values. */
  function adopt(changes: Partial<DetailValues>) {
    setValues((prev) => ({ ...prev, ...changes }));
  }

  return {
    id,
    values,
    set,
    fieldErrors,
    setFieldErrors,
    invalid,
    check,
    checkField,
    adopt,
  };
}

export type Details = ReturnType<typeof useDetails>;

/**
 * An Application's details as fields: company, title, applied date, Location (and days in office,
 * when Hybrid) and job posting.
 * Company, Title and Applied are required. Without `identity`, Company and Title are left out:
 * an existing Application edits them in its heading. With `app`, the job posting has a link out.
 * With `onCommit`, each detail reports when it's left (the date and Location, when picked), for a form that
 * saves them one by one; `status` then gives each its SaveStatus, shown beside its label.
 */
export function DetailsFields({
  details,
  app,
  identity = true,
  onCommit,
  status,
}: {
  details: Details;
  app?: Application;
  onCommit?: (name: DetailField, value: string) => void;
  status?: (name: DetailField) => ReactNode;
  /** Whether Company and Title are fields here; the Application page edits them in its heading. */
  identity?: boolean;
}) {
  const { id, values, set, fieldErrors } = details;

  /** The props of one typed detail's input. */
  function input(name: "company" | "title" | "posting_url") {
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
    return {
      id: `${id}-${name}`,
      error: fieldErrors[name],
      status: status?.(name),
    };
  }

  return (
    <div className="flex flex-col gap-4">
      {identity && (
        <>
          <Field label="Company" required {...field("company")}>
            <input type="text" required {...input("company")} />
          </Field>
          <Field label="Title" required {...field("title")}>
            <input type="text" required {...input("title")} />
          </Field>
        </>
      )}
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
        <ToggleGroup
          type="single"
          id={`${id}-location`}
          aria-labelledby={`${id}-location-label`}
          value={values.location}
          onValueChange={(value) => {
            set("location", value);
            // Days in office only go with Hybrid; the API clears them too.
            if (value !== "hybrid") set("office_days", "");
            onCommit?.("location", value);
          }}
          {...invalidProps(`${id}-location-error`, fieldErrors.location)}
        >
          {LOCATIONS.map((location) => (
            <ToggleGroupItem key={location} value={location}>
              {LOCATION_OPTIONS[location].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      {values.location === "hybrid" && (
        <Field label="Days in office" {...field("office_days")}>
          <ToggleGroup
            type="single"
            id={`${id}-office_days`}
            aria-labelledby={`${id}-office_days-label`}
            value={values.office_days}
            onValueChange={(value) => {
              set("office_days", value);
              onCommit?.("office_days", value);
            }}
            {...invalidProps(`${id}-office_days-error`, fieldErrors.office_days)}
          >
            {OFFICE_DAYS.map((days) => (
              <ToggleGroupItem
                key={days}
                value={String(days)}
                aria-label={`${days} ${days === 1 ? "day" : "days"} a week`}
              >
                {days}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      )}
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
