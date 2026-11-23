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

/** The longest Interview notes the API stores, in characters. */
export const INTERVIEW_NOTES_MAX_LENGTH = 20_000;

/** The longest text each Application field stores, in characters; the API and database enforce them too. */
export const APPLICATION_MAX_LENGTHS = {
  company: 200,
  title: 200,
  salary: 100,
  posting_url: 2_048,
} as const;

export type Interview = {
  id: string;
  application_id: string;
  kind: InterviewKind;
  /** ISO timestamp, required (docs/adr/0005). */
  at: string;
  /** Interview notes: plain text the job seeker wrote about this Interview; null when there are none. */
  notes: string | null;
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
export type InterviewFields = Pick<Interview, "kind" | "notes"> & { at: string | null };

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
 * What the next Interview carries forward (BIG-174): the last paragraph of the Interview notes of
 * the latest completed Interview, where the job seeker usually writes what to do differently next
 * time. Null when there is no next Interview, or the last completed one has no notes.
 */
export function carriedForward(app: Application): { from: Interview; text: string } | null {
  if (!nextInterview(app)) return null;
  const from = lastCompletedInterview(app);
  const text = paragraphs(from?.notes ?? null).at(-1);
  return from && text ? { from, text } : null;
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
