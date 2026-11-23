import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { deleteInterviewAndLeaveAction, updateInterviewAction } from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { InterviewEditor } from "./interview-editor";
import { UnsavedChanges } from "./unsaved-changes";

// The Interview page under its "← <company>" link (BIG-178): the heading, the strip with this
// Interview outlined, and the Interview notes. Dates are counted from today. Server Actions are
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
    interview("screen", { application_id: "lumen", kind: "recruiter_screen", at: daysFromNow(-17, 10), notes: "Quick walkthrough of my last team." }),
    interview("manager", {
      application_id: "lumen",
      kind: "hiring_manager",
      at: daysFromNow(-10, 11),
      notes: "Dug into how I handle underperformance.\n\nWent well. Follow-ups:\n- Send the roadmap doc\n- Thank-you email\n- Ask about on-call",
    }),
    interview("deep-dive", { application_id: "lumen", kind: "technical_deep_dive", at: daysFromNow(2, 11), completed: false }),
    interview("leadership", { application_id: "lumen", kind: "leadership", at: daysFromNow(9, 13), completed: false }),
  ],
});
const [, completed, upcoming] = lumen.interviews;

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

/** A completed Interview: "Completed · 10 days ago", this one outlined on the strip, its notes read as text with "- " lines as a list. */
export const Completed: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Completed · 10 days ago")).toBeVisible();
    await expect(canvas.getByRole("link", { name: /^This interview · / })).toHaveAttribute("aria-current", "page");
    await expect(within(canvas.getByRole("region", { name: "Interview notes" })).getAllByRole("listitem")).toHaveLength(3);
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
  },
};

/** Coming up: "Upcoming · in 2 days", and Add Interview notes while it has none. */
export const Upcoming: Story = {
  args: { interview: upcoming },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Upcoming · in 2 days")).toBeVisible();
    await expect(canvas.getByText("No Interview notes yet.")).toBeVisible();
  },
};

/** No Interview notes yet: the card says so, and Add Interview notes opens the field. */
export const NoNotes: Story = {
  args: { interview: { ...completed, notes: null } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add Interview notes" }));
    await expect(canvas.getByRole("textbox", { name: "Interview notes" })).toHaveFocus();
  },
};

/** Edit turns the notes into a field; Done goes back to the text and gives focus back to Edit. */
export const Editing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit Interview notes" }));
    await expect(canvas.getByRole("textbox", { name: "Interview notes" })).toHaveFocus();
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit Interview notes" })).toHaveFocus());
  },
};

/** The notes save by themselves when the field is left, with a "Saved" that fades. */
export const SaveNotes: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit Interview notes" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Interview notes" }), " Sent a thank-you.");
    await userEvent.tab();
    await waitFor(() =>
      expect(updateInterviewAction).toHaveBeenCalledWith("lumen", completed.id, {
        notes: `${completed.notes} Sent a thank-you.`,
      }),
    );
    await expect(await canvas.findByText("Saved")).toBeVisible();
  },
};

/** The server refuses a save: the reason shows beside the notes, and Done stays in the field. */
export const SaveFails: Story = {
  beforeEach: () => {
    mocked(updateInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit Interview notes" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Interview notes" }), "!");
    await userEvent.tab();
    await expect(await canvas.findByText(/Couldn’t reach Bigfoot’s server/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(canvas.getByRole("textbox", { name: "Interview notes" })).toHaveFocus();
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
    interview: {
      ...completed,
      notes:
        "A very long first line of Interview notes that goes on and on past the edge of the field so it has to wrap onto the next line and then some more.\n\nThen a second paragraph with follow-ups: thank-you email, send the take-home by Friday, ask about the team’s on-call rotation.",
    },
  },
};
