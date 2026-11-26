// Made-up Applications for the landing-page preview. The dashboard reads real data from the API.
// Upcoming Interviews are dated from `now`, so Next reads "Tomorrow" and "In 2 days". A page built
// ahead of time can't read the clock, so landing/hero-preview.tsx passes the visitor's today once hydrated.
import type { Application, InterviewCategory } from "@/lib/applications";

/** An Interview as its category and title, and who's in it as [role, name] (GLOSSARY.md, Participant). */
type Entry = [InterviewCategory, string, ([string, string | null][] | undefined)?];

/** 2:00 PM local time, `days` after `now`. */
function daysAhead(now: Date, days: number) {
  const at = new Date(now);
  at.setDate(at.getDate() + days);
  at.setHours(14, 0, 0, 0);
  return at.toISOString();
}

/** Past (completed) Interviews, and optionally an upcoming one, `nextIn` days from now. */
function sample(
  now: Date,
  id: string,
  company: string,
  title: string,
  options: {
    done?: Entry[];
    next?: Entry;
    nextIn?: number;
    offer?: boolean;
  } = {},
): Application {
  const interview = (
    [category, title, people = []]: Entry,
    i: number,
    completed: boolean,
  ) => ({
    id: `${id}-${i}`,
    application_id: id,
    category,
    title,
    at: completed
      ? `2026-11-0${i + 2}T17:00:00Z`
      : daysAhead(now, options.nextIn ?? 1),
    what_they_asked: null,
    how_it_went: null,
    takeaway: null,
    prep_notes: null,
    // The same role and name is the same Participant across an Application's Interviews.
    participants: people.map(([role, name]) => ({ id: `${id}-${role}-${name ?? ""}`, role, name })),
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

/** The sample Applications, their upcoming Interviews dated from `now`. */
export function previewApplications(now: Date = new Date()): Application[] {
  return [
    sample(now, "stripe", "Stripe", "Software Engineer II", {
      next: ["recruiter", "Recruiter Screen"],
      nextIn: 1,
    }),
    sample(now, "notion", "Notion", "Full-stack Engineer", {
      next: ["recruiter", "Recruiter Screen"],
      nextIn: 2,
    }),
    sample(now, "datadog", "Datadog", "Software Engineer", {
      done: [["recruiter", "Recruiter Screen", [["Recruiter", "Jordan Kim"]]]],
      next: ["technical", "Technical", [["Senior Engineer", "Priya Shah"], ["Engineering Manager", null]]],
      nextIn: 3,
    }),
    sample(now, "linear", "Linear", "Product Engineer", {
      done: [["hiring_manager", "Hiring Manager"]],
      next: ["technical", "Pair Programming"],
      nextIn: 6,
    }),
    sample(now, "figma", "Figma", "Senior Engineer", {
      done: [["technical", "Technical"]],
      next: ["system_design", "System Design"],
      nextIn: 9,
    }),
    sample(now, "ramp", "Ramp", "Staff Engineer", {
      done: [["hiring_manager", "Final Onsite"]],
      offer: true,
    }),
  ];
}
