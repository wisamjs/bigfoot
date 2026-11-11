// Sample Applications for the landing-page preview. The dashboard reads real data from the API.
import type { Application } from "@/lib/applications";

function sample(
  id: string,
  fields: Pick<Application, "company" | "title" | "stage" | "previous_round" | "next_round">,
): Application {
  return {
    id,
    posting_url: null,
    location: null,
    salary: null,
    applied_on: "2026-11-01",
    next_round_at: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...fields,
  };
}

export const previewApplications: Application[] = [
  sample("stripe", { company: "Stripe", title: "Software Engineer II", stage: "in_progress", previous_round: null, next_round: "recruiter_screen" }),
  sample("notion", { company: "Notion", title: "Full-stack Engineer", stage: "in_progress", previous_round: null, next_round: "recruiter_screen" }),
  sample("datadog", { company: "Datadog", title: "Software Engineer", stage: "in_progress", previous_round: "recruiter_screen", next_round: "technical" }),
  sample("linear", { company: "Linear", title: "Product Engineer", stage: "in_progress", previous_round: "hiring_manager", next_round: "technical" }),
  sample("figma", { company: "Figma", title: "Senior Engineer", stage: "in_progress", previous_round: "technical", next_round: "onsite_loop" }),
  sample("ramp", { company: "Ramp", title: "Staff Engineer", stage: "offer", previous_round: "onsite_loop", next_round: null }),
];
