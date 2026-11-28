import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { deleteInterviewAndLeaveAction, updateInterviewAction } from "@/app/applications/actions";
import { prepLookBack, takeawayShowsOn } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { expectBigfootClear } from "@/test/art";
import { InterviewEditor } from "./interview-editor";
import { UnsavedChanges } from "./unsaved-changes";

// The Interview page under its "Dashboard / <company>" breadcrumb (BIG-178, BIG-202): the heading, the strip with this
// Interview outlined, the Prep notes and Interview notes (BIG-180), and links to the Rounds either side. Dates are counted from today. Server Actions are
// mocked (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const daysFromNow = (days: number, hour = 15) => {
  const date = new Date();
  date.setDate(date.getDate() + days); // calendar days: days × 24h misses by one across a DST change
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const lumen = application("lumen", {
  company: "Lumen Bio",
  title: "Engineering Manager, ML Platform",
  is_waiting: false,
  waiting_since: null,
  interviews: [
    interview("screen", { application_id: "lumen", category: "recruiter", title: "Recruiter Screen", at: daysFromNow(-17, 10), how_it_went: "Quick walkthrough of my last team." }),
    interview("manager", {
      application_id: "lumen",
      category: "hiring_manager", title: "Hiring Manager",
      at: daysFromNow(-10, 11),
      what_they_asked:
        "Tell me about a time you had to let someone go.\nHow do you decide what your team does not build?\nWhat does a good first 90 days look like here?",
      how_it_went:
        "Dug into how I handle underperformance and how I split time between hands-on work and people work. The incident story landed well: clear timeline, what I changed after.\n\nRambled on the roadmap question.",
      takeaway: "Lead with the decision, then the trade-off, then what I would measure.",
    }),
    interview("deep-dive", { application_id: "lumen", category: "project_deep_dive", title: "Technical Deep-Dive", at: daysFromNow(2, 11), completed: false }),
    interview("leadership", { application_id: "lumen", category: "people_management", title: "Leadership", at: daysFromNow(9, 13), completed: false }),
  ],
});
const [, completed, upcoming] = lumen.interviews;

// Other Applications: Tilth Agritech has a Hiring Manager tomorrow, so Lumen Bio's Hiring Manager
// takeaway shows on its prep too; Fernway Health, rejected, had a Technical Deep-Dive with a takeaway.
const tilth = application("tilth", {
  company: "Tilth Agritech",
  is_waiting: false,
  waiting_since: null,
  interviews: [interview("tilth-manager", { application_id: "tilth", category: "hiring_manager", title: "Hiring Manager", at: daysFromNow(1, 10), completed: false })],
});
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
const everyApplication = [lumen, tilth, fernway];
const empty = { what_they_asked: null, how_it_went: null, takeaway: null };
/** Bigfoot in an empty notes card (BIG-228): "notebook" in Prep notes, "writing" in Interview notes. */
const art = (canvasElement: HTMLElement, name: "notebook" | "writing") =>
  canvasElement.querySelector<HTMLImageElement>(`img[src*="bigfoot-${name}"]`);

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
 * Takeaway for next time in its own card, How it went as text and They asked as a list, and links
 * to Round 1 and Round 3 at the foot. Written notes hold no Bigfoot.
 */
