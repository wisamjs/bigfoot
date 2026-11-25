// Made-up Applications for the landing-page preview. The dashboard reads real data from the API.
import type { Application, InterviewCategory } from "@/lib/applications";

/** An Interview as its category and title. */
type Entry = [InterviewCategory, string];

/** Past (completed) Interviews, and optionally an upcoming one. */
function sample(
  id: string,
  company: string,
  title: string,
  options: { done?: Entry[]; next?: Entry; offer?: boolean } = {},
): Application {
  const interview = ([category, title]: Entry, i: number, completed: boolean) => ({
    id: `${id}-${i}`,
    application_id: id,
    category,
    title,
    at: completed ? `2026-11-0${i + 2}T17:00:00Z` : "2099-01-01T17:00:00Z",
    what_they_asked: null,
    how_it_went: null,
    takeaway: null,
    prep_notes: null,
    completed,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  });
  const interviews = [
    ...(options.done ?? []).map((entry, i) => interview(entry, i, true)),
    ...(options.next ? [interview(options.next, 9, false)] : []),
  ];
  return {
    id,
    company,
    title,
    posting_url: null,
    location: null,
    office_days: null,
    salary: null,
    applied_on: "2026-11-01",
    status: options.offer ? "done" : "in_progress",
    outcome: options.offer ? "offer" : null,
    done_on: null,
    outcome_note: null,
    interviews,
    is_waiting: !options.offer && !options.next,
    waiting_since: !options.offer && !options.next ? "2026-11-01" : null,
    is_sample: false,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };
}

export const previewApplications: Application[] = [
  sample("stripe", "Stripe", "Software Engineer II", { next: ["recruiter", "Recruiter Screen"] }),
  sample("notion", "Notion", "Full-stack Engineer", { next: ["recruiter", "Recruiter Screen"] }),
  sample("datadog", "Datadog", "Software Engineer", { done: [["recruiter", "Recruiter Screen"]], next: ["technical", "Technical"] }),
  sample("linear", "Linear", "Product Engineer", { done: [["hiring_manager", "Hiring Manager"]], next: ["technical", "Pair Programming"] }),
  sample("figma", "Figma", "Senior Engineer", { done: [["technical", "Technical"]], next: ["system_design", "System Design"] }),
  sample("ramp", "Ramp", "Staff Engineer", { done: [["hiring_manager", "Final Onsite"]], offer: true }),
];
