import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { deleteInterviewAndLeaveAction, updateInterviewAction } from "@/app/applications/actions";
import { prepLookBack, takeawayShowsOn } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { InterviewEditor } from "./interview-editor";
import { UnsavedChanges } from "./unsaved-changes";

// The Interview page under its "← <company>" link (BIG-178): the heading, the strip with this
// Interview outlined, and the Prep notes and Interview notes (BIG-180). Dates are counted from today. Server Actions are
// mocked (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const DAY = 86_400_000;
const daysFromNow = (days: number, hour = 15) => {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const lumen = application("lumen", {
  company: "Lumen Bio",
  title: "Engineering Manager, ML Platform",
  is_waiting: false,
  waiting_since: null,
  interviews: [
    interview("screen", { application_id: "lumen", kind: "recruiter_screen", at: daysFromNow(-17, 10), how_it_went: "Quick walkthrough of my last team." }),
    interview("manager", {
      application_id: "lumen",
      kind: "hiring_manager",
      at: daysFromNow(-10, 11),
      what_they_asked:
        "Tell me about a time you had to let someone go.\nHow do you decide what your team does not build?\nWhat does a good first 90 days look like here?",
      how_it_went:
        "Dug into how I handle underperformance and how I split time between hands-on work and people work. The incident story landed well: clear timeline, what I changed after.\n\nRambled on the roadmap question.",
      takeaway: "Lead with the decision, then the trade-off, then what I would measure.",
    }),
    interview("deep-dive", { application_id: "lumen", kind: "technical_deep_dive", at: daysFromNow(2, 11), completed: false }),
    interview("leadership", { application_id: "lumen", kind: "leadership", at: daysFromNow(9, 13), completed: false }),
  ],
});
const [, completed, upcoming] = lumen.interviews;

// Other Applications: Tilth Agritech has a Hiring Manager tomorrow, so Lumen Bio's Hiring Manager
// takeaway shows on its prep too; Fernway Health, rejected, had a Technical Deep-Dive with a takeaway.
const tilth = application("tilth", {
  company: "Tilth Agritech",
  is_waiting: false,
  waiting_since: null,
  interviews: [interview("tilth-manager", { application_id: "tilth", kind: "hiring_manager", at: daysFromNow(1, 10), completed: false })],
});
const fernway = application("fernway", {
  company: "Fernway Health",
  status: "done",
  outcome: "rejected",
  is_waiting: false,
  interviews: [
    interview("fernway-dive", {
      application_id: "fernway",
      kind: "technical_deep_dive",
      at: daysFromNow(-30, 14),
      takeaway: "Draw the system before talking through it.",
    }),
  ],
});
const everyApplication = [lumen, tilth, fernway];
const empty = { what_they_asked: null, how_it_went: null, takeaway: null };

const meta = {
  component: InterviewEditor,
  args: { app: lumen, interview: completed },
  // The page puts the editor inside UnsavedChanges.
  decorators: [
    (Story) => (
      <main>
        <UnsavedChanges>{Story()}</UnsavedChanges>
      </main>
    ),
  ],
} satisfies Meta<typeof InterviewEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Filled: a completed Interview, "Completed · 10 days ago", this one outlined on the strip, the
 * Takeaway for next time in its own card, How it went as text and They asked as a list.
 */
export const Completed: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Completed · 10 days ago")).toBeVisible();
    await expect(canvas.getByRole("link", { name: /^This interview · / })).toHaveAttribute("aria-current", "page");
    const takeaway = canvas.getByRole("region", { name: "Takeaway for next time" });
    await expect(takeaway).toHaveTextContent("Lead with the decision");
    const notes = canvas.getByRole("region", { name: "Interview notes" });
    await expect(within(notes).getByText(/Rambled on the roadmap question/)).toBeVisible();
    await expect(within(notes).getAllByRole("listitem")).toHaveLength(3);
    await expect(within(notes).getByRole("list", { name: "They asked" })).toBeVisible();
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
  },
};

/**
 * Says where its takeaway shows (BIG-181): on the prep for this Application's next Interview and
 * for the next Hiring Manager elsewhere, each a link to that Interview's page.
 */
export const TakeawayShowsOnPrep: Story = {
  args: { showsOn: takeawayShowsOn(everyApplication, lumen, completed) },
  play: async ({ canvas }) => {
    const takeaway = canvas.getByRole("region", { name: "Takeaway for next time" });
    const links = await within(takeaway).findAllByRole("link");
    await expect(links.map((link) => link.textContent)).toEqual([
      "Shows on the prep for Technical Deep-Dive · in 2 days",
      "Shows on the prep for your next Hiring Manager · Tilth Agritech, tomorrow",
    ]);
    await expect(links[0]).toHaveAttribute("href", "/applications/lumen/interviews/deep-dive");
  },
};

