import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { Application, InterviewKind, Location, Outcome } from "@/lib/applications";
import { previewApplications } from "@/lib/mock-data";
import { application, interview as testInterview } from "@/test/applications";
import { ApplicationList } from "./application-list";

// The dashboard's Applications for a job search a few weeks in.

const DAY = 24 * 60 * 60 * 1000;

/** An ISO timestamp `days` from now (negative is past), at 10:00 or 14:30 local time. */
function daysFromNow(days: number, afternoon = false) {
  const at = new Date(Date.now() + days * DAY);
  at.setHours(afternoon ? 14 : 10, afternoon ? 30 : 0, 0, 0);
  return at.toISOString();
}

type Plan = {
  location?: Location | null;
  /** Days in office, for a Hybrid Location. */
  officeDays?: number;
  appliedDaysAgo?: number;
  /** Completed Interviews, oldest first: their kind, and whether they have Interview notes. */
  done?: (InterviewKind | [InterviewKind, "notes"])[];
  /** Upcoming Interviews: their kind and how many days away. */
  next?: [InterviewKind, number][];
  outcome?: Outcome | null;
  sample?: boolean;
};

/** One Interview of the Application `id`. */
function interview(id: string, i: number, kind: InterviewKind, at: string, completed: boolean, notes = false) {
  return testInterview(`${id}-${i}`, {
    application_id: id,
    kind,
    at,
    completed,
    how_it_went: notes ? "Went well; asked about trade-offs." : null,
  });
}

/** Completed Interviews, spread evenly between the applied date and a few days ago. */
function completedInterviews(
  id: string,
  applied: number,
  done: NonNullable<Plan["done"]>,
) {
  return done.map((entry, i) => {
    const [kind, notes] = Array.isArray(entry) ? entry : [entry];
    const daysAgo = Math.round(
      applied - ((i + 1) * (applied - 2)) / (done.length + 1),
    );
    return interview(
      id,
      i,
      kind,
      daysFromNow(-daysAgo, i % 2 === 1),
      true,
      Boolean(notes),
    );
  });
}

const DEFAULT_PLAN = {
  location: "remote",
  done: [],
  next: [],
  outcome: null,
  sample: false,
} satisfies Plan;

/** One Application as the API returns it, with its derived fields worked out from the plan. */
function app(company: string, title: string, plan: Plan = {}): Application {
  const { location, officeDays, done, next, outcome, sample, appliedDaysAgo } =
    { ...DEFAULT_PLAN, ...plan };
  const id = company.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const applied = appliedDaysAgo ?? 7 + done.length * 7;
  const appliedOn = daysFromNow(-applied).slice(0, 10);
  const completed = completedInterviews(id, applied, done);
  const upcoming = next.map(([kind, days], i) =>
    interview(id, 10 + i, kind, daysFromNow(days, i % 2 === 0), false),
  );
  const isWaiting = !outcome && upcoming.length === 0;
  return application(id, {
    company,
    title,
    location,
    office_days: officeDays ?? null,
    applied_on: appliedOn,
    status: outcome ? "done" : "in_progress",
    outcome,
    interviews: [...completed, ...upcoming],
    is_waiting: isWaiting,
    waiting_since: isWaiting ? (completed.at(-1)?.at ?? appliedOn) : null,
    is_sample: sample,
  });
}

const HYBRID_2 = { location: "hybrid", officeDays: 2 } as const;
const HYBRID_3 = { location: "hybrid", officeDays: 3 } as const;

