import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { previewApplications } from "@/lib/mock-data";
import { InterviewHeading } from "./interview-heading";

// The Interview page's heading, for an Interview from the landing page's sample data. Server
// Actions are mocked (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const app = previewApplications.find((a) => a.interviews.some((i) => i.at))!;
const interview = app.interviews.find((i) => i.at)!;

const meta = {
  component: InterviewHeading,
  args: { app, interview },
} satisfies Meta<typeof InterviewHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** One saved before dates were required shows "Date needed". */
export const DateNeeded: Story = {
  args: { interview: { ...interview, at: null } },
};

/** The edit button turns the kind and the date into fields, with focus on Kind. */
export const Editing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit kind and date" }));
    await expect(canvas.getByRole("combobox", { name: /^Kind/ })).toHaveFocus();
  },
};

/** A new kind saves on Save. */
export const SaveKind: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit kind and date" }));
    const kind = canvas.getByRole("combobox", { name: /^Kind/ });
    const other = interview.kind === "leadership" ? "behavioural" : "leadership";
    await userEvent.selectOptions(kind, other);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(actions.updateInterviewAction).toHaveBeenCalledWith(app.id, interview.id, { kind: other }),
    );
  },
};
