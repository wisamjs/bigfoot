import type { StoryObj } from "@storybook/nextjs-vite";
import type { AccessToken, ShareLink } from "@/lib/api";
import { isDone, type Application, type Interview } from "@/lib/applications";
import type { CurrentUser } from "@/lib/current-user";
import type { Journey } from "@/lib/journey";
import { previewApplications } from "@/lib/mock-data";
import { application, interview } from "@/test/applications";

// The Pages stories' data (BIG-203): one job seeker's search, seen on every page at one fixed
// "today", Wednesday 18 November 2026 at 9:30 in the viewer's time zone. `PAGE` makes a story run
// at that time (.storybook/fixed-now.ts), so "Today", "Tomorrow" and the calendar's month never
// drift. The companies are the ones the feature stories use.

const YEAR = 2026;
const MONTH = 10; // November
const DAY = 18;

/** Today, 9:30 local time. */
export const NOW = new Date(YEAR, MONTH, DAY, 9, 30);

/** `days` from today at `hour`:`minute` local time, as an ISO timestamp; negative is past. */
export function on(days: number, hour: number, minute = 0) {
  return new Date(YEAR, MONTH, DAY + days, hour, minute).toISOString();
}

/** `days` from today as a local YYYY-MM-DD date. */
export function dayOf(days: number) {
  const date = new Date(YEAR, MONTH, DAY + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Full-page stories at the fixed today, without the docs page. A page has its landmarks and one
 * <h1>, so axe checks those too, as scripts/a11y.mjs does on the running app.
 */
export const PAGE = {
  parameters: { layout: "fullscreen", now: NOW.toISOString(), a11y: {
      config: {
        rules: ["region", "landmark-one-main", "page-has-heading-one"].map((id) => ({ id, enabled: true })),
      },
    },
  },
  tags: ["!autodocs"],
};

/** A story at a laptop's width, 1280px. */
export const DESKTOP = { globals: { viewport: { value: "desktop", isRotated: false } } } satisfies StoryObj;
/** A story at a phone's width, 414px. */
export const MOBILE = { globals: { viewport: { value: "mobile2", isRotated: false } } } satisfies StoryObj;
/** A story at the narrowest phone's width, 320px. */
export const NARROW = { globals: { viewport: { value: "mobile1", isRotated: false } } } satisfies StoryObj;

export const user: CurrentUser = {
  id: "u1",
  name: "Alex Morgan",
  firstName: "Alex",
  email: "alex.morgan@example.com",
  image: null,
};

/** An Interview of `app` `days` from today; completed when that is before 9:30 today. */
function round(app: string, id: string, fields: Partial<Interview> & Pick<Interview, "category" | "title">, days: number, hour: number) {
  const at = on(days, hour);
  return interview(`${app}-${id}`, { application_id: app, at, completed: Date.parse(at) < NOW.getTime(), ...fields });
}

/** An In Progress Application; Waiting when nothing is ahead. */
function inProgress(id: string, fields: Partial<Application> & Pick<Application, "company" | "title">): Application {
  const interviews = fields.interviews ?? [];
  const waiting = interviews.every((i) => i.completed);
  return application(id, {
    applied_on: dayOf(-30),
    is_waiting: waiting,
    waiting_since: waiting ? (interviews.at(-1)?.at ?? fields.applied_on ?? dayOf(-30)) : null,
    ...fields,
    interviews,
  });
}

/** A Done Application with `outcome`, ended `daysAgo`. */
function done(id: string, outcome: NonNullable<Application["outcome"]>, daysAgo: number, fields: Partial<Application> & Pick<Application, "company" | "title">) {
  return application(id, {
    applied_on: dayOf(-40),
    status: "done",
    outcome,
    done_on: dayOf(-daysAgo),
    is_waiting: false,
    waiting_since: null,
    ...fields,
  });
}

/** Rounds ahead, rounds behind, Prep notes, Interview notes and a takeaway: the Application page's fullest. */
export const lumen = inProgress("lumen", {
  company: "Lumen Bio",
  title: "Engineering Manager, ML Platform",
  location: "hybrid",
  office_days: 3,
  salary: "$210k–$240k",
  posting_url: "https://lumenbio.example/careers/em-ml-platform",
  applied_on: dayOf(-26),
  interviews: [
    round("lumen", "screen", {
      category: "recruiter",
      title: "Recruiter Screen",
      how_it_went:
        "Quick walkthrough of my last team and how I ran quarterly planning. Two squads, 11 engineers, reporting to the Director of Platform. Band lines up with what I asked for.\n\nNext: hiring manager.",
    }, -17, 10),
    round("lumen", "manager", {
      category: "hiring_manager",
      title: "Hiring Manager",
      what_they_asked:
        "Tell me about a time you had to let someone go.\nHow do you decide what your team does not build?\nWhat does a good first 90 days look like here?",
      how_it_went:
        "Dug into how I handle underperformance and how I split time between hands-on work and people work. The incident story landed well.\n\nRambled on the roadmap question. Next time: lead with the decision, then the trade-off.",
      takeaway: "Lead with the decision, then the trade-off, then what I would measure.",
    }, -10, 11),
    round("lumen", "deep-dive", {
      category: "project_deep_dive",
      title: "Technical Deep-Dive",
      prep_notes: "Pick the feature-store migration.\nDraw the before and after first.\nHave numbers ready: latency, cost, on-call pages.",
    }, 2, 11),
    round("lumen", "leadership", { category: "people_management", title: "Leadership" }, 9, 13),
  ],
});

/** An Interview this afternoon: the dashboard's Next up. */
export const tilth = inProgress("tilth", {
  company: "Tilth Agritech",
  title: "Head of Engineering",
  location: "remote",
  applied_on: dayOf(-12),
  interviews: [round("tilth", "manager", { category: "hiring_manager", title: "Hiring Manager" }, 0, 14)],
});

/** A Round behind with no notes, and one ahead with nothing written yet. */
export const northwind = inProgress("northwind", {
  company: "Northwind Labs",
  title: "Engineering Manager, Data Products",
  location: "in_office",
  applied_on: dayOf(-20),
  interviews: [
    round("northwind", "screen", { category: "recruiter", title: "Recruiter Screen" }, -12, 10),
    round("northwind", "onsite", { category: "decision_maker", title: "Onsite Loop" }, 11, 9),
  ],
});

/** Waiting to hear back since its one Interview. */
export const fernway = inProgress("fernway", {
  company: "Fernway Health",
  title: "Engineering Manager, Platform",
  applied_on: dayOf(-21),
  interviews: [
    round("fernway", "screen", {
      category: "recruiter",
      title: "Recruiter Screen",
      how_it_went: "Friendly. They are hiring two managers this quarter.",
    }, -13, 15),
  ],
});

/** Applied this week, no Interview yet. */
export const quillon = inProgress("quillon", {
  company: "Quillon Learning",
  title: "Senior Engineering Manager",
  location: "remote",
  salary: "$190k",
  posting_url: "https://quillon.example/jobs/1",
  applied_on: dayOf(-5),
});

/** An Offer to decide, from yesterday. */
export const cobalt = done("cobalt", "offer", 1, {
  company: "Cobalt Genomics",
  title: "Engineering Manager, Web",
  salary: "$225k",
  outcome_note: "Offer letter by Friday. Start date flexible.",
  interviews: [
    round("cobalt", "screen", { category: "recruiter", title: "Recruiter" }, -20, 10),
    round("cobalt", "manager", { category: "hiring_manager", title: "Hiring Manager" }, -15, 13),
    round("cobalt", "design", { category: "system_design", title: "System Design" }, -10, 11),
    round("cobalt", "leadership", {
      category: "people_management",
      title: "Leadership",
      how_it_went: "Long talk about growing leads. They want someone to build the managers’ bench.",
      takeaway: "Bring one story about growing a lead into a manager.",
    }, -6, 14),
  ],
});

/** Rejected, with an Outcome note; its Deep-Dive takeaway shows before Lumen Bio's. */
export const brightwater = done("brightwater", "rejected", 3, {
  company: "Brightwater Data",
  title: "Director of Engineering",
  outcome_note: "They went with an internal candidate.",
  interviews: [
    round("brightwater", "screen", { category: "recruiter", title: "Recruiter Screen" }, -32, 10),
    round("brightwater", "deep-dive", {
      category: "project_deep_dive",
      title: "Technical Deep-Dive",
      what_they_asked: "Walk us through the riskiest migration you led.\nWhat would you do differently?",
      how_it_went: "Talked too long before drawing anything. They lost the thread halfway.",
      takeaway: "Draw the system before talking through it.",
    }, -24, 14),
  ],
});

/** Withdrawn after the first call. */
export const plinth = done("plinth", "withdrawn", 8, {
  company: "Plinth Systems",
  title: "Engineering Manager",
  interviews: [round("plinth", "screen", { category: "recruiter", title: "Recruiter Screen" }, -14, 12)],
});

/** Everything at once: Waiting, Interviewing, an Offer, and Done ones. */
export const applications = [lumen, tilth, northwind, fernway, quillon, cobalt, brightwater, plinth];

/** A new job seeker's Sample Applications, as onboarding adds them. */
export const samples = previewApplications(NOW).map((sample) => ({ ...sample, is_sample: true }));

/**
 * The Journey a Viewer of Alex's Share link sees: In Progress Applications and Offers, and when the
 * other Done Applications' Interviews happened; nothing private.
 */
export const journey: Journey = {
  shared_by: user.name,
  applications: applications
    .filter((a) => !isDone(a) || a.outcome === "offer")
    .toSorted((a, b) => a.applied_on.localeCompare(b.applied_on))
    .map((a) => ({
      company: a.company,
      title: a.title,
      applied_on: a.applied_on,
      offer: a.outcome === "offer",
      is_waiting: a.is_waiting,
      waiting_since: a.waiting_since,
      interviews: a.interviews.map(({ category, title, at, completed }) => ({ category, title, at, completed })),
    })),
  // The other Done Applications give only when their completed Interviews happened (BIG-206).
  other_completed_interviews: applications
    .filter((a) => isDone(a) && a.outcome !== "offer")
    .flatMap((a) => a.interviews.filter((i) => i.completed).map((i) => i.at))
    .toSorted(),
};

export const SHARE_LINK_ID = "k7Qm2x9PaB";

export const shareLinks: ShareLink[] = [
  {
    id: SHARE_LINK_ID,
    label: "Mom & Dad",
    created_at: on(-4, 20),
    passcode_set_at: on(-4, 20),
    expires_at: on(3, 20),
    last_opened_at: on(0, 8, 12),
    expired: false,
  },
  {
    id: "Hw3tB8rLzQ",
    label: "Career coach",
    created_at: on(-1, 16),
    passcode_set_at: on(-1, 16),
    expires_at: on(6, 16),
    last_opened_at: null,
    expired: false,
  },
  {
    id: "Pz4nV1cXeR",
    label: "Old flatmate",
    created_at: on(-12, 18),
    passcode_set_at: on(-12, 18),
    expires_at: on(-5, 18),
    last_opened_at: on(-9, 21),
    expired: true,
  },
];

export const accessTokens: AccessToken[] = [
  {
    id: "t1",
    name: "Calendar cron job",
    created_at: "2026-09-02T15:00:00Z",
    last_used_at: on(0, 7, 5),
    expires_at: "2027-09-02T15:00:00Z",
    expired: false,
  },
  {
    id: "t2",
    name: "Laptop script",
    created_at: "2025-10-01T15:00:00Z",
    last_used_at: null,
    expires_at: "2026-10-01T15:00:00Z",
    expired: true,
  },
];

export const API_URL = "https://api.bigfoot.example";
