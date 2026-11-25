// Checks what a job seeker typed before it is sent, with the API's own rules (api/app/models.py)
// and limits (APPLICATION_MAX_LENGTHS, INTERVIEW_NOTES_MAX_LENGTHS, INTERVIEW_TITLE_MAX_LENGTH, ACCESS_TOKEN_NAME_MAX): the forms run them to show
// errors beside each field, and the Server Actions run them again, because anyone can call those
// with any values. FastAPI and the database still check everything; this only answers sooner.

import { ACCESS_TOKEN_NAME_MAX } from "@/lib/account";
import {
  APPLICATION_MAX_LENGTHS,
  INTERVIEW_CATEGORIES,
  INTERVIEW_NOTES_FIELDS,
  INTERVIEW_NOTES_LABELS,
  INTERVIEW_NOTES_MAX_LENGTHS,
  INTERVIEW_PREP_NOTES_MAX_LENGTH,
  INTERVIEW_TITLE_MAX_LENGTH,
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
const CATEGORY_SET = new Set<unknown>(INTERVIEW_CATEGORIES);
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
  done_on: "Done date",
  outcome_note: "Outcome note",
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

/** Company and Title (required), and Salary, Posting link and Outcome note (optional). */
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
  const note = optionalText(fields.outcome_note, APPLICATION_LABELS.outcome_note, APPLICATION_MAX_LENGTHS.outcome_note);
  if (note) errors.outcome_note = note;
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
  // Optional, and only for a Done Application: the API checks that against the saved Status.
  const doneOn = fields.done_on;
  if (doneOn !== undefined && doneOn !== null && (typeof doneOn !== "string" || !isIsoDate(doneOn))) {
    errors.done_on = "Enter the date it ended.";
  }
  return Object.assign(errors, statusErrors(fields, creating));
}

/**
 * What's wrong with the order of an Application's dates, as the API checks it: the Done date is
 * never before the applied date nor after `today` (the viewer's, YYYY-MM-DD). `changes` holds the
 * dates being saved; the others come from `saved`. Null when they're in order.
 */
export function dateOrderError(
  changes: { applied_on?: string; done_on?: string | null },
  saved: { applied_on: string; done_on: string | null },
  today: string,
): string | null {
  const appliedOn = changes.applied_on ?? saved.applied_on;
  const doneOn = changes.done_on === undefined ? saved.done_on : changes.done_on;
  if (!doneOn) return null;
  if (doneOn < appliedOn) {
    return "done_on" in changes ? "The Done date can’t be before the applied date." : "The applied date can’t be after the Done date.";
  }
  return "done_on" in changes && doneOn > today ? "The Done date can’t be in the future." : null;
}

type InterviewInput = Partial<Record<keyof InterviewFields, unknown>>;

function interviewCategoryError(fields: InterviewInput, creating: boolean) {
  return (creating || "category" in fields) && !CATEGORY_SET.has(fields.category) ? "Choose an Interview category." : null;
}

/** The title's problem: required when creating, and never cleared by a change. */
function interviewTitleError(fields: InterviewInput, creating: boolean) {
  return creating || "title" in fields ? requiredText(fields.title, "Title", INTERVIEW_TITLE_MAX_LENGTH) : null;
}

/** The date and time's problem: required when creating, and never cleared by a change. */
function interviewDateError(fields: InterviewInput, creating: boolean) {
  if (!creating && !("at" in fields)) return null;
  if (fields.at === undefined || fields.at === null || fields.at === "") return "Enter the date and time.";
  if (typeof fields.at !== "string" || !isTimestamp(fields.at)) return "Enter a date and time.";
  return null;
}

/**
 * Problems with an Interview's fields. `creating` checks a whole new Interview, so the category, the
 * title and the date and time are required; otherwise only the fields given are checked, as a
 * change, and none of those three can be cleared.
 */
export function interviewErrors(input: unknown, { creating = false }: { creating?: boolean } = {}): FieldErrors {
  if (typeof input !== "object" || input === null) return { form: "Nothing to save." };
  const fields = input as InterviewInput;
  const errors: FieldErrors = unknownFields(input, ["category", "title", "at", ...INTERVIEW_NOTES_FIELDS, "prep_notes"]);
  const required = {
    category: interviewCategoryError(fields, creating),
    title: interviewTitleError(fields, creating),
    at: interviewDateError(fields, creating),
  };
  for (const [field, problem] of Object.entries(required)) if (problem) errors[field] = problem;
  for (const field of INTERVIEW_NOTES_FIELDS) {
    const problem = optionalText(fields[field], INTERVIEW_NOTES_LABELS[field], INTERVIEW_NOTES_MAX_LENGTHS[field]);
    if (problem) errors[field] = problem;
  }
  const prepNotes = optionalText(fields.prep_notes, "Prep notes", INTERVIEW_PREP_NOTES_MAX_LENGTH);
  if (prepNotes) errors.prep_notes = prepNotes;
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