/** About thirty Applications: many waiting, most of the rest with Interviews booked, two Offers, and Done ones. */
const jobSearch: Application[] = [
  // Waiting: just applied, or heard nothing since the last Interview.
  app("Stripe", "Software Engineer II", {
    ...HYBRID_2,
    appliedDaysAgo: 14,
  }),
  app("Shopify", "Senior Developer", {
    ...HYBRID_3,
    done: [["recruiter_screen", "notes"]],
  }),
  app("Wealthsimple", "Senior Full-stack Developer", {
    location: "in_office",
    appliedDaysAgo: 3,
  }),
  app("Cohere", "Member of Technical Staff, Frontend", {
    ...HYBRID_3,
    appliedDaysAgo: 9,
  }),
  app("Lightspeed Commerce", "Software Developer", {
    location: "in_office",
    appliedDaysAgo: 21,
  }),
  app("Clio", "Senior Software Developer, Platform", {
    location: "in_office",
    done: ["recruiter_screen", "hiring_manager"],
  }),
  app("1Password", "Developer, Web Experience", { appliedDaysAgo: 1 }),
  app("Faire", "Software Engineer, Growth", {
    location: null,
    appliedDaysAgo: 30,
  }),
  app("Hootsuite", "Intermediate Frontend Developer", {
    ...HYBRID_2,
  }),

  // Interview scheduled: one or more upcoming, some far along.
  app("Notion", "Full-stack Engineer", { next: [["recruiter_screen", 1]] }),
  app("Datadog", "Software Engineer", {
    ...HYBRID_2,
    done: [["recruiter_screen", "notes"]],
    next: [["technical", 2]],
  }),
  app("Figma", "Senior Engineer", {
    ...HYBRID_3,
    done: [
      ["recruiter_screen", "notes"],
      "hiring_manager",
      ["technical", "notes"],
    ],
    next: [["onsite_loop", 4]],
  }),
  app("Linear", "Product Engineer", {
    done: [
      "informal_chat",
      "recruiter_screen",
      ["technical", "notes"],
      "fe_system_design",
    ],
    next: [["behavioural", 3]],
  }),
  app("Airtable", "Frontend Engineer", {
    ...HYBRID_2,
    done: ["recruiter_screen"],
    next: [["hiring_manager", 5]],
  }),
  app("Asana", "Software Engineer", {
    ...HYBRID_3,
    done: [
      "recruiter_screen",
      "hiring_manager",
      "coding_challenge",
      "technical",
      "fe_system_design",
      "behavioural",
    ],
    next: [
      ["technical", 6],
      ["leadership", 6],
    ],
  }),
  app("Okta", "Engineering Manager", {
    done: [
      ["recruiter_screen", "notes"],
      "hiring_manager",
      "people_management",
      ["be_system_design", "notes"],
      "leadership",
    ],
    next: [
      ["cross_functional_interview", 8],
      ["be_system_design", 10],
    ],
  }),
  app("Vercel", "Senior Software Engineer, Next.js", {
    done: ["recruiter_screen", ["ai_assisted_coding_challenge", "notes"]],
    next: [["technical_deep_dive", 2]],
  }),
  app("Ada", "Staff Frontend Engineer", {
    location: "in_office",
    done: ["recruiter_screen"],
    next: [
      ["fe_system_design", 7],
      ["strategy_and_values_alignment", 9],
      ["hiring_manager", 12],
    ],
  }),
  app("Benevity", "Software Developer II", {
    location: "in_office",
    next: [["informal_chat", 0]],
  }),
  app("Thinkific", "Senior Developer", {
    location: "in_office",
    done: ["recruiter_screen"],
    next: [["coding_challenge", 15]],
  }),

  // Offers, waiting on the job seeker's answer.
  app("Ramp", "Staff Engineer", {
    done: [
      "recruiter_screen",
      "hiring_manager",
      "technical",
      "be_system_design",
      "onsite_loop",
      "leadership",
    ],
    outcome: "offer",
  }),
  app("Wave", "Senior Software Engineer", {
    ...HYBRID_2,
    done: ["recruiter_screen", ["technical", "notes"], "behavioural"],
    outcome: "offer",
  }),

  // Done without an Offer: shown with "Show done".
  app("Atlassian", "Senior Frontend Engineer", {
    done: ["recruiter_screen", "technical"],
    outcome: "rejected",
  }),
  app("Slack", "Software Engineer", {
    ...HYBRID_3,
    done: ["recruiter_screen"],
    outcome: "position_filled",
  }),
  app("Twilio", "Frontend Engineer", {
    location: null,
    outcome: "no_open_position",
  }),
  app("Dropbox", "Senior Engineer", {
    done: ["recruiter_screen", "hiring_manager"],
    outcome: "withdrawn",
  }),
  app("Coinbase", "Software Engineer, Payments", {
    done: [["informal_chat", "notes"]],
    outcome: "not_the_right_fit",
  }),
  app("Instacart", "Senior Software Engineer", {
    location: "in_office",
    done: ["recruiter_screen", "onsite_loop"],
    outcome: "rejected",
  }),
];

const meta = {
  component: ApplicationList,
  args: { applications: jobSearch, linked: true },
  // A page around the list, as wide as the dashboard's: the menus open inside its main landmark.
  decorators: [(Story) => <main className="max-w-6xl">{Story()}</main>],
} satisfies Meta<typeof ApplicationList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A job search a few weeks in: one table, ordered by what each Application is waiting on. An In
 * Progress row marks each completed Interview in green.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(progressMarks(canvasElement, "Clio")).not.toHaveLength(0);
    await expect(progressMarks(canvasElement, "Clio").every((mark) => mark.classList.contains("bg-fg-success-strong"))).toBe(true);
  },
};

/**
 * With "Show done" on, the Done Applications follow, each showing its Outcome, their completed
 * Interviews marked in grey: the hiring process is over.
 */
export const ShowDone: Story = {
  args: { showDone: true },
  play: async ({ canvasElement }) => {
    await expect(progressMarks(canvasElement, "Instacart")).not.toHaveLength(0);
    await expect(progressMarks(canvasElement, "Instacart").every((mark) => mark.classList.contains("bg-tone-gray-fg"))).toBe(true);
  },
};

/** A row's completed-Interview marks in its Progress. */
function progressMarks(canvasElement: HTMLElement, company: string) {
  const row = canvasElement.querySelector(`tr[data-application-id="${company.toLowerCase()}"]`);
  return [...(row?.querySelectorAll("span.rounded-full") ?? [])];
}

/** A new job seeker's first few Applications. */
export const Few: Story = {
  args: {
    applications: jobSearch.filter((a) =>
      ["stripe", "notion", "ramp"].includes(a.id),
    ),
  },
};

export const Empty: Story = { args: { applications: [] } };

/** Sample Applications, which a new job seeker starts with, carry a Sample badge. */
export const Sample: Story = {
  args: {
    applications: previewApplications.map((a) => ({ ...a, is_sample: true })),
  },
};

/** Each linked row ends in a quiet chevron, and the whole row opens the Application. */
export const RowsOpenTheApplication: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
    await expect(canvas.getAllByRole("link", { name: /^Open Stripe/ })).toHaveLength(1);
  },
};

/** The landing page's decorative copy: hidden from screen readers, not interactive. */
export const Decorative: Story = {
  args: { applications: previewApplications, linked: false, decorative: true },
};
