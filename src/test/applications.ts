import type { Application, Interview } from "@/lib/applications";

// Builders for test Applications and Interviews: an In Progress, Waiting Application with no
// Interviews unless overridden. An Interview is completed, on a past date, unless overridden.

export function interview(id: string, overrides: Partial<Interview> = {}): Interview {
  return {
    id,
    application_id: "a",
    kind: "technical",
    at: "2026-11-01T15:00:00Z",
    notes: null,
    completed: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

export function application(id: string, overrides: Partial<Application> = {}): Application {
  return {
    id,
    company: id,
    title: "Engineer",
    posting_url: null,
    location: null,
    salary: null,
    applied_on: "2026-11-01",
    status: "in_progress",
    outcome: null,
    interviews: [],
    is_waiting: true,
    waiting_since: "2026-11-01",
    is_sample: false,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}
