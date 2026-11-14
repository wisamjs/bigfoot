// The Application domain (GLOSSARY.md): allowed values, display labels and colours, and the
// derived views (stats, board, upcoming) the dashboard and landing preview share.
// Allowed values mirror api/app/domain.py and the supabase/migrations check constraints.

import type { Tone } from "@/components/ui";

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

export type Interview = {
  id: string;
  application_id: string;
  kind: InterviewKind;
  /** ISO timestamp; null when the Interview has no date, which counts as completed. */
  at: string | null;
  /** Derived by the API: the date is in the past, or there is no date. */
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
  /** Ordered by date, undated first. */
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

export type InterviewFields = Pick<Interview, "kind" | "at">;

type Option = { label: string; tone: Tone };

export const STATUS_OPTIONS: Record<Status, Option> = {
  in_progress: { label: "In Progress", tone: "brand" },
  done: { label: "Done", tone: "gray" },
};

export const OUTCOME_OPTIONS: Record<Outcome, Option> = {
  offer: { label: "Offer", tone: "dark" },
  rejected: { label: "Rejected", tone: "orange" },
  position_filled: { label: "Position Filled", tone: "green" },
  withdrawn: { label: "Withdrawn", tone: "blue" },
  no_open_position: { label: "No Open Position", tone: "yellow" },
  not_the_right_fit: { label: "Not the Right Fit", tone: "gray" },
};

export const INTERVIEW_OPTIONS: Record<InterviewKind, Option> = {
  informal_chat: { label: "Informal Chat", tone: "purple" },
  recruiter_screen: { label: "Recruiter Screen", tone: "purple" },
  hiring_manager: { label: "Hiring Manager", tone: "slate" },
  technical: { label: "Technical", tone: "blue" },
  behavioural: { label: "Behavioural", tone: "green" },
  leadership: { label: "Leadership", tone: "yellow" },
  onsite_loop: { label: "Onsite Loop", tone: "red" },
  ai_assisted_coding_challenge: { label: "AI Assisted Coding Challenge", tone: "blue" },
  coding_challenge: { label: "Coding Challenge", tone: "blue" },
  fe_system_design: { label: "FE System Design", tone: "slate" },
  be_system_design: { label: "BE System Design", tone: "slate" },
  technical_deep_dive: { label: "Technical Deep-Dive", tone: "blue" },
  cross_functional_interview: { label: "Cross-Functional Interview", tone: "green" },
  strategy_and_values_alignment: { label: "Strategy & Values Alignment", tone: "yellow" },
  people_management: { label: "People Management", tone: "yellow" },
};

export const WAITING_OPTION: Option = { label: "Waiting", tone: "gray" };

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

/** The latest completed Interview, by date (undated ones come first, so they lose to dated ones). */
export function lastCompletedInterview(app: Application): Interview | null {
  return app.interviews.filter((i) => i.completed).at(-1) ?? null;
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

/** Upcoming Interviews of open Applications, soonest first. */
export function getUpcoming(apps: Application[]): DatedInterview[] {
  return apps
    .filter((a) => !isDone(a))
    .flatMap((application) =>
      upcomingInterviews(application).map((interview) => ({ application, interview: interview as DatedInterview["interview"] })),
    )
    .sort((a, b) => a.interview.at.localeCompare(b.interview.at));
}

export type BoardColumn = { id: InterviewKind | "waiting" | "offer"; label: string; applications: Application[] };

/**
 * The Pipeline board: one column per upcoming Interview kind (in hiring-process order), Waiting
 * for Applications with nothing upcoming, then Offer. Done Applications other than an Offer stay
 * off the board, and empty columns are left out. BIG-47 rebuilds the board around Waiting.
 */
export function getBoardColumns(apps: Application[]): BoardColumn[] {
  const open = apps.filter((a) => !isDone(a));
  const columns: BoardColumn[] = [
    { id: "waiting", label: "Waiting", applications: open.filter((a) => a.is_waiting) },
    ...INTERVIEW_KINDS.map((kind) => ({
      id: kind,
      label: INTERVIEW_OPTIONS[kind].label,
      applications: open.filter((a) => nextInterview(a)?.kind === kind),
    })),
    { id: "offer", label: "Offer", applications: apps.filter((a) => a.outcome === "offer") },
  ];
  return columns.filter((c) => c.applications.length > 0);
}