/**
 * Coming up, with no Prep notes: "Upcoming · in 2 days", the Before card offering Add Prep notes
 * ("Get ready for <weekday>"), with nothing to look back at, and the After card waiting for how it went, which Add Interview
 * notes opens into the three fields.
 */
export const Upcoming: Story = {
  args: { interview: upcoming },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText("Upcoming · in 2 days")).toBeVisible();
    await expect(canvas.getByText(/^Get ready for /)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add Prep notes" })).toBeVisible();
    await expect(canvas.getByText("Nothing yet, that’s expected")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Add Interview notes" }));
    await expect(canvas.getByRole("textbox", { name: "What they asked" })).toHaveFocus();
  },
};

/**
 * Coming up, looking back (BIG-181): the Before card shows this Application's Hiring Manager
 * takeaway, the last Technical Deep-Dive's at Fernway Health (a Done Application), and They asked
 * last time.
 */
export const UpcomingWithTakeaways: Story = {
  args: { interview: upcoming, lookBack: prepLookBack(everyApplication, lumen, upcoming) },
  play: async ({ canvas }) => {
    const prep = canvas.getByRole("region", { name: "Prep notes" });
    const takeaways = within(within(prep).getByRole("list", { name: "Takeaways for this Interview" })).getAllByRole("listitem");
    await expect(takeaways).toHaveLength(2);
    await expect(await within(takeaways[0]).findByText(/^[A-Z][a-z]{2} \d+$/)).toBeVisible();
    await expect(takeaways[0]).toHaveTextContent("Lead with the decision, then the trade-off, then what I would measure.");
    await expect(takeaways[1]).toHaveTextContent("From your last Technical Deep-Dive · Fernway Health");
    await expect(within(within(prep).getByRole("list", { name: "They asked last time" })).getAllByRole("listitem")).toHaveLength(3);
    await expect(within(prep).getByRole("button", { name: "Add Prep notes" })).toBeVisible();
  },
};

/** Coming up with Prep notes written: they show first, with Edit, above the After card. */
export const UpcomingWithPrepNotes: Story = {
  args: { interview: { ...upcoming, prep_notes: "Review the caching chapter.\n\n- Draw the diagram first\n- Ask about the on-call rotation" } },
  play: async ({ canvas }) => {
    const headings = canvas.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    await expect(headings).toEqual(["Prep notes", "Interview notes"]);
    await expect(within(canvas.getByRole("region", { name: "Prep notes" })).getAllByRole("listitem")).toHaveLength(2);
    await expect(canvas.getByRole("button", { name: "Edit Prep notes" })).toBeVisible();
  },
};

/** A week or more away, the Before card says the date, not the weekday. */
export const UpcomingLater: Story = {
  args: { interview: lumen.interviews[3] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Get ready for [A-Z][a-z]{2} \d+$/)).toBeVisible();
  },
};

/** Add Prep notes opens the field, which saves by itself with its own "Saved". */
export const WritingPrepNotes: Story = {
  args: { interview: upcoming },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add Prep notes" }));
    const field = canvas.getByRole("textbox", { name: "Prep notes" });
    await expect(field).toHaveFocus();
    await userEvent.type(field, "Review caching.");
    await userEvent.tab();
    await waitFor(() =>
      expect(updateInterviewAction).toHaveBeenCalledWith("lumen", upcoming.id, { prep_notes: "Review caching." }),
    );
    await expect(await canvas.findByText("Saved")).toBeVisible();
  },
};

/** Done: Interview notes first, then the Prep notes folded to their first lines behind Show Prep notes. */
export const CompletedWithPrepNotes: Story = {
  args: { interview: { ...completed, prep_notes: "Review the caching chapter.\nDraw the diagram first.\nAsk about the on-call rotation.\nBring the take-home." } },
  play: async ({ canvas, userEvent }) => {
    const headings = canvas.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    await expect(headings).toEqual(["Takeaway for next time", "Interview notes", "Prep notes"]);
    const prep = canvas.getByRole("region", { name: "Prep notes" });
    await expect(prep).not.toHaveTextContent("on-call");
    await userEvent.click(within(prep).getByRole("button", { name: "Show Prep notes" }));
    await expect(prep).toHaveTextContent("Bring the take-home.");
    await expect(within(prep).getByRole("button", { name: "Hide Prep notes" })).toHaveAttribute("aria-expanded", "true");
  },
};

/** Done with no Prep notes: the card isn't shown empty. */
export const CompletedWithoutPrepNotes: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("region", { name: "Prep notes" })).not.toBeInTheDocument();
  },
};

/** Opened Prep notes of a completed Interview edit like any notes: Edit, the field, Done. */
export const EditingPrepNotes: Story = {
  args: { interview: { ...completed, prep_notes: "Review the caching chapter." } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show Prep notes" }));
    await userEvent.click(canvas.getByRole("button", { name: "Edit Prep notes" }));
    await expect(canvas.getByRole("textbox", { name: "Prep notes" })).toHaveFocus();
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit Prep notes" })).toHaveFocus());
  },
};

