import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor } from "storybook/test";
import { deleteInterviewAndLeaveAction, updateInterviewAction } from "@/app/applications/actions";
import { previewApplications } from "@/lib/mock-data";
import { InterviewEditor } from "./interview-editor";
import { UnsavedChanges } from "./unsaved-changes";

// The Interview page's body, under its heading: the Interview notes and Delete Interview, for an
// Interview from the landing page's sample data. Server Actions are mocked
// (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const app = previewApplications.find((a) => a.id === "datadog")!;
const interview = { ...app.interviews[0], notes: "Friendly. Asked why I left my last role.\nFollow up next week." };

const meta = {
  component: InterviewEditor,
  args: { app, interview },
  // The page puts the editor inside UnsavedChanges, with the heading.
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <UnsavedChanges>{Story()}</UnsavedChanges>
      </div>
    ),
  ],
} satisfies Meta<typeof InterviewEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** With Interview notes. */
export const Default: Story = {};

/** No Interview notes yet. */
export const NoNotes: Story = { args: { interview: { ...interview, notes: null } } };

/** The notes save by themselves when the field is left. */
export const SaveNotes: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Interview notes" }), " Sent a thank-you.");
    await userEvent.tab();
    await waitFor(() =>
      expect(updateInterviewAction).toHaveBeenCalledWith(app.id, interview.id, {
        notes: `${interview.notes} Sent a thank-you.`,
      }),
    );
    await expect(await canvas.findByText("Saved")).toBeVisible();
  },
};

/** The server refuses a save: the reason shows beside the notes. */
export const SaveFails: Story = {
  beforeEach: () => {
    mocked(updateInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Interview notes" }), "!");
    await userEvent.tab();
    await expect(await canvas.findByText(/Couldn’t reach Bigfoot’s server/)).toBeVisible();
  },
};

/** Delete Interview asks first. */
export const Delete: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete Interview" }));
    const dialog = await screen.findByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(deleteInterviewAndLeaveAction).not.toHaveBeenCalled();
  },
};

export const LongText: Story = {
  args: {
    interview: {
      ...interview,
      notes:
        "A very long first line of Interview notes that goes on and on past the edge of the field so it has to wrap onto the next line and then some more.\n\nThen a second paragraph with follow-ups: thank-you email, send the take-home by Friday, ask about the team’s on-call rotation.",
    },
  },
};
