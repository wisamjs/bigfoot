import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor, within } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { prepLookBack } from "@/lib/applications";
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
      category: "recruiter", title: "Recruiter Screen",
      at: daysFromNow(-17, 10),
      how_it_went:
        "Quick walkthrough of my last team and how I ran quarterly planning. Two squads, 11 engineers, reporting to the Director of Platform. Band lines up with what I asked for.\n\nNext: hiring manager.",
    }),
    interview("manager", {
      application_id: "lumen",
      category: "hiring_manager", title: "Hiring Manager",
      at: daysFromNow(-10, 11),
      what_they_asked:
        "Tell me about a time you had to let someone go.\nHow do you decide what your team does not build?\nWhat does a good first 90 days look like here?",
      how_it_went:
        "Dug into how I handle underperformance and how I split time between hands-on work and people work. The incident story landed well.\n\nRambled on the roadmap question. Next time: lead with the decision, then the trade-off.",
      takeaway: "Lead with the decision, then the trade-off, then what I would measure.",
    }),
    interview("deep-dive", { application_id: "lumen", category: "project_deep_dive", title: "Technical Deep-Dive", at: daysFromNow(2, 11), completed: false }),
    interview("leadership", { application_id: "lumen", category: "people_management", title: "Leadership", at: daysFromNow(9, 13), completed: false }),
  ],
});

/** Lumen Bio, Rejected the day before yesterday: its two completed Interviews, the screen with a takeaway too. */
const rejected = {
  ...lumen,
  status: "done" as const,
  outcome: "rejected" as const,
  done_on: appliedDaysAgo(2),
  outcome_note: "They went with an internal candidate.",
  interviews: lumen.interviews
    .filter((i) => i.completed)
    .map((i) => (i.id === "screen" ? { ...i, takeaway: "Ask the recruiter about internal candidates early." } : i)),
};

/** Today in the viewer's time zone, as the Done date a pick of Mark <Outcome> sends. */
function todayLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const quillon = application("quillon", {
  company: "Quillon Learning",
  title: "Senior Engineering Manager",
  location: "remote",
  salary: "$190k",
  posting_url: "https://quillon.example/jobs/1",
  applied_on: appliedDaysAgo(5),
  waiting_since: appliedDaysAgo(5),
});

// Another Application with a Technical Deep-Dive behind it, for the Next up card's second takeaway.
const fernway = application("fernway", {
  company: "Fernway Health",
  status: "done",
  outcome: "rejected",
  is_waiting: false,
  interviews: [
    interview("fernway-dive", {
      application_id: "fernway",
      category: "project_deep_dive", title: "Technical Deep-Dive",
      at: daysFromNow(-30, 14),
      takeaway: "Draw the system before talking through it.",
    }),
  ],
});
const lookBack = prepLookBack([lumen, fernway], lumen, lumen.interviews[2]);

/** The strip's segments drawn in a colour: a completed Interview's is green, or grey once Done. */
function completedBars(canvas: ReturnType<typeof within>, colour: string) {
  return within(canvas.getByRole("list", { name: "Interviews by date" }))
    .getAllByRole("listitem")
    .filter((segment) => segment.firstElementChild?.firstElementChild?.firstElementChild?.classList.contains(colour));
}

