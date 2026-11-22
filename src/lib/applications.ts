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
  location: 200,
  salary: 100,
  posting_url: 2_048,
} as const;

export type Interview = {
  id: string;
  application_id: string;
  kind: InterviewKind;
  /**
   * ISO timestamp, required (docs/adr/0005). Null only on an Interview saved before it was: that
   * shows "Date needed", counts as completed, and can't be changed without setting a date.
   */
  at: string | null;
  /** Interview notes: plain text the job seeker wrote about this Interview; null when there are none. */
  notes: string | null;
  /** Derived by the API: the date is in the past (or there is none yet, so nothing looks further along). */
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  company: string;
  title: string;
  posting_url: string | null;
  location: string | null;
  salary: string | null;
  /** ISO date, YYYY-MM-DD */
  applied_on: string;
  status: Status;
  /** Set exactly when the status is done. */
  outcome: Outcome | null;
  /** Ordered by date; any with no date yet come last. */
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

export type InterviewFields = Pick<Interview, "kind" | "at" | "notes">;

type Option = { label: string };

export const STATUS_OPTIONS: Record<Status, Option> = {
  in_progress: { label: "In Progress" },
  done: { label: "Done" },
};

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

/** The latest completed Interview with a date; one with no date yet has no place by date. */
export function lastCompletedInterview(app: Application): Interview | null {
  return app.interviews.findLast((i) => i.completed && i.at !== null) ?? null;
}

/** The dashboard's three numbers: Open, Active, and the Next Interview across In Progress Applications. */
export function getStats(apps: Application[]) {
  const open = apps.filter((a) => !isDone(a));
  return {
    open: open.length,
    active: open.filter((a) => nextInterview(a) !== null).length,
    next: getUpcoming(apps)[0] ?? null,
  };
}

export type DatedInterview = { application: Application; interview: Interview & { at: string } };

function dated(application: Application, interviews: Interview[]): DatedInterview[] {
  return interviews.map((interview) => ({ application, interview: interview as DatedInterview["interview"] }));
}

/** Upcoming Interviews of open Applications, soonest first. */
export function getUpcoming(apps: Application[]): DatedInterview[] {
  return apps
    .filter((a) => !isDone(a))
    .flatMap((a) => dated(a, upcomingInterviews(a)))
    .toSorted((a, b) => a.interview.at.localeCompare(b.interview.at));
}

/** Every dated Interview of open Applications, past and upcoming, by date. Done Applications drop off. */
export function getCalendarInterviews(apps: Application[]): DatedInterview[] {
  return apps
    .filter((a) => !isDone(a))
    .flatMap((a) => dated(a, a.interviews.filter((i) => i.at !== null)))
    .toSorted((a, b) => a.interview.at.localeCompare(b.interview.at));
}

export type BoardColumn = {
  id: "waiting" | "scheduled" | "offer" | "done";
  label: string;
  applications: Application[];
};

/** Done Applications that ended without an Offer: the board's optional Done column. */
export function doneWithoutOffer(apps: Application[]): Application[] {
  return apps.filter((a) => isDone(a) && a.outcome !== "offer");
}

/**
 * The Pipeline board: Waiting (In Progress, nothing upcoming), Interview scheduled (In Progress,
 * something upcoming) and Offer (Done with Outcome Offer). Other Done Applications appear in a
 * Done column only when showDone is set. Empty columns are left out.
 */
export function getBoardColumns(apps: Application[], { showDone = false } = {}): BoardColumn[] {
  const open = apps.filter((a) => !isDone(a));
  const columns: BoardColumn[] = [
    { id: "waiting", label: "Waiting", applications: open.filter((a) => a.is_waiting) },
    { id: "scheduled", label: "Interview scheduled", applications: open.filter((a) => nextInterview(a)) },
    { id: "offer", label: "Offer", applications: apps.filter((a) => isDone(a) && a.outcome === "offer") },
    { id: "done", label: "Done", applications: showDone ? doneWithoutOffer(apps) : [] },
  ];
  return columns.filter((c) => c.applications.length > 0);
}