export const Completed: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("Completed · 10 days ago")).toBeVisible();
    // Notes written: no Bigfoot (BIG-228).
    await expect(art(canvasElement, "writing")).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: /^Round \d · This interview · / })).toHaveAttribute("aria-current", "page");
    // The foot links to the Rounds either side (BIG-202).
    const rounds = canvas.getByRole("navigation", { name: "Other Rounds" });
    await expect(within(rounds).getByRole("link", { name: "Previous: Round 1 · Recruiter Screen" })).toHaveAttribute(
      "href",
      "/applications/lumen/interviews/screen",
    );
    await expect(within(rounds).getByRole("link", { name: "Next: Round 3 · Technical Deep-Dive" })).toBeVisible();
    const takeaway = canvas.getByRole("region", { name: "Takeaway for next time" });
    await expect(takeaway).toHaveTextContent("Lead with the decision");
    const notes = canvas.getByRole("region", { name: "Interview notes" });
    await expect(within(notes).getByText(/Rambled on the roadmap question/)).toBeVisible();
    await expect(within(notes).getAllByRole("listitem")).toHaveLength(3);
    await expect(within(notes).getByRole("list", { name: "They asked" })).toBeVisible();
    // A card's Edit is the icon-only EditButton (BIG-240): named, with no visible text.
    await expect(within(notes).getByRole("button", { name: "Edit Interview notes" })).toHaveTextContent("");
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
      "Shows on Round 3 · Technical Deep-Dive, in 2 days",
      "Shows on your next Hiring Manager: Tilth Agritech, tomorrow",
    ]);
    await expect(links[0]).toHaveAttribute("href", "/applications/lumen/interviews/deep-dive");
  },
};

/**
 * Coming up, with no Prep notes: "Upcoming · in 2 days", the Before card offering Add Prep notes
 * ("Get ready for <weekday>"), with nothing to look back at, and the After card waiting for how it went, which Add Interview
 * notes opens into the three fields. Each empty card holds Bigfoot (BIG-228); the open fields don't.
 */
export const Upcoming: Story = {
  args: { interview: upcoming },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(await canvas.findByText("Upcoming · in 2 days")).toBeVisible();
    await expect(canvas.getByText(/^Get ready for /)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add Prep notes" })).toBeVisible();
    await expect(canvas.getByText("Nothing yet, that’s expected")).toBeVisible();
    await expect(art(canvasElement, "notebook")).toBeInTheDocument();
    await expect(art(canvasElement, "writing")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Add Interview notes" }));
    await expect(canvas.getByRole("textbox", { name: "What they asked" })).toHaveFocus();
    await expect(art(canvasElement, "writing")).not.toBeInTheDocument();
  },
};

/** Coming up, on the narrowest phone: each empty card's Bigfoot, smaller, beside its button and clear of the words (BIG-232). */
export const UpcomingPhone: Story = {
  args: { interview: upcoming },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("Upcoming · in 2 days")).toBeVisible();
    await expectBigfootClear(canvasElement, "bigfoot-notebook");
    await expectBigfootClear(canvasElement, "bigfoot-writing");
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
    await expect(takeaways[1]).toHaveTextContent("From your last Project Deep-dive · Fernway Health");
    await expect(within(within(prep).getByRole("list", { name: "They asked last time" })).getAllByRole("listitem")).toHaveLength(3);
    await expect(within(prep).getByRole("button", { name: "Add Prep notes" })).toBeVisible();
  },
};

/** Coming up with Prep notes written: they show first, with Edit, above the After card, and without Bigfoot. */
export const UpcomingWithPrepNotes: Story = {
  args: { interview: { ...upcoming, prep_notes: "Review the caching chapter.\n\n- Draw the diagram first\n- Ask about the on-call rotation" } },
  play: async ({ canvas, canvasElement }) => {
    await expect(art(canvasElement, "notebook")).not.toBeInTheDocument();
    await expect(art(canvasElement, "writing")).toBeInTheDocument();
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
    await waitFor(() => expect(field).toHaveFocus());
    await userEvent.keyboard("Review caching.");
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
    await waitFor(() => expect(canvas.getByRole("textbox", { name: "Prep notes" })).toHaveFocus());
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
    // How it went formats as it's written (BIG-214): its placeholder sits on its empty first paragraph.
    await waitFor(() =>
      expect(within(canvas.getByRole("textbox", { name: "How it went" })).getByText("", { selector: "p" })).toHaveAttribute(
        "data-placeholder",
        "What landed, what didn't",
      ),
    );
    await expect(canvas.getByRole("textbox", { name: "Takeaway for next time" })).toHaveAttribute(
      "placeholder",
      "One thing to do differently",
    );
    await expect(canvas.getByRole("textbox", { name: "What they asked" })).not.toHaveFocus();
  },
};

