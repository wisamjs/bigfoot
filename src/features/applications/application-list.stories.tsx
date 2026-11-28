import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import type { Application, InterviewCategory, Location, Outcome } from "@/lib/applications";
import { previewApplications } from "@/lib/mock-data";
import { application, interview as testInterview } from "@/test/applications";
import { ApplicationList } from "./application-list";

// The dashboard's Applications for a job search a few weeks in.


/** An ISO timestamp `days` from now (negative is past), at 10:00 or 14:30 local time. */
function daysFromNow(days: number, afternoon = false) {
  const at = new Date();
  at.setDate(at.getDate() + days); // calendar days: days × 24h misses by one across a DST change
  at.setHours(afternoon ? 14 : 10, afternoon ? 30 : 0, 0, 0);
  return at.toISOString();
}

/** The Interview titles these stories use, each with its category. */
const CATEGORY_OF = {
  "AI Assisted Coding Challenge": "technical",
  "BE System Design": "system_design",
  "Behavioural": "culture",
  "Coding Challenge": "technical",
  "Cross-Functional Interview": "collaboration",
  "FE System Design": "system_design",
  "Hiring Manager": "hiring_manager",
  "Informal Chat": "recruiter",
  "Leadership": "people_management",
  "Onsite Loop": "hiring_manager",
  "People Management": "people_management",
  "Recruiter Screen": "recruiter",
  "Strategy & Values Alignment": "decision_maker",
  "Technical": "technical",
  "Technical Deep-Dive": "project_deep_dive",
} satisfies Record<string, InterviewCategory>;
type Title = keyof typeof CATEGORY_OF;

type Plan = {
  location?: Location | null;
  /** Days in office, for a Hybrid Location. */
  officeDays?: number;
  appliedDaysAgo?: number;
  /** Completed Interviews, oldest first: their title, and whether they have Interview notes. */
  done?: (Title | [Title, "notes"])[];
  /** Upcoming Interviews: their title and how many days away. */
  next?: [Title, number][];
  outcome?: Outcome | null;
  sample?: boolean;
};

