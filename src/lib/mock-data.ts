// Made-up Applications for the landing-page preview. The dashboard reads real data from the API.
import type { Application, InterviewKind } from "@/lib/applications";

/** Past (completed) Interviews of the given kinds, and optionally an upcoming one. */
function sample(
  id: string,
  company: string,
  title: string,
  options: { done?: InterviewKind[]; next?: InterviewKind; offer?: boolean } = {},
): Application {
  const interview = (kind: InterviewKind, i: number, completed: boolean) => ({
    id: `${id}-${i}`,
    application_id: id,
    kind,
    at: completed ? `2026-11-0${i + 2}T17:00:00Z` : "2099-01-01T17:00:00Z",
    notes: null,
    completed,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  });
  const interviews = [
    ...(options.done ?? []).map((kind, i) => interview(kind, i, true)),
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
    interviews,
    is_waiting: !options.offer && !options.next,
    waiting_since: !options.offer && !options.next ? "2026-11-01" : null,
    is_sample: false,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };
}

export const previewApplications: Application[] = [
  sample("stripe", "Stripe", "Software Engineer II", { next: "recruiter_screen" }),
  sample("notion", "Notion", "Full-stack Engineer", { next: "recruiter_screen" }),
  sample("datadog", "Datadog", "Software Engineer", { done: ["recruiter_screen"], next: "technical" }),
  sample("linear", "Linear", "Product Engineer", { done: ["hiring_manager"], next: "technical" }),
  sample("figma", "Figma", "Senior Engineer", { done: ["technical"], next: "onsite_loop" }),
  sample("ramp", "Ramp", "Staff Engineer", { done: ["onsite_loop"], offer: true }),
];
