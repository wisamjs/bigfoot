import type { Tone } from "@/components/ui/badge";
import type { InterviewKind, Outcome, Status } from "@/lib/applications";

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

export const INTERVIEW_TONE: Record<InterviewKind, Tone> = {
  informal_chat: "purple",
  recruiter_screen: "purple",
  hiring_manager: "slate",
  technical: "blue",
  behavioural: "green",
  leadership: "yellow",
  onsite_loop: "red",
  ai_assisted_coding_challenge: "blue",
  coding_challenge: "blue",
  fe_system_design: "slate",
  be_system_design: "slate",
  technical_deep_dive: "blue",
  cross_functional_interview: "green",
  strategy_and_values_alignment: "yellow",
  people_management: "yellow",
};
