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

/** Listed in the order they usually happen in a hiring process. */
export const INTERVIEW_KINDS = [
  "informal_chat",
  "recruiter_screen",
  "hiring_manager",
  "technical",
  "behavioural",
  "leadership",
  "onsite_loop",
  "ai_assisted_coding_challenge",
  "coding_challenge",
  "fe_system_design",
  "be_system_design",
  "technical_deep_dive",
  "cross_functional_interview",
  "strategy_and_values_alignment",
  "people_management",
] as const;
export type InterviewKind = (typeof INTERVIEW_KINDS)[number];

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
  kind: InterviewKind;
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
export type InterviewFields = Pick<Interview, "kind" | InterviewNotesField | "prep_notes"> & { at: string | null };

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

export const INTERVIEW_OPTIONS: Record<InterviewKind, Option> = {
  informal_chat: { label: "Informal Chat" },
  recruiter_screen: { label: "Recruiter Screen" },
  hiring_manager: { label: "Hiring Manager" },
  technical: { label: "Technical" },
  behavioural: { label: "Behavioural" },
  leadership: { label: "Leadership" },
  onsite_loop: { label: "Onsite Loop" },
  ai_assisted_coding_challenge: { label: "AI Assisted Coding Challenge" },
  coding_challenge: { label: "Coding Challenge" },
  fe_system_design: { label: "FE System Design" },
  be_system_design: { label: "BE System Design" },
  technical_deep_dive: { label: "Technical Deep-Dive" },
  cross_functional_interview: { label: "Cross-Functional Interview" },
  strategy_and_values_alignment: { label: "Strategy & Values Alignment" },
  people_management: { label: "People Management" },
};

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

/** The latest completed Interview. */
export function lastCompletedInterview(app: Application): Interview | null {
  return app.interviews.findLast((i) => i.completed) ?? null;
}

/** The dashboard's three numbers: Open, Active, and the Next Interview across In Progress Applications. */
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

/** The line under the dashboard's heading: "5 In Progress · 1 Offer · 4 upcoming Interviews", or "Nothing here yet." */
export function dashboardSummary(apps: Application[]): string {
  if (apps.length === 0) return "Nothing here yet.";
  const stats = getStats(apps);
  return [
    `${stats.inProgress} In Progress`,
    count(stats.offers, "Offer", "Offers"),
    count(stats.upcoming, "upcoming Interview", "upcoming Interviews"),
  ].join(" · ");
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

/** Every Interview of open Applications, past and upcoming, by date. Done Applications drop off. */
export function getCalendarInterviews(apps: Application[]): DatedInterview[] {
  return apps
    .filter((a) => !isDone(a))
    .flatMap((a) => dated(a, a.interviews))
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
 * One block of Interview notes as the Interview page reads them: a run of text, or a run of "- "
 * lines. Each block and item has an `id`, the number of the line it starts on, to key it by.
 */
export type NoteBlock =
  | { type: "text"; id: number; text: string }
  | { type: "list"; id: number; items: { id: number; text: string }[] };

/**
 * Interview notes as blocks for reading: lines starting "- " become a list, the other lines run
 * together as text, and a blank line ends a block. Nothing here changes what is stored.
 */
export function noteBlocks(notes: string | null): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  // The lines of the text block being gathered; a blank line, a list or the end closes it.
  let text: { id: number; lines: string[] } | null = null;
  const closeText = () => {
    if (text) blocks.push({ type: "text", id: text.id, text: text.lines.join("\n") });
    text = null;
  };
  for (const [id, raw] of (notes ?? "").split("\n").entries()) {
    const line = raw.trim();
    const bullet = /^- +(.*)$/.exec(line);
    if (!bullet) {
      if (!line) closeText();
      else if (text) text.lines.push(line);
      else text = { id, lines: [line] };
      continue;
    }
    closeText();
    const last = blocks.at(-1);
    if (last?.type === "list") last.items.push({ id, text: bullet[1] });
    else blocks.push({ type: "list", id, items: [{ id, text: bullet[1] }] });
  }
  closeText();
  return blocks;
}

/**
 * A Takeaway for next time shown on an upcoming Interview's prep (BIG-181), or, read the other way,
 * an upcoming Interview a completed one's takeaway shows on. `rule` says which rule linked them:
 * `same_application`, or `same_kind`, the same Interview kind at another Application.
 */
export type PrepTakeaway = {
  rule: "same_application" | "same_kind";
  application: Pick<Application, "id" | "company">;
  interview: Interview;
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
    { rule: "same_kind" as const, match: elsewhere },
  ];
  return rules.flatMap(({ rule, match }) =>
    match ? [{ rule, application: { id: match.application.id, company: match.application.company }, interview: match.interview }] : [],
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
    apps.filter((a) => a.id !== app.id).flatMap((a) => dated(a, a.interviews.filter((i) => i.kind === interview.kind))),
    counts,
  );
  return linked(own, elsewhere);
}

/**
 * The takeaways an upcoming Interview's prep shows (BIG-181), at most two, nothing stored about
 * where a takeaway goes: first, from the latest completed Interview of the same Application that
 * has a Takeaway for next time; then, from the job seeker's latest completed Interview of the same
 * kind at another Application, Done ones included (a lesson from a rejected Application is still a
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
 * it, and the soonest upcoming Interview of the same kind at another In Progress Application whose
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
      target.application.id !== app.id && target.interview.kind === interview.kind && showsOn(target, "same_kind"),
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
