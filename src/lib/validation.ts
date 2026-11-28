// Checks what a job seeker typed before it is sent, with the API's own rules (api/app/models.py)
// and limits (APPLICATION_MAX_LENGTHS, INTERVIEW_NOTES_MAX_LENGTHS, INTERVIEW_TITLE_MAX_LENGTH, ACCESS_TOKEN_NAME_MAX): the forms run them to show
// errors beside each field, and the Server Actions run them again, because anyone can call those
// with any values. FastAPI and the database still check everything; this only answers sooner.

import { ACCESS_TOKEN_NAME_MAX, PASSCODE_MAX_LENGTH, PASSCODE_MIN_LENGTH, SHARE_LINK_LABEL_MAX } from "@/lib/account";
import {
  APPLICATION_MAX_LENGTHS,
  DATE_TBD,
  DIDNT_HAPPEN,
  INTERVIEW_CATEGORIES,
  INTERVIEW_NOTES_FIELDS,
  INTERVIEW_NOTES_LABELS,
  INTERVIEW_NOTES_MAX_LENGTHS,
  INTERVIEW_PREP_NOTES_MAX_LENGTH,
  INTERVIEW_TITLE_MAX_LENGTH,
  INTERVIEWS_PER_APPLICATION_MAX,
  LOCATIONS,
  OFFICE_DAYS,
  OUTCOMES,
  PARTICIPANT_MAX_LENGTHS,
  PARTICIPANTS_PER_INTERVIEW_MAX,
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

type ApplicationInput = Partial<Record<keyof ApplicationFields | "interviews", unknown>>;

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
 * The Mark done dialog's answers (BIG-222), as the API checks their shape: only with a change that
 * marks the Application Done, each one an Interview id and a date and time or null, no Interview
 * twice. Whether each id is the Application's and each date is in the past is the API's to say.
 */
function answersErrors(fields: ApplicationInput, creating: boolean): FieldErrors {
  if (!("interviews" in fields)) return {};
  if (creating || fields.status !== "done") return { interviews: "Say whether Interviews happened only when marking it Done." };
  const answers = fields.interviews;
  if (!Array.isArray(answers) || answers.length > INTERVIEWS_PER_APPLICATION_MAX) return { interviews: "Answer for each Interview." };
  const ids = new Set<unknown>();
  for (const answer of answers) {
    const problem = answerError(answer, ids);
    if (problem) return { interviews: problem };
  }
  return {};
}

/** One answer's problem: an Interview id not already answered, and a date and time or null. Adds the id to `ids`. */
function answerError(answer: unknown, ids: Set<unknown>): string | null {
  const { id, at } = (answer ?? {}) as Record<string, unknown>;
  if (typeof id !== "string" || ids.has(id)) return "Answer once for each Interview.";
  ids.add(id);
  return at === null || (typeof at === "string" && isTimestamp(at)) ? null : "Enter when it happened.";
}

/**
 * Problems with an Application's fields. `creating` checks a whole new Application, so Company
 * and Title are required; otherwise only the fields given are checked, as a change.
 */
export function applicationErrors(input: unknown, { creating }: { creating: boolean }): FieldErrors {
  if (typeof input !== "object" || input === null) return { form: "Nothing to save." };
  const fields = input as ApplicationInput;
  const errors: FieldErrors = unknownFields(input, [...Object.keys(APPLICATION_LABELS), "interviews"]);
  Object.assign(errors, answersErrors(fields, creating));
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

/** Whether no date and time was given. */
const isBlankDate = (at: unknown) => at === undefined || at === null || at === "";

/**
 * Where the date can be left out, the choice that leaves it out: Date TBD (Unscheduled), or, for a Done
 * Application's Interview in Edit details, Didn't happen (Abandoned, BIG-222). Null where neither
 * is offered, a new Interview of a Done Application, so no message points at one.
 */
export type NoDateChoice = typeof DATE_TBD | typeof DIDNT_HAPPEN | null;

/**
 * The date and time's problem (docs/adr/0009). A date and time, or the no-date choice (`noDate`),
 * is required when creating, and a change that sends `at` needs one of them too: nothing is assumed
 * from a date left empty. `latest`, when given, is the latest date allowed: a Done Application's
 * Interviews are given dates in the past.
 */
function interviewDateError(fields: InterviewInput, creating: boolean, choice: NoDateChoice, latest?: Date) {
  if (fields.noDate !== undefined && typeof fields.noDate !== "boolean") return `Choose ${choiceText(choice)}.`;
  if (fields.noDate === true) return noDateError(fields.at, choice);
  if (!creating && !("at" in fields) && fields.noDate === undefined) return null;
  if (isBlankDate(fields.at)) return missingDateError(creating, choice);
  return timestampError(fields.at, latest);
}

/** "a date and time, or Date TBD", or just "a date and time" where no no-date choice is offered. */
function choiceText(choice: NoDateChoice) {
  return choice ? `a date and time, or ${choice}` : "a date and time";
}

/** A date and time given: a real one, and no later than `latest` when that is set. */
function timestampError(at: unknown, latest: Date | undefined) {
  if (typeof at !== "string" || !isTimestamp(at)) return "Enter a date and time.";
  return latest && Date.parse(at) > latest.getTime() ? "Enter a date and time in the past: the Application is Done." : null;
}

/** The no-date choice made: fine with no date where it's offered. */
function noDateError(at: unknown, choice: NoDateChoice) {
  if (!choice) return "Enter the date and time.";
  return isBlankDate(at) ? null : `Choose a date and time, or ${choice}, not both.`;
}

/** No date and no no-date choice: Add Interview's checkbox is chosen, Edit details' switch is turned on. */
function missingDateError(creating: boolean, choice: NoDateChoice) {
  if (!choice) return "Enter the date and time.";
  return creating ? `Enter the date and time, or choose ${choice}.` : `Enter the date and time, or turn on ${choice}.`;
}

/**
 * The Mark done dialog's problem with one "Yes, it happened" answer (BIG-222): it needs a date and
 * time, in the past (before `now`), and not before the day it was applied for (`appliedOn`,
 * YYYY-MM-DD, compared with the date's day in the viewer's time zone). Null when it's fine.
 */
export function happenedError(at: string | null, appliedOn: string, now: Date): string | null {
  if (at === null || !isTimestamp(at)) return "Enter when it happened.";
  const when = new Date(at);
  if (when.getTime() > now.getTime()) return "Enter a date and time in the past.";
  const day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
  return day < appliedOn ? "Enter a date on or after the day you applied." : null;
}

/** The Participants' problem: at least one when creating, and never emptied by a change. */
function interviewParticipantsError(fields: InterviewInput, creating: boolean) {
  return creating || "participants" in fields ? (participantsError(fields.participants)?.message ?? null) : null;
}

/**
 * What's wrong with an Interview's Participants, as the API checks them: 1 to 20, each with a role
 * and maybe a name, no one listed twice. Null when they're fine. `index` is the first one with a
 * problem, so a form can mark it; undefined when the problem is the list itself.
 */
export function participantsError(value: unknown): { message: string; index?: number } | null {
  if (!Array.isArray(value) || value.length === 0) return { message: "Add at least one person you’re meeting." };
  if (value.length > PARTICIPANTS_PER_INTERVIEW_MAX) {
    return { message: `An Interview can have at most ${PARTICIPANTS_PER_INTERVIEW_MAX} people.` };
  }
  return peopleError(value);
}

/** The first person in the list with a problem, and what it is; null when everyone is fine. */
function peopleError(value: unknown[]): { message: string; index: number } | null {
  const ids = new Set<unknown>();
  for (const [index, participant] of value.entries()) {
    const { id, role, name } = (participant ?? {}) as Record<string, unknown>;
    const problem = personError(role, name) ?? (id !== undefined && ids.has(id) ? "Each person can be listed once." : null);
    if (problem) return { message: problem, index };
    ids.add(id ?? Symbol());
  }
  return null;
}

/** One Participant's problem: a role is required, a name optional, both within their limits and visible. */
function personError(role: unknown, name: unknown): string | null {
  if (typeof role !== "string" || role.trim() === "") return "Enter each person’s role.";
  const problem =
    (role.length > PARTICIPANT_MAX_LENGTHS.role ? tooLong("Role", PARTICIPANT_MAX_LENGTHS.role) : null) ??
    optionalText(name, "Name", PARTICIPANT_MAX_LENGTHS.name);
  if (problem) return problem;
  return CONTROL_CHARACTERS.test(`${role}${name ?? ""}`) ? "Use only characters you can see." : null;
}

/**
 * Problems with an Interview's fields. `creating` checks a whole new Interview, so the category, the
 * title, the date and time (or the no-date choice) and at least one Participant are required;
 * otherwise only the fields given are checked, as a change, and none of those can be cleared.
 * `noDateChoice` says which choice leaves the date out (Date TBD unless said otherwise), and
 * `latest` is the latest date allowed, for a Done Application's Interview.
 */
export function interviewErrors(
  input: unknown,
  options: { creating?: boolean; noDateChoice?: NoDateChoice; latest?: Date } = {},
): FieldErrors {
  // Creating only when asked; Date TBD offered unless another choice, or none, is given.
  const creating = options.creating === true;
  const choice = options.noDateChoice === undefined ? DATE_TBD : options.noDateChoice;
  if (typeof input !== "object" || input === null) return { form: "Nothing to save." };
  const fields = input as InterviewInput;
  const errors: FieldErrors = unknownFields(input, [
    "category",
    "title",
    "at",
    "noDate",
    ...INTERVIEW_NOTES_FIELDS,
    "prep_notes",
    "participants",
  ]);
  const required = {
    category: interviewCategoryError(fields, creating),
    title: interviewTitleError(fields, creating),
    at: interviewDateError(fields, creating, choice, options.latest),
    participants: interviewParticipantsError(fields, creating),
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

/** What's wrong with a new Share link's label, as the API checks it; null when it's fine. */
export function shareLinkLabelError(label: unknown): string | null {
  if (typeof label !== "string" || label.trim() === "") return "Say who the link is for.";
  if (label.length > SHARE_LINK_LABEL_MAX) return tooLong("Who it’s for", SHARE_LINK_LABEL_MAX);
  return CONTROL_CHARACTERS.test(label) ? "Use only characters you can see." : null;
}

/** What's wrong with a Passcode, as the API checks it; null when it's fine. Kept exactly as typed. */
export function passcodeError(passcode: unknown): string | null {
  if (typeof passcode !== "string" || passcode.trim() === "") return "Choose a passcode, or press Suggest.";
  if (passcode.length < PASSCODE_MIN_LENGTH) return `Use at least ${PASSCODE_MIN_LENGTH} characters.`;
  if (passcode.length > PASSCODE_MAX_LENGTH) return tooLong("Passcode", PASSCODE_MAX_LENGTH);
  return CONTROL_CHARACTERS.test(passcode) ? "Use only characters you can see." : null;
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
