import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor } from "storybook/test";
import { updateApplicationAction } from "@/app/applications/actions";
import type { Application, InterviewKind, Outcome } from "@/lib/applications";
import { previewApplications } from "@/lib/mock-data";
import { application, interview as testInterview } from "@/test/applications";
import { ApplicationList } from "./application-list";

// The dashboard's Applications for a job search a few weeks in. Server Actions are mocked
// (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.

const DAY = 24 * 60 * 60 * 1000;

/** An ISO timestamp `days` from now (negative is past), at 10:00 or 14:30 local time. */
function daysFromNow(days: number, afternoon = false) {
  const at = new Date(Date.now() + days * DAY);
  at.setHours(afternoon ? 14 : 10, afternoon ? 30 : 0, 0, 0);
  return at.toISOString();
}

type Plan = {
  location?: string | null;
  appliedDaysAgo?: number;
  /** Completed Interviews, oldest first: their kind, and whether they have Interview notes. */
  done?: (InterviewKind | [InterviewKind, "notes"])[];
  /** Upcoming Interviews: their kind and how many days away. */
  next?: [InterviewKind, number][];
  /** A completed Interview saved before dates were required (docs/adr/0005). */
  dateNeeded?: InterviewKind;
  outcome?: Outcome | null;
  sample?: boolean;
};

/** One Interview of the Application `id`. */
function interview(id: string, i: number, kind: InterviewKind, at: string | null, completed: boolean, notes = false) {
  return testInterview(`${id}-${i}`, {
    application_id: id,
    kind,
    at,
    completed,
    notes: notes ? "Went well; asked about trade-offs." : null,
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
  location: "Remote",
  done: [],
  next: [],
  outcome: null,
  sample: false,
} satisfies Plan;

/** One Application as the API returns it, with its derived fields worked out from the plan. */
function app(company: string, title: string, plan: Plan = {}): Application {
  const { location, done, next, dateNeeded, outcome, sample, appliedDaysAgo } =
    { ...DEFAULT_PLAN, ...plan };
  const id = company.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const applied = appliedDaysAgo ?? 7 + done.length * 7;
  const appliedOn = daysFromNow(-applied).slice(0, 10);
  const completed = completedInterviews(id, applied, done);
  const upcoming = next.map(([kind, days], i) =>
    interview(id, 10 + i, kind, daysFromNow(days, i % 2 === 0), false),
  );
  const missing = dateNeeded ? [interview(id, 20, dateNeeded, null, true)] : [];
  const isWaiting = !outcome && upcoming.length === 0;
  return application(id, {
    company,
    title,
    location,
    applied_on: appliedOn,
    status: outcome ? "done" : "in_progress",
    outcome,
    interviews: [...completed, ...upcoming, ...missing],
    is_waiting: isWaiting,
    waiting_since: isWaiting ? (completed.at(-1)?.at ?? appliedOn) : null,
    is_sample: sample,
  });
}

const HYBRID_2 = "Hybrid - 2 days in Office";
const HYBRID_3 = "Hybrid - 3 days in Office";

/** About thirty Applications: many waiting, most of the rest with Interviews booked, two Offers, and Done ones. */
const jobSearch: Application[] = [
  // Waiting: just applied, or heard nothing since the last Interview.
  app("Stripe", "Software Engineer II", {
    location: HYBRID_2,
    appliedDaysAgo: 14,
  }),
  app("Shopify", "Senior Developer", {
    location: HYBRID_3,
    done: [["recruiter_screen", "notes"]],
  }),
  app("Wealthsimple", "Senior Full-stack Developer", {
    location: "Toronto, ON",
    appliedDaysAgo: 3,
  }),
  app("Cohere", "Member of Technical Staff, Frontend", {
    location: HYBRID_3,
    appliedDaysAgo: 9,
  }),
  app("Lightspeed Commerce", "Software Developer", {
    location: "Montréal, QC",
    appliedDaysAgo: 21,
  }),
  app("Clio", "Senior Software Developer, Platform", {
    location: "Vancouver, BC",
    done: ["recruiter_screen", "hiring_manager"],
  }),
  app("1Password", "Developer, Web Experience", { appliedDaysAgo: 1 }),
  app("Faire", "Software Engineer, Growth", {
    location: null,
    appliedDaysAgo: 30,
  }),
  app("Hootsuite", "Intermediate Frontend Developer", {
    location: HYBRID_2,
    dateNeeded: "recruiter_screen",
  }),

  // Interview scheduled: one or more upcoming, some far along.
  app("Notion", "Full-stack Engineer", { next: [["recruiter_screen", 1]] }),
  app("Datadog", "Software Engineer", {
    location: HYBRID_2,
    done: [["recruiter_screen", "notes"]],
    next: [["technical", 2]],
  }),
  app("Figma", "Senior Engineer", {
    location: HYBRID_3,
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
    location: HYBRID_2,
    done: ["recruiter_screen"],
    next: [["hiring_manager", 5]],
  }),
  app("Asana", "Software Engineer", {
    location: HYBRID_3,
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
    location: "Toronto, ON",
    done: ["recruiter_screen"],
    next: [
      ["fe_system_design", 7],
      ["strategy_and_values_alignment", 9],
      ["hiring_manager", 12],
    ],
  }),
  app("Benevity", "Software Developer II", {
    location: "Calgary, AB",
    next: [["informal_chat", 0]],
  }),
  app("Thinkific", "Senior Developer", {
    location: "Vancouver, BC",
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
    location: HYBRID_2,
    done: ["recruiter_screen", ["technical", "notes"], "behavioural"],
    outcome: "offer",
  }),

  // Done without an Offer: shown with "Show done".
  app("Atlassian", "Senior Frontend Engineer", {
    done: ["recruiter_screen", "technical"],
    outcome: "rejected",
  }),
  app("Slack", "Software Engineer", {
    location: HYBRID_3,
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
    location: "Toronto, ON",
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

/** A job search a few weeks in: one table, ordered by what each Application is waiting on. */
export const Default: Story = {};

/** With "Show done" on, the Done Applications follow, each showing its Outcome. */
export const ShowDone: Story = { args: { showDone: true } };

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

/** Marking an Outcome from a row's menu saves it with the Application's id. */
export const ChangeStatus: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Change Status, Stripe" }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Mark Rejected" }),
    );
    await waitFor(() =>
      expect(updateApplicationAction).toHaveBeenCalledWith("stripe", {
        status: "done",
        outcome: "rejected",
      }),
    );
  },
};

/** A save that fails shows its error and a Retry on the row. */
export const ChangeStatusFails: Story = {
  beforeEach: () => {
    mocked(updateApplicationAction).mockResolvedValue({
      ok: false,
      error: "Couldn’t reach Bigfoot’s server. Try again.",
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Change Status, Stripe" }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Mark Rejected" }),
    );
    await expect(
      await canvas.findByRole("button", { name: "Retry, Status, Stripe" }),
    ).toBeVisible();
  },
};

/** Long company names, titles and locations wrap inside their cells. */
export const LongText: Story = {
  args: {
    applications: jobSearch.map((a, i) =>
      i === 0
        ? {
            ...a,
            company:
              "Northern Lights Software Engineering Co-operative of British Columbia",
            title:
              "Senior Staff Software Engineer, Developer Experience and Internal Platform Tooling",
            location:
              "Hybrid - 3 days in Office, Vancouver or Victoria, BC (relocation supported)",
          }
        : a,
    ),
  },
};

/** The landing page's decorative copy: hidden from screen readers, not interactive. */
export const Decorative: Story = {
  args: { applications: previewApplications, linked: false, decorative: true },
};