const meta = {
  component: ApplicationEditor,
  args: { app: lumen, lookBack },
  decorators: [(Story) => <main>{Story()}</main>],
} satisfies Meta<typeof ApplicationEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An Interview scheduled: the strip (completed Interviews green, each segment "R1 · <title>" with
 * its Round number), the next Interview, "Round 3 · Technical Deep-Dive", with the
 * takeaways that apply (this Application's Hiring Manager, and the last Technical Deep-Dive at
 * Fernway Health) and They asked last time, Later and Completed (each with its Interview notes inline), and the Details card with the salary hidden.
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("list", { name: "Completed" })).toBeVisible();
    await expect(await canvas.findAllByText(/ · Completed$/)).toHaveLength(2);
    await expect(completedBars(canvas, "bg-fg-success-strong")).toHaveLength(2);
    const segments = within(canvas.getByRole("list", { name: "Interviews by date" })).getAllByRole("link");
    await expect(segments.map((s) => s.textContent?.match(/R\d · /)?.[0])).toEqual(["R1 · ", "R2 · ", "R3 · ", "R4 · "]);
    await expect(segments[3]).toHaveAccessibleName(/Round 4: Leadership$/);
    await expect(canvas.getByRole("heading", { level: 2, name: "Round 3 · Technical Deep-Dive" })).toBeVisible();
    const next = canvas.getByRole("region", { name: "Round 3 · Technical Deep-Dive" });
    const takeaways = within(within(next).getByRole("list", { name: "Takeaways for this Interview" })).getAllByRole("listitem");
    await expect(takeaways).toHaveLength(2);
    await expect(takeaways[0]).toHaveTextContent(/^Takeaway from Hiring Manager · .+Lead with the decision/);
    await expect(takeaways[1]).toHaveTextContent("From your last Project Deep-dive · Fernway HealthDraw the system");
    await expect(within(within(next).getByRole("list", { name: "They asked last time" })).getAllByRole("listitem")).toHaveLength(3);
    await expect(within(next).queryByText(/Carried forward/)).not.toBeInTheDocument();
    await expect(canvas.getByText("Interview scheduled")).toBeVisible();
    // A completed Interview shows all three Interview notes fields inline.
    const completed = canvas.getByRole("list", { name: "Completed" });
    await expect(within(completed).getByRole("list", { name: "They asked" })).toBeVisible();
    await expect(within(completed).getByText(/Lead with the decision, then the trade-off, then what I would measure/)).toBeVisible();
    await expect(canvas.queryByText("$210k–$240k")).not.toBeInTheDocument();
    // In Progress: no Outcome card, and no Ended in the Details card.
    await expect(canvas.queryByRole("heading", { name: "Rejected" })).not.toBeInTheDocument();
    await expect(canvas.queryByText("Ended")).not.toBeInTheDocument();
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

/**
 * Done with an Offer, marked before Bigfoot recorded when: its Interviews all completed and grey on
 * the strip (the hiring process is over), and the Outcome card and Ended with no Done date.
 */
export const Offer: Story = {
  args: {
    app: {
      ...lumen,
      status: "done",
      outcome: "offer",
      is_waiting: false,
      interviews: lumen.interviews.map((i) => ({ ...i, at: i.completed ? i.at : daysFromNow(-3), completed: true })),
    },
  },
  play: async ({ canvas }) => {
    await expect(completedBars(canvas, "bg-tone-gray-fg")).toHaveLength(4);
    await expect(completedBars(canvas, "bg-fg-success-strong")).toHaveLength(0);
    await expect(canvas.getByRole("heading", { level: 2, name: "Offer" })).toBeVisible();
    await expect(canvas.getByText("After 4 Interviews.")).toBeVisible();
    await expect(canvas.getByText("Ended").nextElementSibling).toHaveTextContent("Not added · Offer");
  },
};

/**
 * Rejected, with a Done date and an Outcome note: the Outcome card above the Interviews card, with
 * the takeaways of both Interviews, newest first, and Ended (the Done date and Outcome) in Details.
 */
export const Done: Story = {
  args: { app: rejected },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Rejected" })).toBeVisible();
    await expect(canvas.getByText(/^After 2 Interviews, 24 days from applying\./)).toBeVisible();
    await expect(canvas.getByText("They went with an internal candidate.")).toBeVisible();
    await expect(canvas.getByText("What you’re taking from it")).toBeVisible();
    await expect(canvas.getByText("From Hiring Manager", { exact: false })).toBeVisible();
    const ended = canvas.getByText("Ended").nextElementSibling;
    await expect(ended).toHaveTextContent(/ · Rejected$/);
    await expect(ended).not.toHaveTextContent("Not added");
    // The Outcome card comes before the Interviews card.
    const outcome = canvas.getByRole("region", { name: "Rejected" });
    const interviews = canvas.getByRole("region", { name: "Interviews" });
    await expect(outcome.compareDocumentPosition(interviews) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  },
};

/** Done without a Done date, Outcome note or takeaways: the card has only the Outcome and the Interviews counted. */
export const DoneWithNothingAdded: Story = {
  args: {
    app: {
      ...rejected,
      done_on: null,
      outcome_note: null,
      interviews: rejected.interviews.map((i) => ({ ...i, takeaway: null })),
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("After 2 Interviews.")).toBeVisible();
    await expect(canvas.queryByText("What you’re taking from it")).not.toBeInTheDocument();
    await expect(canvas.getByText("Ended").nextElementSibling).toHaveTextContent("Not added · Rejected");
  },
};

