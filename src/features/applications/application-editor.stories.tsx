import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor, within } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { ApplicationEditor } from "./application-editor";

// The Application page under its "← Dashboard" link (BIG-174). Dates are counted from today, so
// "in 2 days" reads as it would on the page. Server Actions are mocked
// (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const DAY = 86_400_000;
const daysFromNow = (days: number, hour = 15) => {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const appliedDaysAgo = (days: number) => daysFromNow(-days).slice(0, 10);

const lumen = application("lumen", {
  company: "Lumen Bio",
  title: "Engineering Manager, ML Platform",
  location: "hybrid",
  office_days: 3,
  salary: "$210k–$240k",
  posting_url: "https://lumenbio.example/careers/em-ml-platform",
  applied_on: appliedDaysAgo(26),
  is_waiting: false,
  waiting_since: null,
  interviews: [
    interview("screen", {
      application_id: "lumen",
      kind: "recruiter_screen",
      at: daysFromNow(-17, 10),
      notes:
        "Quick walkthrough of my last team and how I ran quarterly planning. Two squads, 11 engineers, reporting to the Director of Platform. Band lines up with what I asked for.\n\nNext: hiring manager.",
    }),
    interview("manager", {
      application_id: "lumen",
      kind: "hiring_manager",
      at: daysFromNow(-10, 11),
      notes:
        "Dug into how I handle underperformance and how I split time between hands-on work and people work. The incident story landed well.\n\nRambled on the roadmap question. Next time: lead with the decision, then the trade-off.",
    }),
    interview("deep-dive", { application_id: "lumen", kind: "technical_deep_dive", at: daysFromNow(2, 11), completed: false }),
    interview("leadership", { application_id: "lumen", kind: "leadership", at: daysFromNow(9, 13), completed: false }),
  ],
});

const quillon = application("quillon", {
  company: "Quillon Learning",
  title: "Senior Engineering Manager",
  location: "remote",
  salary: "$190k",
  posting_url: "https://quillon.example/jobs/1",
  applied_on: appliedDaysAgo(5),
  waiting_since: appliedDaysAgo(5),
});

const meta = {
  component: ApplicationEditor,
  args: { app: lumen },
  decorators: [(Story) => <main>{Story()}</main>],
} satisfies Meta<typeof ApplicationEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An Interview scheduled: the strip, the next Interview with what the last one's notes carry
 * forward, Later and Done, and the Details card with the salary hidden.
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Technical Deep-Dive" })).toBeVisible();
    await expect(canvas.getByText("Rambled on the roadmap question. Next time: lead with the decision, then the trade-off.", { selector: ".rounded-card p" })).toBeVisible();
    await expect(canvas.getByText("Interview scheduled")).toBeVisible();
    await expect(canvas.queryByText("$210k–$240k")).not.toBeInTheDocument();
    const rows = canvas.getAllByRole("link", { name: /^Open Interview: / });
    await expect(rows.map((row) => row.textContent)).toEqual([
      "Open Interview: Leadership",
      "Open Interview: Hiring Manager",
      "Open Interview: Recruiter Screen",
    ]);
  },
};

/** Waiting, with no Interviews yet: Bigfoot and a first Add Interview. */
export const NoInterviews: Story = {
  args: { app: quillon },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "No Interviews yet" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Add Interview" })).toHaveAttribute("href", "/interviews/new?application=quillon");
    await expect(await canvas.findByText(/Waiting · 5 days/)).toBeVisible();
  },
};

/** Opened straight after adding the Application: focus lands on Add Interview, which asks for the first one. */
export const JustAdded: Story = {
  args: { app: quillon, justAdded: true },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole("link", { name: "Add Interview" })).toHaveFocus());
  },
};

/** Done with an Offer, its Interviews all completed. */
export const Offer: Story = {
  args: {
    app: {
      ...lumen,
      status: "done",
      outcome: "offer",
      interviews: lumen.interviews.map((i) => ({ ...i, at: i.completed ? i.at : daysFromNow(-3), completed: true })),
    },
  },
};