/** One Interview of the Application `id`. */
function interview(id: string, i: number, title: Title, at: string, completed: boolean, notes = false) {
  return testInterview(`${id}-${i}`, {
    application_id: id,
    category: CATEGORY_OF[title],
    title,
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
    const [title, notes] = Array.isArray(entry) ? entry : [entry];
    const daysAgo = Math.round(
      applied - ((i + 1) * (applied - 2)) / (done.length + 1),
    );
    return interview(
      id,
      i,
      title,
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
  const upcoming = next.map(([title, days], i) =>
    interview(id, 10 + i, title, daysFromNow(days, i % 2 === 0), false),
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
    done: [["Recruiter Screen", "notes"]],
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
    done: ["Recruiter Screen", "Hiring Manager"],
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
  app("Notion", "Full-stack Engineer", { next: [["Recruiter Screen", 1]] }),
  app("Datadog", "Software Engineer", {
    ...HYBRID_2,
    done: [["Recruiter Screen", "notes"]],
    next: [["Technical", 2]],
  }),
  app("Figma", "Senior Engineer", {
    ...HYBRID_3,
    done: [
      ["Recruiter Screen", "notes"],
      "Hiring Manager",
      ["Technical", "notes"],
    ],
    next: [["Onsite Loop", 4]],
  }),
  app("Linear", "Product Engineer", {
    done: [
      "Informal Chat",
      "Recruiter Screen",
      ["Technical", "notes"],
      "FE System Design",
    ],
    next: [["Behavioural", 3]],
  }),
  app("Airtable", "Frontend Engineer", {
    ...HYBRID_2,
    done: ["Recruiter Screen"],
    next: [["Hiring Manager", 5]],
  }),
  app("Asana", "Software Engineer", {
    ...HYBRID_3,
    done: [
      "Recruiter Screen",
      "Hiring Manager",
      "Coding Challenge",
      "Technical",
      "FE System Design",
      "Behavioural",
    ],
    next: [
      ["Technical", 6],
      ["Leadership", 6],
    ],
  }),
  app("Okta", "Engineering Manager", {
    done: [
      ["Recruiter Screen", "notes"],
      "Hiring Manager",
      "People Management",
      ["BE System Design", "notes"],
      "Leadership",
    ],
    next: [
      ["Cross-Functional Interview", 8],
      ["BE System Design", 10],
    ],
  }),
  app("Vercel", "Senior Software Engineer, Next.js", {
    done: ["Recruiter Screen", ["AI Assisted Coding Challenge", "notes"]],
    next: [["Technical Deep-Dive", 2]],
  }),
  app("Ada", "Staff Frontend Engineer", {
    location: "in_office",
    done: ["Recruiter Screen"],
    next: [
      ["FE System Design", 7],
      ["Strategy & Values Alignment", 9],
      ["Hiring Manager", 12],
    ],
  }),
  app("Benevity", "Software Developer II", {
    location: "in_office",
    next: [["Informal Chat", 0]],
  }),
  app("Thinkific", "Senior Developer", {
    location: "in_office",
    done: ["Recruiter Screen"],
    next: [["Coding Challenge", 15]],
  }),

  // Offers, waiting on the job seeker's answer.
  app("Ramp", "Staff Engineer", {
    done: [
      "Recruiter Screen",
      "Hiring Manager",
      "Technical",
      "BE System Design",
      "Onsite Loop",
      "Leadership",
    ],
    outcome: "offer",
  }),
  app("Wave", "Senior Software Engineer", {
    ...HYBRID_2,
    done: ["Recruiter Screen", ["Technical", "notes"], "Behavioural"],
    outcome: "offer",
  }),

  // Done without an Offer: shown with "Show done".
  app("Atlassian", "Senior Frontend Engineer", {
    done: ["Recruiter Screen", "Technical"],
    outcome: "rejected",
  }),
  app("Slack", "Software Engineer", {
    ...HYBRID_3,
    done: ["Recruiter Screen"],
    outcome: "position_filled",
  }),
  app("Twilio", "Frontend Engineer", {
    location: null,
    outcome: "no_open_position",
  }),
  app("Dropbox", "Senior Engineer", {
    done: ["Recruiter Screen", "Hiring Manager"],
    outcome: "withdrawn",
  }),
  app("Coinbase", "Software Engineer, Payments", {
    done: [["Informal Chat", "notes"]],
    outcome: "not_the_right_fit",
  }),
  app("Instacart", "Senior Software Engineer", {
    location: "in_office",
    done: ["Recruiter Screen", "Onsite Loop"],
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
 * A job search a few weeks in: one table, ordered by what each Application is waiting on. Progress
 * is a coloured label (Waiting with its days, Interview scheduled, Offer) and a mark per Interview:
 * completed in green, the next in the brand colour, later ones muted (BIG-195). It says nothing of
 * Interview notes, which the Application page shows (BIG-185). Next is the soonest Interview's
 * title over when it is, in the brand colour today or tomorrow, with "+N later"; while Waiting,
 * "Nothing booked" over Waiting since in the warning colour.
 */
export const Default: Story = {
  play: async ({ canvasElement, canvas }) => {
    await expect(progressMarks(canvasElement, "Clio")).not.toHaveLength(0);
    await expect(progressMarks(canvasElement, "Clio").every((mark) => mark.classList.contains("bg-fg-success-strong"))).toBe(true);
    // Okta: five completed, the next, and one later.
    const okta = progressMarks(canvasElement, "Okta").map((mark) => mark.className);
    await expect(okta.at(-2)).toContain("bg-brand");
    await expect(okta.at(-1)).toContain("bg-line-medium");
    await expect(canvasElement.querySelector("svg.lucide-notebook-pen")).toBeNull();
    await expect(canvas.getAllByText(/^Waiting · \d+ days?$/)[0]).toHaveClass("text-fg-warning");
    await expect(canvas.getAllByText("Nothing booked").length).toBeGreaterThan(0);
  },
};

/**
 * On a phone, each row stacks (BIG-195): the company, "role · Location", the Progress label with
 * its marks beside it, then Next on one line, with the chevron on the right.
 */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("columnheader", { name: "Application" })).toBeVisible();
    await expect(canvas.queryByRole("columnheader", { name: "Next" })).not.toBeInTheDocument();
    // Shopify's role line takes its Location on a phone.
    const role = canvas.getAllByText(/^Senior Developer/)[0];
    await expect(role).toHaveTextContent("Senior Developer · Hybrid - 3x a Week");
    await expect(role).toBeVisible();
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

/** An Application with `tbd` Unscheduled Interviews after its others (BIG-221): through to a round with no date yet. */
function withDateTbd(application: Application, ...titles: Title[]): Application {
  const unscheduled = titles.map((title, i) => interview(application.id, 20 + i, title, "", false));
  return {
    ...application,
    is_waiting: false,
    waiting_since: null,
    interviews: [...application.interviews, ...unscheduled.map((i) => ({ ...i, at: null }))],
  };
}

const lumenTbd = withDateTbd(app("Lumen Bio", "Engineering Manager", { done: ["Recruiter Screen", "Hiring Manager"] }), "Hiring Manager");
const northwindTbd = withDateTbd(
  app("Northwind", "Engineering Manager", { done: ["Recruiter Screen"], next: [["Onsite Loop", 11]] }),
  "Onsite Loop",
);

/**
 * Unscheduled Interviews (BIG-221): Lumen Bio has only one ahead, so "Next round · date TBD" in a
 * neutral pill, sorted after Waiting, with Next its title over "Date TBD". Northwind has a Scheduled
 * one too, so it stays "Interview scheduled" and the Unscheduled one counts in "+1 later". Both end
 * in a dashed mark in the brand colour.
 */
export const DateTbd: Story = {
  args: { applications: [...jobSearch.filter((a) => ["stripe", "ramp"].includes(a.id)), lumenTbd, northwindTbd] },
  play: async ({ canvasElement, canvas }) => {
    // Progress is drawn twice, stacked for a phone and in its column wider: one of them shows.
    await expect(canvas.getAllByText("Next round · date TBD").some((label) => label.checkVisibility())).toBe(true);
    await expect(progressMarks(canvasElement, "lumen-bio").at(-1)?.className).toContain("repeating-linear-gradient");
    await expect(progressMarks(canvasElement, "Northwind").at(-1)?.className).toContain("repeating-linear-gradient");
    const lumen = canvasElement.querySelector('tr[data-application-id="lumen-bio"] td:nth-child(3)');
    await expect(lumen).toHaveTextContent(/Hiring Manager\s*Date TBD/);
    const northwind = canvasElement.querySelector('tr[data-application-id="northwind"] td:nth-child(3)');
    await expect(northwind).toHaveTextContent("+1 later");
    await expect(northwind).toHaveTextContent(/Onsite Loop, Hiring Manager, Date TBD/);
  },
};

/** The same on a phone: Next on one line, "Hiring Manager · Date TBD". */
export const DateTbdPhone: Story = { ...DateTbd, globals: { viewport: { value: "mobile1", isRotated: false } } };

/** A row's Interview marks in its Progress column. */
function progressMarks(canvasElement: HTMLElement, company: string) {
  const row = canvasElement.querySelector(`tr[data-application-id="${company.toLowerCase()}"]`);
  return [...(row?.querySelectorAll("td:nth-child(2) [data-mark]") ?? [])];
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
    applications: previewApplications().map((a) => ({ ...a, is_sample: true })),
  },
};

/** Each linked row ends in a quiet chevron, and the whole row opens the Application. */
export const RowsOpenTheApplication: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
    await expect(canvas.getAllByRole("link", { name: /^Open Stripe/ })).toHaveLength(1);
  },
};

/** The companies in the table's rows, top to bottom. */
function rowCompanies(canvasElement: HTMLElement) {
  return [...canvasElement.querySelectorAll("tbody tr td:first-child > p:first-child")].map((p) =>
    p.textContent?.replace(/^Open /, "").split(",")[0],
  );
}

/**
 * Sorted by Progress, the dashboard's default (BIG-209): Interviews booked first, the highest Round
 * first (Asana and Okta both have Round 7 booked; Asana's is sooner), then Waiting with the most Interviews behind it first, then Offers.
 * Each column header sorts by its column; the sorted one shows an arrow.
 */
export const SortedByProgress: Story = {
  args: { sort: "progress", onSort: fn() },
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    await expect(rowCompanies(canvasElement).slice(0, 2)).toEqual(["Asana", "Okta"]);
    await expect(canvas.getByRole("columnheader", { name: "Progress" })).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(canvas.getByRole("button", { name: "Location" }));
    await expect(args.onSort).toHaveBeenCalledWith("location");
  },
};

/** Sorted by Application: company A–Z, then role; with Show done on, the Done ones sort with the rest (BIG-249). */
export const SortedByApplication: Story = {
  args: { sort: "application", onSort: fn(), showDone: true },
  play: async ({ canvasElement }) => {
    const companies = rowCompanies(canvasElement);
    await expect(companies).toEqual(companies.toSorted((a = "", b = "") => a.localeCompare(b, "en", { sensitivity: "base" })));
  },
};

/** Sorted by Next: the soonest Interview first, then the longest wait, then Offers. */
export const SortedByNext: Story = { args: { sort: "next", onSort: fn() } };

/** Sorted by Location A–Z, Applications without one last; with Show done on, the Done ones sort with the rest. */
export const SortedByLocation: Story = { args: { sort: "location", onSort: fn(), showDone: true } };

/** The landing page's decorative copy: hidden from screen readers, not interactive. */
export const Decorative: Story = {
  args: { applications: previewApplications(), linked: false, decorative: true },
};