/** Done with nothing written: "No Interview notes yet." and Add Interview notes, with Bigfoot writing beside them (BIG-228). */
export const ClosedWithoutNotes: Story = {
  args: { interview: { ...completed, ...empty } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(art(canvasElement, "writing")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(canvas.getByText("No Interview notes yet.")).toBeVisible();
    await expect(art(canvasElement, "writing")).toBeInTheDocument();
  },
};

/** Editing: Edit turns the notes into three fields; Done goes back to the text and gives focus back to Edit. */
export const Editing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit Interview notes" }));
    await expect(canvas.getByRole("textbox", { name: "What they asked" })).toHaveFocus();
    await expect(await canvas.findByText("Rambled on the roadmap question.")).toBeVisible();
    await expect(canvas.getByRole("toolbar", { name: "Formatting" })).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "Takeaway for next time" })).toHaveValue(completed.takeaway);
    await expect(canvas.queryByRole("region", { name: "Takeaway for next time" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit Interview notes" })).toHaveFocus());
  },
};

/** How it went written with titles, bold, italics, underline and lists (BIG-214), read back formatted. */
export const FormattedNotes: Story = {
  args: {
    interview: {
      ...completed,
      how_it_went:
        "# Round one\n\n**Strong** on the *incident story*, <u>weak</u> on the roadmap.\n\n## Follow up\n\n1. Send a thank-you\n2. Ask about on-call\n\n- Bring numbers\n- Draw first",
    },
  },
  play: async ({ canvas }) => {
    const notes = canvas.getByRole("region", { name: "Interview notes" });
    await expect(within(notes).getByRole("heading", { level: 3, name: "Round one" })).toBeVisible();
    await expect(within(notes).getByRole("heading", { level: 3, name: "Follow up" })).toBeVisible();
    await expect(within(notes).getByText("Strong").tagName).toBe("STRONG");
    await expect(within(notes).getByText("weak").tagName).toBe("U");
    await expect(within(notes).getAllByRole("list")[0].tagName).toBe("OL");
  },
};

/**
 * Writing How it went with the toolbar and with "- " at a line's start, typed for real: it saves as
 * Markdown, and Done reads it back formatted.
 */
export const WritingFormattedNotes: Story = {
  args: { interview: { ...completed, ...empty } },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole("textbox", { name: "How it went" });
    // keyboard, not type: type clicks the field first, which would move the caret and drop Bold.
    await userEvent.click(field);
    await userEvent.click(canvas.getByRole("button", { name: "Large title" }));
    await userEvent.keyboard("Round one{Enter}");
    await userEvent.click(canvas.getByRole("button", { name: "Bold" }));
    await expect(canvas.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("Strong");
    await userEvent.click(canvas.getByRole("button", { name: "Bold" }));
    await userEvent.keyboard(" start{Enter}- Send a thank-you");
    await expect(canvas.getByRole("button", { name: "Bulleted list" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.tab();
    await waitFor(() =>
      expect(updateInterviewAction).toHaveBeenLastCalledWith("lumen", completed.id, {
        how_it_went: "# Round one\n\n**Strong** start\n\n- Send a thank-you",
      }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    const notes = canvas.getByRole("region", { name: "Interview notes" });
    await expect(within(notes).getByRole("heading", { level: 3, name: "Round one" })).toBeVisible();
    await expect(within(notes).getByText("Strong").tagName).toBe("STRONG");
    await expect(within(notes).getByRole("listitem")).toHaveTextContent("Send a thank-you");
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

/** On a phone: the segments, "Round 3 of 4" and a link to the next Interview, Edit details in ⋯, and "R2 · …" at the foot. */
export const Phone: Story = {
  args: { interview: lumen.interviews[2] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Round 3 of 4")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Next: R4 · Leadership →" })).toBeVisible();
    // The foot's links shorten to "R2 · …" on a phone.
    await expect(canvas.getByRole("link", { name: "Previous: R2 · Hiring Manager" })).toBeVisible();
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