/** The next Interview already has Interview notes: they show instead of Add Interview notes. */
export const NextHasNotes: Story = {
  args: {
    app: {
      ...lumen,
      interviews: lumen.interviews.map((i) =>
        i.id === "deep-dive" ? { ...i, notes: "Bring the feature store migration story. Ask who owns on-call." } : i,
      ),
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Bring the feature store migration story/)).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Add Interview notes" })).not.toBeInTheDocument();
  },
};

/** An Interview saved before dates were required shows Date needed, and comes last under Done. */
export const DateNeeded: Story = {
  args: {
    app: {
      ...lumen,
      interviews: [...lumen.interviews, interview("undated", { application_id: "lumen", kind: "people_management", at: null })],
    },
  },
  play: async ({ canvas }) => {
    const rows = canvas.getAllByRole("link", { name: /^Open Interview: / });
    await expect(rows.at(-1)).toHaveTextContent("People Management");
  },
};

/** Reveal shows the salary; it starts hidden each time. */
export const RevealSalary: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Reveal salary" }));
    await expect(canvas.getByText("$210k–$240k")).toBeVisible();
  },
};

/** No salary or job posting: each reads Not added. */
export const NothingAdded: Story = {
  args: { app: { ...quillon, salary: null, posting_url: null } },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText("Not added")).toHaveLength(2);
  },
};

/** Edit details: every detail is a field, the salary masked until Show; a typed one saves when it's left. */
export const EditDetails: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await expect(canvas.getByRole("heading", { name: "Edit details" })).toBeVisible();
    await expect(canvas.getByLabelText(/^Salary/)).toHaveAttribute("type", "password");
    const company = canvas.getByRole("textbox", { name: /^Company/ });
    await userEvent.clear(company);
    await userEvent.type(company, "Lumen Labs");
    await userEvent.tab();
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("lumen", { company: "Lumen Labs" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(canvas.getByRole("button", { name: "Edit details" })).toHaveFocus();
  },
};

/** Picking Hybrid saves it at once and asks for days in office; picking a day saves it too. */
export const PickHybrid: Story = {
  args: { app: quillon },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Hybrid" }));
    await waitFor(() => expect(actions.updateApplicationAction).toHaveBeenCalledWith("quillon", { location: "hybrid" }));
    await userEvent.click(canvas.getByRole("radio", { name: "2 days a week" }));
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("quillon", { location: "hybrid", office_days: 2 }),
    );
  },
};

/** A detail that isn't valid shows its error, isn't sent, and keeps the fields open on Done. */
export const DetailError: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    const posting = canvas.getByRole("textbox", { name: /^Job posting URL/ });
    await userEvent.clear(posting);
    await userEvent.type(posting, "not a link");
    await userEvent.tab();
    await expect(posting).toHaveAttribute("aria-invalid", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(posting).toHaveFocus();
    await expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  },
};

/** The server refuses a save: the error and a Retry show beside the field. */
export const SaveFails: Story = {
  beforeEach: () => {
    mocked(actions.updateApplicationAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await userEvent.click(canvas.getByRole("radio", { name: "In-Office" }));
    await expect(await canvas.findByRole("button", { name: "Retry, Location" })).toBeVisible();
  },
};

/** Mark done… holds the Change Status choices; picking one saves at once. */
export const MarkDone: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mark done…" }));
    await userEvent.click(await canvas.findByRole("menuitem", { name: "Mark Rejected" }));
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("lumen", { status: "done", outcome: "rejected" }),
    );
  },
};

/** ⋯ holds Delete application, which asks first. */
export const DeleteApplication: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "More actions, Lumen Bio" }));
    await userEvent.click(await canvas.findByRole("menuitem", { name: "Delete application" }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole("dialog", { name: "Delete application?" });
    await expect(dialog).toHaveTextContent("Lumen Bio, Engineering Manager, ML Platform will be deleted.");
  },
};

export const LongText: Story = {
  args: {
    app: {
      ...lumen,
      company: "Northern Lights Software Engineering Co-operative of British Columbia",
      title: "Senior Staff Software Engineer, Developer Experience and Internal Platform Tooling",
      posting_url: "https://careers.northern-lights-software-engineering-cooperative.example/platform/senior-staff",
    },
  },
};