/** A Done Application's details add its Done date and Outcome note as fields; the note saves when it's left. */
export const EditDoneDetails: Story = {
  args: { app: rejected },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await expect(canvas.getByRole("button", { name: /^Done date, / })).toBeVisible();
    const note = canvas.getByRole("textbox", { name: /^Outcome note/ });
    await expect(note).toHaveValue("They went with an internal candidate.");
    await userEvent.clear(note);
    await userEvent.type(note, "The role was reshaped.");
    await userEvent.tab();
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("lumen", { outcome_note: "The role was reshaped." }),
    );
  },
};

/** A Done date before the applied date is refused beside the field and never sent. */
export const DoneDateBeforeApplied: Story = {
  args: { app: { ...rejected, done_on: rejected.applied_on } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await userEvent.click(canvas.getByRole("button", { name: /^Done date, / }));
    // The calendar opens on the picked day: pick the day before it.
    await userEvent.keyboard("{ArrowLeft}{Enter}");
    await expect((await canvas.findAllByText("The Done date can’t be before the applied date."))[0]).toBeVisible();
    await expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  },
};

/** Change Status… once Done holds Reopen, which clears the Outcome, Done date and Outcome note. */
export const Reopen: Story = {
  args: { app: rejected },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Change Status…" }));
    await userEvent.click(await canvas.findByRole("menuitem", { name: "Reopen" }));
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("lumen", {
        status: "in_progress",
        outcome: null,
        done_on: null,
        outcome_note: null,
      }),
    );
  },
};

/** Picking another Outcome once Done keeps the Done date: only the Outcome is sent. */
export const ChangeOutcome: Story = {
  args: { app: rejected },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Change Status…" }));
    await userEvent.click(await canvas.findByRole("menuitem", { name: "Mark Position Filled" }));
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("lumen", { status: "done", outcome: "position_filled" }),
    );
  },
};

/** Nothing to look back at: no completed Interview has a takeaway or questions, so the Next up card shows neither. */
export const NothingToLookBackAt: Story = {
  args: { lookBack: { takeaways: [], theyAsked: null } },
  play: async ({ canvas }) => {
    const next = canvas.getByRole("region", { name: "Round 3 · Technical Deep-Dive" });
    await expect(within(next).queryByRole("list", { name: "Takeaways for this Interview" })).not.toBeInTheDocument();
    await expect(within(next).queryByRole("list", { name: "They asked last time" })).not.toBeInTheDocument();
  },
};

/** The next Interview already has Prep notes: they show instead of Add Prep notes. */
export const NextHasPrepNotes: Story = {
  args: {
    app: {
      ...lumen,
      interviews: lumen.interviews.map((i) =>
        i.id === "deep-dive" ? { ...i, prep_notes: "Bring the feature store migration story. Ask who owns on-call." } : i,
      ),
    },
  },
  play: async ({ canvas }) => {
    const next = canvas.getByRole("region", { name: "Round 3 · Technical Deep-Dive" });
    await expect(within(next).getByText(/Bring the feature store migration story/)).toBeVisible();
    await expect(within(next).queryByRole("link", { name: "Add Prep notes" })).not.toBeInTheDocument();
  },
};

/**
 * A phone: Add Prep notes and Open Interview share a row only while both fit, and never get
 * narrower than their labels (BIG-187).
 */
export const NextUpOnAPhone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas }) => {
    const next = canvas.getByRole("region", { name: "Round 3 · Technical Deep-Dive" });
    const links = ["Add Prep notes", "Open Interview"].map((name) =>
      within(next).getAllByRole("link", { name }).find((l) => l.checkVisibility()),
    );
    await expect(links.every((link) => link && link.scrollWidth <= link.clientWidth)).toBe(true);
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

/** Mark done… holds the Change Status choices; picking one saves at once, with today as the Done date. */
export const MarkDone: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mark done…" }));
    await userEvent.click(await canvas.findByRole("menuitem", { name: "Mark Rejected" }));
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("lumen", {
        status: "done",
        outcome: "rejected",
        done_on: todayLocal(),
      }),
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
