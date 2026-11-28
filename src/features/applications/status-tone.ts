import type { Tone } from "@/components/ui/badge";
import { isUnscheduled, type ApplicationGroup, type Interview, type InterviewCategory, type Outcome, type Status } from "@/lib/applications";

// The Badge colour for each value. The values and their labels live in lib/applications.ts;
// which colour a value shows is a presentation choice, so it lives here.

export const STATUS_TONE: Record<Status, Tone> = {
  in_progress: "brand",
  done: "gray",
};

export const OUTCOME_TONE: Record<Outcome, Tone> = {
  offer: "dark",
  rejected: "orange",
  position_filled: "green",
  withdrawn: "blue",
  no_open_position: "yellow",
  not_the_right_fit: "gray",
};

/** Each Interview category's colour, kept close to the kinds it replaced (docs/adr/0007). */
export const CATEGORY_TONE: Record<InterviewCategory, Tone> = {
  recruiter: "purple",
  hiring_manager: "slate",
  technical: "blue",
  system_design: "slate",
  project_deep_dive: "blue",
  people_management: "yellow",
  project_delivery: "orange",
  collaboration: "green",
  culture: "green",
  decision_maker: "yellow",
};

/**
 * The colour of a completed Interview's mark, on the strip and in the dashboard's Progress: green
 * while its Application is In Progress, grey once it is Done and the hiring process is over (BIG-177).
 */
export const COMPLETED_MARK: Record<Status, string> = {
  in_progress: "bg-fg-success-strong",
  done: "bg-tone-gray-fg",
};

/**
 * The colour of each Applications list group's label in Progress (BIG-195): Waiting in the warning
 * colour, Next round · date TBD neutral (BIG-221), Interview scheduled blue, Offer the success colour,
 * Done grey.
 */
export const GROUP_TONE: Record<ApplicationGroup["id"], Tone> = {
  waiting: "warning",
  unscheduled: "neutral",
  scheduled: "blue",
  offer: "success",
  done: "gray",
};

/** An Unscheduled Interview's mark: a dashed line in the brand colour (BIG-221). */
export const UNSCHEDULED_MARK = "bg-[repeating-linear-gradient(90deg,var(--brand)_0_6px,transparent_6px_10px)]";

/** The neutral pill of "Next round · date TBD" and "Upcoming · date TBD" (BIG-221): neither warning nor blue. */
export const UNSCHEDULED_PILL = { pill: "border-line-medium bg-card-strong text-heading", dot: "bg-body-subtle" };

/**
 * Each Interview's mark in Progress and on the strip: completed ones as COMPLETED_MARK says, an
 * Unscheduled one of an In Progress Application dashed (UNSCHEDULED_MARK), the next one in the brand
 * colour, the ones after it muted.
 */
export function interviewMark(interview: Interview, status: Status, next: boolean): string {
  if (interview.completed) return COMPLETED_MARK[status];
  if (isUnscheduled(interview) && status === "in_progress") return UNSCHEDULED_MARK;
  return next ? "bg-brand" : "bg-line-medium";
}