/** Empty, completed: "Just finished", How did it go?, and the three empty fields straight away, none focused. */
export const JustFinished: Story = {
  args: { interview: { ...completed, ...empty } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Just finished · write it down while it’s fresh")).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 2, name: "How did it go?" })).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "What they asked" })).toHaveAttribute("placeholder", "One question per line");
    await expect(canvas.getByRole("textbox", { name: "How it went" })).toHaveAttribute("placeholder", "What landed, what didn't");
    await expect(canvas.getByRole("textbox", { name: "Takeaway for next time" })).toHaveAttribute(
      "placeholder",
      "One thing to do differently",
    );
    await expect(canvas.getByRole("textbox", { name: "What they asked" })).not.toHaveFocus();
  },
};

/** Editing: Edit turns the notes into three fields; Done goes back to the text and gives focus back to Edit. */
export const Editing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit Interview notes" }));
    await expect(canvas.getByRole("textbox", { name: "What they asked" })).toHaveFocus();
    await expect(canvas.getByRole("textbox", { name: "How it went" })).toHaveValue(completed.how_it_went);
    await expect(canvas.getByRole("textbox", { name: "Takeaway for next time" })).toHaveValue(completed.takeaway);
    await expect(canvas.queryByRole("region", { name: "Takeaway for next time" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit Interview notes" })).toHaveFocus());
  },
};

/** Each field saves by itself when it's left, with its own "Saved" that fades. */
export const SaveNotes: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit Interview notes" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Takeaway for next time" }), " Fast.");
    await userEvent.tab();
    await waitFor(() =>
      expect(updateInterviewAction).toHaveBeenCalledWith("lumen", completed.id, {
        takeaway: `${completed.takeaway} Fast.`,
      }),
    );
    await expect(await canvas.findByText("Saved")).toBeVisible();
  },
};

/** A failed save: the reason shows beside that field, and Done stays in it. */
export const SaveFails: Story = {
  beforeEach: () => {
    mocked(updateInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit Interview notes" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "How it went" }), "!");
    await userEvent.tab();
    await expect(await canvas.findByText(/Couldn’t reach Bigfoot’s server/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(canvas.getByRole("textbox", { name: "How it went" })).toHaveFocus();
  },
};

/** An Interview of a Done Application: "Done · Rejected" stays beside the badge, and the completed marks are grey. */
export const DoneApplication: Story = {
  args: { app: { ...lumen, status: "done", outcome: "rejected" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Done · Rejected")).toBeVisible();
    await expect(await canvas.findByText("Completed · 10 days ago")).toBeVisible();
  },
};

/** On a phone: the segments, "Interview 3 of 4" and a link to the next Interview, and Edit details in ⋯. */
export const Phone: Story = {
  args: { interview: lumen.interviews[2] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Interview 3 of 4")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Next: Leadership →" })).toBeVisible();
    // Hidden below sm, so it is out of the accessibility tree.
    await expect(canvas.queryByRole("button", { name: "Edit details" })).not.toBeInTheDocument();
  },
};

/** Delete Interview is in ⋯ and asks first. */
export const Delete: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^More actions/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Interview" }));
    const dialog = await screen.findByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(deleteInterviewAndLeaveAction).not.toHaveBeenCalled();
  },
};

export const LongText: Story = {
  args: {
    showsOn: takeawayShowsOn(everyApplication, lumen, completed),
    interview: {
      ...completed,
      takeaway: "Write the decision, the trade-off and the measure on a card before the call, and read it aloud once.",
      how_it_went:
        "A very long first line of Interview notes that goes on and on past the edge of the field so it has to wrap onto the next line and then some more.\n\nThen a second paragraph with follow-ups: thank-you email, send the take-home by Friday, ask about the team’s on-call rotation.",
    },
  },
};

// Lumen Bio with a long takeaway and a long question behind its Technical Deep-Dive.
const longLumen = {
  ...lumen,
  interviews: lumen.interviews.map((i) =>
    i.id === "manager"
      ? {
          ...i,
          takeaway: "Write the decision, the trade-off and the measure on a card before the call, and read it aloud once.",
          what_they_asked:
            "Walk me through the most complicated cross-team migration you have led, including how you kept every stakeholder informed along the way?",
        }
      : i,
  ),
};

/** Long takeaways, company names and questions looked back at wrap inside their boxes. */
export const UpcomingLongText: Story = {
  args: {
    app: longLumen,
    interview: upcoming,
    lookBack: prepLookBack(
      [longLumen, tilth, { ...fernway, company: "Northern Lights Software Engineering Co-operative of British Columbia" }],
      longLumen,
      upcoming,
    ),
  },
};
