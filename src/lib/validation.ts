// Checks what a job seeker typed before it is sent, with the API's own rules (api/app/models.py)
// and limits (APPLICATION_MAX_LENGTHS, INTERVIEW_NOTES_MAX_LENGTHS, ACCESS_TOKEN_NAME_MAX): the forms run them to show
// errors beside each field, and the Server Actions run them again, because anyone can call those
// with any values. FastAPI and the database still check everything; this only answers sooner.

import { ACCESS_TOKEN_NAME_MAX } from "@/lib/account";
import {
  APPLICATION_MAX_LENGTHS,
  INTERVIEW_KINDS,
  INTERVIEW_NOTES_FIELDS,
  INTERVIEW_NOTES_LABELS,
  INTERVIEW_NOTES_MAX_LENGTHS,
  LOCATIONS,
  OFFICE_DAYS,
  OUTCOMES,
  STATUSES,
  type ApplicationFields,
  type InterviewFields,
} from "@/lib/applications";

/** A message for each field that needs fixing, keyed by field name; empty when all is well. */
export type FieldErrors<Field extends string = string> = Partial<Record<Field, string>>;

/** The Posting link rule the API and database use: http or https, then no spaces. */
const HTTP_URL = /^https?:\/\/\S+$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_SET = new Set<unknown>(STATUSES);
const OUTCOME_SET = new Set<unknown>(OUTCOMES);
const KIND_SET = new Set<unknown>(INTERVIEW_KINDS);
const LOCATION_SET = new Set<unknown>(LOCATIONS);
const OFFICE_DAYS_SET = new Set<unknown>(OFFICE_DAYS);

const APPLICATION_LABELS: Record<keyof ApplicationFields, string> = {
  company: "Company",
  title: "Title",
  posting_url: "Job posting URL",
  location: "Location",
  office_days: "Days in office",
  salary: "Salary",
  applied_on: "Applied date",
  status: "Status",
  outcome: "Outcome",
};

/** True for an http or https URL, the only kind the API stores. */
export function isHttpUrl(value: string) {
  return HTTP_URL.test(value);
}

/** True for a real calendar date written YYYY-MM-DD. */
function isIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isTimestamp(value: string) {
  return value.includes("T") && !Number.isNaN(Date.parse(value));
}

function tooLong(label: string, max: number) {
  return `${label} can be at most ${max.toLocaleString("en-CA")} characters.`;
}

/** Text the job seeker must give; null or blank is missing. */
function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || value.trim() === "") return `Enter the ${label.toLowerCase()}.`;
  if (value.length > max) return tooLong(label, max);
  return null;
}

/** Text the job seeker may leave out; null or blank is none. */
function optionalText(value: unknown, label: string, max: number) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return `${label} must be text.`;
  if (value.length > max) return tooLong(label, max);
  return null;
}

function postingUrl(value: unknown) {
  const label = APPLICATION_LABELS.posting_url;
  const problem = optionalText(value, label, APPLICATION_MAX_LENGTHS.posting_url);
  if (problem || typeof value !== "string" || value.trim() === "") return problem;
  return isHttpUrl(value.trim()) ? null : "Enter a link that starts with http:// or https://.";
}

/** Keys that aren't fields at all: the API refuses them, so they are reported, not dropped. */
function unknownFields(input: object, known: readonly string[]): FieldErrors {
  const allowed = new Set(known);
  return Object.fromEntries(
    Object.keys(input)
      .filter((key) => !allowed.has(key))
      .map((key) => [key, "This isn’t a field Bigfoot stores."]),
  );
}

type ApplicationInput = Partial<Record<keyof ApplicationFields, unknown>>;

/** Company and Title (required) and Salary and Posting link (optional). */
function applicationTextErrors(fields: ApplicationInput, creating: boolean): FieldErrors {
  const errors: FieldErrors = {};
  for (const name of ["company", "title"] as const) {
    const problem =
      (creating || name in fields) && requiredText(fields[name], APPLICATION_LABELS[name], APPLICATION_MAX_LENGTHS[name]);
    if (problem) errors[name] = problem;
  }
  const salary = optionalText(fields.salary, APPLICATION_LABELS.salary, APPLICATION_MAX_LENGTHS.salary);
  if (salary) errors.salary = salary;
  const url = postingUrl(fields.posting_url);
  if (url) errors.posting_url = url;
  return errors;
}

/**
 * The Location, one of its choices or none, and its office days: 1 to 4, and only for Hybrid. A
 * change that sends days without a Location leaves that check to the API, which knows the saved one.
 */
