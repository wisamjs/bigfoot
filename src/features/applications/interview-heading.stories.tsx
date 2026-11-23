import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { InterviewHeading } from "./interview-heading";

// The Interview page's heading (BIG-178). Dates are counted from today, so the badge reads as it
// would on the page. Server Actions are mocked (src/app/applications/__mocks__/actions.ts) and
// succeed unless a story says otherwise.
const DAY = 86_400_000;
const daysFromNow = (days: number, hour = 15) => {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const upcoming = interview("deep-dive", {
  application_id: "lumen",
  kind: "technical_deep_dive",
  at: daysFromNow(2, 11),
  completed: false,
});
const completed = interview("manager", { application_id: "lumen", kind: "hiring_manager", at: daysFromNow(-10, 11) });
const lumen = application("lumen", {
  company: "Lumen Bio",
  title: "Engineering Manager, ML Platform",
  interviews: [completed, upcoming],
});

const meta = {
  component: InterviewHeading,
  args: { app: lumen, interview: upcoming },
  decorators: [(Story) => <main className="max-w-4xl">{Story()}</main>],
} satisfies Meta<typeof InterviewHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Coming up: the kind as the title, its date and time with the year, and a blue "Upcoming · in 2 days". */
export const Upcoming: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Technical Deep-Dive" })).toBeVisible();
    await expect(await canvas.findByText("Upcoming · in 2 days")).toBeVisible();
  },
};

/** Past: a green "Completed · 10 days ago". */
export const Completed: Story = {
  args: { interview: completed },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Completed · 10 days ago")).toBeVisible();
  },
};

/** A Done Application: its "Done · Rejected" badge stays, and the Interview's completed badge turns grey. */
export const DoneApplication: Story = {
  args: { app: { ...lumen, status: "done", outcome: "rejected" }, interview: completed },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Done · Rejected")).toBeVisible();
    await expect(await canvas.findByText("Completed · 10 days ago")).toBeVisible();
  },
};

/** Edit details turns the kind and the date into fields, with focus on Kind. */
export const Editing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await expect(canvas.getByRole("combobox", { name: /^Kind/ })).toHaveFocus();
  },
};

/** A new kind saves on Save. */
export const SaveKind: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    const kind = canvas.getByRole("combobox", { name: /^Kind/ });
    const other = upcoming.kind === "leadership" ? "behavioural" : "leadership";
    await userEvent.selectOptions(kind, other);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(actions.updateInterviewAction).toHaveBeenCalledWith("lumen", upcoming.id, { kind: other }),
    );
  },
};

/** ⋯ holds Delete Interview, which asks first. */
export const Delete: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^More actions/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Interview" }));
    await expect(await screen.findByRole("dialog", { name: "Delete Interview?" })).toBeVisible();
    await expect(actions.deleteInterviewAndLeaveAction).not.toHaveBeenCalled();
  },
};

/** On a phone, Edit details moves into ⋯, above Delete Interview. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^More actions/ }));
    await expect(await screen.findByRole("menuitem", { name: "Edit details" })).toBeVisible();
    await expect(screen.getByRole("menuitem", { name: "Delete Interview" })).toBeVisible();
  },
};
