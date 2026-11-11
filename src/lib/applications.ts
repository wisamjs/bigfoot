// The Application domain (GLOSSARY.md): allowed values, display labels and colours, and the
// derived views (stats, board, upcoming) the dashboard and landing preview share.
// Allowed values mirror api/app/domain.py and the supabase/migrations check constraints.

import type { Tone } from "@/components/ui";

export const STAGES = [
  "in_progress",
  "offer",
  "rejected",
  "position_filled",
  "withdrawn",
  "no_open_position",
  "not_the_right_fit",
] as const;
export type Stage = (typeof STAGES)[number];

export const ROUNDS = [
  "informal_chat",
  "recruiter_screen",
  "hiring_manager",
  "technical",
  "behavioural",
  "leadership",
  "onsite_loop",
] as const;
export type Round = (typeof ROUNDS)[number];

/** Next round can also be Waiting (the company owes a reply) or Scheduled (booked, kind unknown). */
export const NEXT_ROUNDS = ["waiting", "scheduled", ...ROUNDS] as const;
export type NextRound = (typeof NEXT_ROUNDS)[number];

export type Application = {
  id: string;
  company: string;
  title: string;
  posting_url: string | null;
  location: string | null;
  salary: string | null;
  /** ISO date, YYYY-MM-DD */
  applied_on: string;
  stage: Stage;
  previous_round: Round | null;
  next_round: NextRound | null;
  /** ISO timestamp */
  next_round_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Fields the job seeker can edit. */
export type ApplicationFields = Omit<Application, "id" | "created_at" | "updated_at">;

type Option = { label: string; tone: Tone };

export const STAGE_OPTIONS: Record<Stage, Option> = {
  in_progress: { label: "In Progress", tone: "brand" },
  offer: { label: "Offer", tone: "dark" },
  rejected: { label: "Rejected", tone: "orange" },
  position_filled: { label: "Position Filled", tone: "green" },
  withdrawn: { label: "Withdrawn", tone: "blue" },
  no_open_position: { label: "No Open Position", tone: "yellow" },
  not_the_right_fit: { label: "Not the Right Fit", tone: "gray" },
};

// Listed in the order they usually happen in a hiring process.
export const ROUND_OPTIONS: Record<NextRound, Option> = {
  waiting: { label: "Waiting", tone: "gray" },
  scheduled: { label: "Scheduled", tone: "gray" },
  informal_chat: { label: "Informal Chat", tone: "purple" },
  recruiter_screen: { label: "Recruiter Screen", tone: "purple" },
  hiring_manager: { label: "Hiring Manager", tone: "slate" },
  technical: { label: "Technical", tone: "blue" },
  behavioural: { label: "Behavioural", tone: "green" },
  leadership: { label: "Leadership", tone: "yellow" },
  onsite_loop: { label: "Onsite Loop", tone: "red" },
};

export function isClosed(stage: Stage) {
  return stage !== "in_progress" && stage !== "offer";
}

function isRound(value: NextRound | null): value is Round {
  return value !== null && (ROUNDS as readonly string[]).includes(value);
}

export function getStats(apps: Application[]) {
  const responded = apps.filter(
    (a) =>
      a.previous_round !== null ||
      a.stage === "offer" ||
      (isClosed(a.stage) && a.stage !== "withdrawn"),
  );
  return {
    active: apps.filter((a) => !isClosed(a.stage)).length,
    interviewing: apps.filter(
      (a) => a.stage === "in_progress" && (a.previous_round !== null || isRound(a.next_round)),
    ).length,
    responseRate: apps.length ? Math.round((responded.length / apps.length) * 100) : 0,
    offers: apps.filter((a) => a.stage === "offer").length,
  };
}

/** Open Applications with a dated next round, soonest first. */
export function getUpcoming(apps: Application[]) {
  return apps
    .filter((a): a is Application & { next_round_at: string } => !isClosed(a.stage) && a.next_round_at !== null)
    .sort((a, b) => a.next_round_at.localeCompare(b.next_round_at));
}

export type BoardColumn = { id: NextRound | "unset" | "offer"; label: string; applications: Application[] };

/**
 * The Pipeline board: one column per Next round (in hiring-process order), then Offer.
 * Closed Applications stay off the board, and empty columns are left out.
 */
export function getBoardColumns(apps: Application[]): BoardColumn[] {
  const open = apps.filter((a) => a.stage === "in_progress");
  const columns: BoardColumn[] = [
    { id: "unset", label: "No next round", applications: open.filter((a) => a.next_round === null) },
    ...NEXT_ROUNDS.map((round) => ({
      id: round,
      label: ROUND_OPTIONS[round].label,
      applications: open.filter((a) => a.next_round === round),
    })),
    { id: "offer", label: "Offer", applications: apps.filter((a) => a.stage === "offer") },
  ];
  return columns.filter((c) => c.applications.length > 0);
}