function locationErrors(fields: ApplicationInput): FieldErrors {
  const errors: FieldErrors = {};
  const { location, office_days: days } = fields;
  if (location !== undefined && location !== null && !LOCATION_SET.has(location)) errors.location = "Choose a Location.";
  if (days === undefined || days === null) return errors;
  if (!OFFICE_DAYS_SET.has(days)) errors.office_days = `Choose ${OFFICE_DAYS[0]} to ${OFFICE_DAYS.at(-1)} days in office.`;
  else if ("location" in fields && location !== "hybrid") errors.office_days = "Only a Hybrid Location has days in office.";
  return errors;
}

/** The Outcome's problem given the Status: only a Done Application has one, and it must. */
function outcomeError(status: unknown, outcome: unknown) {
  if (outcome !== null && !OUTCOME_SET.has(outcome)) return "Choose an Outcome.";
  if (status === "done" && outcome === null) return "Choose an Outcome for a Done Application.";
  if (status === "in_progress" && outcome !== null) return "Only a Done Application has an Outcome.";
  return null;
}

/** Status, and the Outcome that goes with it. */
function statusErrors(fields: ApplicationInput, creating: boolean): FieldErrors {
  const errors: FieldErrors = {};
  const status = "status" in fields ? fields.status : creating ? "in_progress" : undefined;
  if (status !== undefined && !STATUS_SET.has(status)) errors.status = "Choose a Status.";
  const outcome = outcomeError(status, fields.outcome ?? null);
  if (outcome) errors.outcome = outcome;
  return errors;
}

/**
 * Problems with an Application's fields. `creating` checks a whole new Application, so Company
 * and Title are required; otherwise only the fields given are checked, as a change.
 */
export function applicationErrors(input: unknown, { creating }: { creating: boolean }): FieldErrors {
  if (typeof input !== "object" || input === null) return { form: "Nothing to save." };
  const fields = input as ApplicationInput;
  const errors: FieldErrors = unknownFields(input, Object.keys(APPLICATION_LABELS));
  Object.assign(errors, applicationTextErrors(fields, creating), locationErrors(fields));
  // Optional when creating (the API defaults it to today), but never cleared once set.
  if ("applied_on" in fields && (typeof fields.applied_on !== "string" || !isIsoDate(fields.applied_on))) {
    errors.applied_on = "Enter the date you applied.";
  }
  return Object.assign(errors, statusErrors(fields, creating));
}

type InterviewInput = Partial<Record<keyof InterviewFields, unknown>>;

function interviewKindError(fields: InterviewInput, creating: boolean) {
  return (creating || "kind" in fields) && !KIND_SET.has(fields.kind) ? "Choose an Interview kind." : null;
}

/** The date and time's problem: required when creating, and never cleared by a change. */
function interviewDateError(fields: InterviewInput, creating: boolean) {
  if (!creating && !("at" in fields)) return null;
  if (fields.at === undefined || fields.at === null || fields.at === "") return "Enter the date and time.";
  if (typeof fields.at !== "string" || !isTimestamp(fields.at)) return "Enter a date and time.";
  return null;
}

/**
 * Problems with an Interview's fields. `creating` checks a whole new Interview, so the kind and the
 * date and time are required; otherwise only the fields given are checked, as a change, and the
 * date can't be cleared.
 */
export function interviewErrors(input: unknown, { creating = false }: { creating?: boolean } = {}): FieldErrors {
  if (typeof input !== "object" || input === null) return { form: "Nothing to save." };
  const fields = input as InterviewInput;
  const errors: FieldErrors = unknownFields(input, ["kind", "at", ...INTERVIEW_NOTES_FIELDS]);
  const kind = interviewKindError(fields, creating);
  if (kind) errors.kind = kind;
  const at = interviewDateError(fields, creating);
  if (at) errors.at = at;
  for (const field of INTERVIEW_NOTES_FIELDS) {
    const problem = optionalText(fields[field], INTERVIEW_NOTES_LABELS[field], INTERVIEW_NOTES_MAX_LENGTHS[field]);
    if (problem) errors[field] = problem;
  }
  return errors;
}

/** Control characters, and the invisible ones that reorder text, as the API refuses them in names. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/;

/** What's wrong with a new Access token's name, as the API checks it; null when it's fine. */
export function accessTokenNameError(name: unknown): string | null {
  const problem = requiredText(name, "Name", ACCESS_TOKEN_NAME_MAX);
  if (problem) return problem;
  return CONTROL_CHARACTERS.test(name as string) ? "Use only characters you can see in the name." : null;
}

/** True when there is nothing to fix. */
export function isValid(errors: FieldErrors) {
  return Object.keys(errors).length === 0;
}

/** One sentence for a screen reader or a toast: the first problem, and how many more there are. */
export function summarize(errors: FieldErrors) {
  const messages = Object.values(errors).filter(Boolean);
  if (messages.length <= 1) return messages[0] ?? "";
  return `${messages[0]} ${messages.length - 1} more ${messages.length === 2 ? "field needs" : "fields need"} fixing.`;
}
