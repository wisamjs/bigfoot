// The Application domain (GLOSSARY.md): allowed values, display labels and colours, and the
// derived views (stats, board, upcoming) the dashboard and landing preview share.
// Allowed values mirror api/app/domain.py and the supabase/migrations check constraints.

export const STATUSES = ["in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

/** Required when an Application is Done, and only then. */
export const OUTCOMES = [
  "offer",
  "rejected",
  "position_filled",
  "withdrawn",
  "no_open_position",
  "not_the_right_fit",
] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Location: how often the role is in the office (GLOSSARY.md). */
export const LOCATIONS = ["in_office", "remote", "hybrid"] as const;
export type Location = (typeof LOCATIONS)[number];

/** For a Hybrid Location: how many days a week in the office. */
export const OFFICE_DAYS = [1, 2, 3, 4] as const;
export type OfficeDays = (typeof OFFICE_DAYS)[number];

/**
 * Interview category (GLOSSARY.md, docs/adr/0007): what an Interview assesses. Fixed, so a Takeaway
 * for next time can match across Applications on it. Listed roughly in the order they happen.
 */
export const INTERVIEW_CATEGORIES = [
  "recruiter",
  "hiring_manager",
  "technical",
  "system_design",
  "project_deep_dive",
  "people_management",
  "project_delivery",
  "collaboration",
  "culture",
  "decision_maker",
] as const;
export type InterviewCategory = (typeof INTERVIEW_CATEGORIES)[number];

/** The longest Interview title the API stores, in characters. */
export const INTERVIEW_TITLE_MAX_LENGTH = 200;

/**
 * Participant (GLOSSARY.md): someone from the company the job seeker meets in an Interview. A role is
 * required, a name optional; a Participant belongs to one Application and can be in several of its Interviews.
 */
export type Participant = { id: string; role: string; name: string | null };

/**
 * A Participant as a form sends them: one already on the Application, by `id` (their role and name
 * become these, on every Interview they're in), or someone new, without one.
 */
export type ParticipantInput = { id?: string; role: string; name: string | null };

/** The longest role and name the API stores for a Participant, and the most an Interview can have. */
export const PARTICIPANT_MAX_LENGTHS = { role: 200, name: 200 } as const;
export const PARTICIPANTS_PER_INTERVIEW_MAX = 20;

/** "Dana Lee (Recruiter)", or just "Recruiter" without a name: how the Interview page lists who's in it. */
export function participantText({ role, name }: Pick<Participant, "role" | "name">): string {
  return name ? `${name} (${role})` : role;
}

/** "Dana Lee · Recruiter", or "Recruiter": a Participant as a choice when adding them to another Interview. */
export function participantOption({ role, name }: Pick<Participant, "role" | "name">): string {
  return name ? `${name} · ${role}` : role;
}

/** "With Dana Lee (Recruiter), Sam (EM)": the Interview page heading's line; null when there's nobody. */
export function withParticipants(participants: Pick<Participant, "role" | "name">[]): string | null {
  return participants.length > 0 ? `With ${participants.map(participantText).join(", ")}` : null;
}

/** Everyone on an Application: each Participant once, in the order they first appear by date. */
export function applicationParticipants(app: Pick<Application, "interviews">): Participant[] {
  const seen = new Map<string, Participant>();
  for (const interview of app.interviews) for (const p of interview.participants) if (!seen.has(p.id)) seen.set(p.id, p);
  return [...seen.values()];
}

/** Interview notes (GLOSSARY.md): three optional plain-text fields on an Interview, in the order they're written. */
export const INTERVIEW_NOTES_FIELDS = ["what_they_asked", "how_it_went", "takeaway"] as const;
export type InterviewNotesField = (typeof INTERVIEW_NOTES_FIELDS)[number];

/** The longest text each Interview notes field stores, in characters; the API and database enforce them too. */
export const INTERVIEW_NOTES_MAX_LENGTHS: Record<InterviewNotesField, number> = {
  what_they_asked: 20_000,
  how_it_went: 20_000,
  takeaway: 500,
};

/** Each Interview notes field's name, as GLOSSARY.md and the forms call it. */
export const INTERVIEW_NOTES_LABELS: Record<InterviewNotesField, string> = {
  what_they_asked: "What they asked",
  how_it_went: "How it went",
  takeaway: "Takeaway for next time",
};

/** The longest Prep notes the API stores, in characters: the same as Interview notes. */
export const INTERVIEW_PREP_NOTES_MAX_LENGTH = 20_000;

/** The longest text each Application field stores, in characters; the API and database enforce them too. */
export const APPLICATION_MAX_LENGTHS = {
  company: 200,
  title: 200,
  salary: 100,
  posting_url: 2_048,
  /** The Outcome note: what the company said when the Application ended. */
  outcome_note: 2_000,
} as const;

export type Interview = {
  id: string;
  application_id: string;
  /** Interview category: what the Interview assesses. */
  category: InterviewCategory;
  /** Interview title: the job seeker's own name for it, never blank. */
  title: string;
  /** ISO timestamp, required (docs/adr/0005). */
  at: string;
  /** Interview notes, What they asked: the questions, one per line; null when there are none. */
  what_they_asked: string | null;
  /** Interview notes, How it went: free text; null when there is none. */
  how_it_went: string | null;
  /** Interview notes, Takeaway for next time: one short line; null when there is none. */
  takeaway: string | null;
  /** Prep notes: plain text the job seeker wrote to get ready for this Interview; null when there are none. */
  prep_notes: string | null;
  /** Participants: who the job seeker meets, in the order they listed them; empty for one from before Bigfoot recorded them. */
  participants: Participant[];
  /** Derived by the API: the date is in the past. */
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  company: string;
  title: string;
  posting_url: string | null;
  location: Location | null;
  /** Days a week in the office; only for a Hybrid Location, and optional then. */
  office_days: number | null;
  salary: string | null;
  /** ISO date, YYYY-MM-DD */
  applied_on: string;
  status: Status;
  /** Set exactly when the status is done. */
  outcome: Outcome | null;
  /**
   * Done date: ISO date (YYYY-MM-DD) the Application was marked Done, set then and cleared on
   * Reopen; null while In Progress and for one marked Done before Bigfoot recorded it.
   */
  done_on: string | null;
  /** Outcome note: what the company said when it ended; only while Done, and null when there is none. */
  outcome_note: string | null;
  /** Ordered by date. */
  interviews: Interview[];
  /** Derived by the API: In Progress with no upcoming Interview, including a new Application. */
  is_waiting: boolean;
  /** While waiting: an ISO timestamp (the last completed Interview) or an ISO date (applied). */
  waiting_since: string | null;
  /** A Sample Application Bigfoot created for a new job seeker; stays marked after edits. */
  is_sample: boolean;
  created_at: string;
  updated_at: string;
};

/** Fields the job seeker can edit on the Application itself; Interviews have their own API. */
export type ApplicationFields = Omit<
  Application,
  "id" | "interviews" | "is_waiting" | "waiting_since" | "is_sample" | "created_at" | "updated_at"
>;

/** What a form sends: `at` is null while no date and time has been given, and validation refuses it. */
export type InterviewFields = Pick<Interview, "category" | "title" | InterviewNotesField | "prep_notes"> & {
  at: string | null;
  participants: ParticipantInput[];
};

/** Whether an Interview has Interview notes: any of the three fields has text. */
export function hasInterviewNotes(interview: Pick<Interview, InterviewNotesField>): boolean {
  return INTERVIEW_NOTES_FIELDS.some((field) => Boolean(interview[field]?.trim()));
}

/** What they asked, as its questions: one per line, trimmed, blank lines dropped. */
export function questions(whatTheyAsked: string | null): string[] {
  return (whatTheyAsked ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

type Option = { label: string };

export const STATUS_OPTIONS: Record<Status, Option> = {
  in_progress: { label: "In Progress" },
  done: { label: "Done" },
};

export const LOCATION_OPTIONS: Record<Location, Option> = {
  in_office: { label: "In-Office" },
  remote: { label: "Remote" },
  hybrid: { label: "Hybrid" },
};

/** The Location as one line of text: "In-Office", "Remote", "Hybrid - 3x a Week", or null when unset. */
export function locationText({ location, office_days }: Pick<Application, "location" | "office_days">) {
  if (!location) return null;
  const label = LOCATION_OPTIONS[location].label;
  return location === "hybrid" && office_days ? `${label} - ${office_days}x a Week` : label;
}

export const OUTCOME_OPTIONS: Record<Outcome, Option> = {
  offer: { label: "Offer" },
  rejected: { label: "Rejected" },
  position_filled: { label: "Position Filled" },
  withdrawn: { label: "Withdrawn" },
  no_open_position: { label: "No Open Position" },
  not_the_right_fit: { label: "Not the Right Fit" },
};

export const INTERVIEW_CATEGORY_OPTIONS: Record<InterviewCategory, Option> = {
  recruiter: { label: "Recruiter" },
  hiring_manager: { label: "Hiring Manager" },
  technical: { label: "Technical" },
  system_design: { label: "System Design" },
  project_deep_dive: { label: "Project Deep-dive" },
  people_management: { label: "People Management" },
  project_delivery: { label: "Project Delivery" },
  collaboration: { label: "Collaboration" },
  culture: { label: "Culture" },
  decision_maker: { label: "Decision Maker" },
};

/**
 * "What this is:" on a Journey's next Interview (BIG-197): each Interview category in plain words
 * for a Viewer who doesn't know hiring jargon. Fixed text, without pronouns.
 */
export const INTERVIEW_CATEGORY_EXPLAINED: Record<InterviewCategory, string> = {
  recruiter: "a first conversation with the company’s recruiter, about the role and whether it’s a fit.",
  hiring_manager: "a conversation with the person this role reports to, about the work and how the team runs.",
  technical: "a hands-on session solving technical problems, often by writing code.",
  system_design: "designing a software system out loud, talking through the trade-offs.",
  project_deep_dive: "a close look at one past project: the decisions, the problems, and the results.",
  people_management: "questions about leading people: hiring, feedback, growth, and hard conversations.",
  project_delivery: "questions about getting projects done: planning, priorities, and surprises along the way.",
  collaboration: "questions about working with other people and teams, disagreements included.",
  culture: "a conversation about values and how the team works together.",
  decision_maker: "a conversation with a senior leader, often the one who makes the final call.",
};

/** An Interview category's name, which is also where a new Interview's title starts. */
export function categoryLabel(category: InterviewCategory): string {
  return INTERVIEW_CATEGORY_OPTIONS[category].label;
}

/**
 * The title after the category changes from `from` to `to`: it follows the category while it is
 * still the category's name (or blank), and stays as the job seeker wrote it once they've edited it.
 */
export function titleForCategory(title: string, from: InterviewCategory, to: InterviewCategory): string {
  return title.trim() === "" || title === categoryLabel(from) ? categoryLabel(to) : title;
}

export function isDone(app: Application) {
  return app.status === "done";
}

/** Interviews still ahead, soonest first. */
export function upcomingInterviews(app: Application): Interview[] {
  return app.interviews.filter((i) => !i.completed);
}

/** The soonest Interview still ahead, if any. */
export function nextInterview(app: Application): Interview | null {
  return upcomingInterviews(app)[0] ?? null;
}

/**
 * Round number (GLOSSARY.md, docs/adr/0007): the Interview's place among its Application's
 * Interviews by date, counting from 1, worked out on each read and never stored. Interviews at the
 * same time count in the order they were added, so deleting one renumbers the later ones. The
 * order is the API's (`at`, `created_at`, `id`, api/app/queries.py), applied here again so the
 * number doesn't depend on the list arriving sorted. 0 when the Interview isn't the Application's.
 */
export function roundNumber(app: Pick<Application, "interviews">, interview: Pick<Interview, "id">): number {
  const byDate = app.interviews.toSorted(
    (a, b) =>
      Date.parse(a.at) - Date.parse(b.at) ||
      Date.parse(a.created_at) - Date.parse(b.created_at) ||
      a.id.localeCompare(b.id),
  );
  return byDate.findIndex((i) => i.id === interview.id) + 1;
}

/** "Round 3 · Retrospective System Design": an Interview's title with its Round number before it. */
export function roundTitle(round: number, title: string): string {
  return `Round ${round} · ${title}`;
}

/** The latest completed Interview. */
export function lastCompletedInterview(app: Application): Interview | null {
  return app.interviews.findLast((i) => i.completed) ?? null;
}

/** The dashboard's counts: In Progress Applications, Offers, upcoming Interviews, and Applications waiting to hear back. */
export function getStats(apps: Application[]) {
  const open = apps.filter((a) => !isDone(a));
  return {
    inProgress: open.length,
    offers: apps.filter((a) => isDone(a) && a.outcome === "offer").length,
    upcoming: getUpcoming(apps).length,
    waiting: open.filter((a) => a.is_waiting).length,
  };
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** How far ahead the dashboard's summary line counts upcoming Interviews, in days. */
export const SUMMARY_DAYS = 14;

/** One count in the dashboard's summary line; `offers` shows in the success colour. */
export type SummaryCount = { id: "offers" | "interviews" | "waiting"; text: string };

/**
 * The line under the dashboard's heading (BIG-183), the counts that aren't zero, in order: Offers
 * to decide (Applications at Offer), upcoming Interviews of In Progress Applications in the next
 * 14 days from `now`, and Applications waiting to hear back. Empty when every count is zero.
 */
export function dashboardSummary(apps: Application[], now: Date): SummaryCount[] {
  const until = now.getTime() + SUMMARY_DAYS * 24 * 60 * 60 * 1000;
  const stats = getStats(apps);
  const soon = getUpcoming(apps).filter(({ interview }) => new Date(interview.at).getTime() <= until).length;
  const counts: [SummaryCount["id"], number, string, string][] = [
    ["offers", stats.offers, "Offer to decide", "Offers to decide"],
    ["interviews", soon, `Interview in the next ${SUMMARY_DAYS / 7} weeks`, `Interviews in the next ${SUMMARY_DAYS / 7} weeks`],
    ["waiting", stats.waiting, "waiting to hear back", "waiting to hear back"],
  ];
  return counts.filter(([, n]) => n > 0).map(([id, n, one, many]) => ({ id, text: count(n, one, many) }));
}

/** The dashboard's Next up: the soonest upcoming Interview of an In Progress Application, if any. */
export function nextUp(apps: Application[]): DatedInterview | null {
  return getUpcoming(apps)[0] ?? null;
}

export type DatedInterview = { application: Application; interview: Interview };

function dated(application: Application, interviews: Interview[]): DatedInterview[] {
  return interviews.map((interview) => ({ application, interview }));
}

/** Upcoming Interviews of open Applications, soonest first. */
export function getUpcoming(apps: Application[]): DatedInterview[] {
  return apps
    .filter((a) => !isDone(a))
    .flatMap((a) => dated(a, upcomingInterviews(a)))
    .toSorted((a, b) => a.interview.at.localeCompare(b.interview.at));
}

/**
 * The Interviews calendar's Interviews, by date: every one of open Applications, and the completed
 * ones of Done Applications (BIG-206). A Done Application's Interviews still to come never happen.
 */
export function getCalendarInterviews(apps: Application[]): DatedInterview[] {
  return apps
    .flatMap((a) => dated(a, isDone(a) ? a.interviews.filter((i) => i.completed) : a.interviews))
    .toSorted((a, b) => a.interview.at.localeCompare(b.interview.at));
}

export type ApplicationGroup = {
  id: "waiting" | "scheduled" | "offer" | "done";
  label: string;
  applications: Application[];
};

/** Done Applications that ended without an Offer: the Applications list's optional Done group. */
export function doneWithoutOffer(apps: Application[]): Application[] {
  return apps.filter((a) => isDone(a) && a.outcome !== "offer");
}

/**
 * The Applications list's groups: Waiting (In Progress, nothing upcoming), Interview scheduled
 * (In Progress, something upcoming) and Offer (Done with Outcome Offer). Other Done Applications
 * appear in a Done group only when showDone is set. Empty groups are left out.
 */
export function getApplicationGroups(apps: Application[], { showDone = false } = {}): ApplicationGroup[] {
  const open = apps.filter((a) => !isDone(a));
  const groups: ApplicationGroup[] = [
    { id: "waiting", label: "Waiting", applications: open.filter((a) => a.is_waiting) },
    { id: "scheduled", label: "Interview scheduled", applications: open.filter((a) => nextInterview(a)) },
    { id: "offer", label: "Offer", applications: apps.filter((a) => isDone(a) && a.outcome === "offer") },
    { id: "done", label: "Done", applications: showDone ? doneWithoutOffer(apps) : [] },
  ];
  return groups.filter((g) => g.applications.length > 0);
}

/**
 * The cache tag of one job seeker's Applications and their Interviews: the read the Dashboard and
 * the Application page share (`getApplications` in src/lib/api.ts). Every Server Action that
 * changes either, signing out and deleting the account expire it.
 */
export function applicationsTag(jobSeekerId: string) {
  return `applications:${jobSeekerId}`;
}

/** The Application page's Interviews (BIG-174): the next one, the others still ahead, and the completed ones, newest first. */
export type InterviewSections = { next: Interview | null; later: Interview[]; completed: Interview[] };

export function interviewSections(app: Application): InterviewSections {
  const [next = null, ...later] = upcomingInterviews(app);
  return { next, later, completed: app.interviews.filter((i) => i.completed).toReversed() };
}

/** The paragraphs of some notes: runs of text split by blank lines, trimmed. */
export function paragraphs(notes: string | null): string[] {
  return (notes ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * A Takeaway for next time shown on an upcoming Interview's prep (BIG-181), or, read the other way,
 * an upcoming Interview a completed one's takeaway shows on. `rule` says which rule linked them:
 * `same_application`, or `same_category`, the same Interview category at another Application.
 */
export type PrepTakeaway = {
  rule: "same_application" | "same_category";
  application: Pick<Application, "id" | "company">;
  interview: Interview;
  /** The Interview's Round number in its Application, for "Shows on Round 3 · …" (BIG-202). */
  round: number;
};

/** What an upcoming Interview's prep looks back at: the takeaways that apply, and They asked last time. */
export type PrepLookBack = {
  takeaways: PrepTakeaway[];
  /** What they asked at the same Application's latest completed Interview, when it has questions. */
  theyAsked: { from: Interview; questions: string[] } | null;
};

/** Whether an Interview counts as a source of takeaways: completed, with a Takeaway for next time. */
const hasTakeaway = (i: Interview) => i.completed && Boolean(i.takeaway?.trim());

/** The latest of some dated Interviews that pass `counts`, if any. */
function latest(candidates: DatedInterview[], counts: (i: Interview) => boolean): DatedInterview | null {
  return (
    candidates.filter(({ interview }) => counts(interview)).toSorted((a, b) => a.interview.at.localeCompare(b.interview.at)).at(-1) ??
    null
  );
}

/** What each rule found, in order, as PrepTakeaways carrying only the Application's id and company. */
function linked(own: DatedInterview | null | undefined, elsewhere: DatedInterview | null | undefined): PrepTakeaway[] {
  const rules = [
    { rule: "same_application" as const, match: own },
    { rule: "same_category" as const, match: elsewhere },
  ];
  return rules.flatMap(({ rule, match }) =>
    match
      ? [
          {
            rule,
            application: { id: match.application.id, company: match.application.company },
            interview: match.interview,
            round: roundNumber(match.application, match.interview),
          },
        ]
      : [],
  );
}

/** prepTakeaways, with what counts as having a takeaway given, so takeawayShowsOn can ask "if it had one". */
function findTakeaways(
  apps: Application[],
  app: Application,
  interview: Interview,
  counts: (i: Interview) => boolean,
): PrepTakeaway[] {
  const own = latest(dated(app, app.interviews), counts);
  const elsewhere = latest(
    apps.filter((a) => a.id !== app.id).flatMap((a) => dated(a, a.interviews.filter((i) => i.category === interview.category))),
    counts,
  );
  return linked(own, elsewhere);
}

/**
 * The takeaways an upcoming Interview's prep shows (BIG-181), at most two, nothing stored about
 * where a takeaway goes: first, from the latest completed Interview of the same Application that
 * has a Takeaway for next time; then, from the job seeker's latest completed Interview of the same
 * category at another Application, Done ones included (a lesson from a rejected Application is still a
 * lesson). The two rules never pick the same Interview, as the second looks only at other
 * Applications, so each takeaway shows once.
 */
export function prepTakeaways(apps: Application[], app: Application, interview: Interview): PrepTakeaway[] {
  return findTakeaways(apps, app, interview, hasTakeaway);
}

/** An upcoming Interview's look-back: its takeaways (prepTakeaways) and They asked last time. */
export function prepLookBack(apps: Application[], app: Application, interview: Interview): PrepLookBack {
  const from = lastCompletedInterview(app);
  const asked = questions(from?.what_they_asked ?? null);
  return {
    takeaways: prepTakeaways(apps, app, interview),
    theyAsked: from && asked.length > 0 ? { from, questions: asked } : null,
  };
}

/**
 * Where a completed Interview's Takeaway for next time shows (BIG-181), prepTakeaways read the
 * other way, as if it has one: the soonest upcoming Interview of its Application whose prep shows
 * it, and the soonest upcoming Interview of the same category at another In Progress Application whose
 * prep shows it. Empty for an upcoming Interview, and when neither exists yet or a later
 * takeaway shows instead.
 */
export function takeawayShowsOn(apps: Application[], app: Application, interview: Interview): PrepTakeaway[] {
  if (!interview.completed) return [];
  const counts = (i: Interview) => i.id === interview.id || hasTakeaway(i);
  const showsOn = (target: DatedInterview, rule: PrepTakeaway["rule"]) =>
    findTakeaways(apps, target.application, target.interview, counts).some(
      (t) => t.rule === rule && t.interview.id === interview.id,
    );
  const own = dated(app, upcomingInterviews(app)).find((target) => showsOn(target, "same_application"));
  const elsewhere = getUpcoming(apps).find(
    (target) =>
      target.application.id !== app.id && target.interview.category === interview.category && showsOn(target, "same_category"),
  );
  return linked(own, elsewhere);
}

/** The Takeaways for next time of an Application's Interviews, newest Interview first: what a Done one's Outcome card lists. */
export function takeaways(app: Application): { from: Interview; text: string }[] {
  return app.interviews
    .filter((i) => i.takeaway?.trim())
    .map((from) => ({ from, text: (from.takeaway ?? "").trim() }))
    .toReversed();
}

/**
 * How a Done Application got there, for its Outcome card: "After 2 Interviews, 27 days from
 * applying." It counts completed Interviews, and the days part needs a Done date.
 */
export function outcomeSummary(app: Pick<Application, "interviews" | "applied_on" | "done_on">): string {
  const completed = app.interviews.filter((i) => i.completed).length;
  const after = completed === 0 ? "Before any Interview" : `After ${count(completed, "Interview", "Interviews")}`;
  if (!app.done_on) return `${after}.`;
  const days = calendarDaysBetween(parseDay(app.applied_on), parseDay(app.done_on));
  return days === 0 ? `${after}, on the day you applied.` : `${after}, ${count(days, "day", "days")} from applying.`;
}

/** Whole calendar days from `from` to `to`, in the viewer's time zone: 0 on the same day, negative before it. */
export function calendarDaysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86_400_000);
}

/** A date-only value (YYYY-MM-DD) as that calendar day at local midnight, not UTC midnight; a timestamp as itself. */
export function parseDay(value: string): Date {
  return value.length === 10 ? new Date(`${value}T00:00`) : new Date(value);
}

/** "today", "yesterday", "in 2 days", "26 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export type Progress = { id: ApplicationGroup["id"]; label: string };

/**
 * Where an Application stands, as the Applications list groups it: Waiting, Interview scheduled,
 * Offer, or Done with its Outcome ("Done · Rejected").
 */
export function applicationProgress(app: Application): Progress {
  if (isDone(app)) {
    if (app.outcome === "offer") return { id: "offer", label: "Offer" };
    return { id: "done", label: app.outcome ? `Done · ${OUTCOME_OPTIONS[app.outcome].label}` : "Done" };
  }
  return nextInterview(app) ? { id: "scheduled", label: "Interview scheduled" } : { id: "waiting", label: "Waiting" };
}
