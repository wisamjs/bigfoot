import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, within } from "storybook/test";
import type { SaveResult } from "@/hooks/use-save-status";
import { application, interview } from "@/test/applications";
import { MarkDoneDialog } from "./mark-done-dialog";

// The Mark done dialog (BIG-222), as Mark Rejected opens it on an Application page. Dates are
// counted from today, so the Interview still ahead is always ahead.
const daysFromNow = (days: number, hour = 15) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const screenRound = interview("screen", { application_id: "lumen", category: "recruiter", title: "Recruiter Screen", at: daysFromNow(-12) });
const deepDive = interview("deep-dive", {
  application_id: "lumen",
  category: "project_deep_dive",
  title: "Technical Deep-Dive",
  at: daysFromNow(2, 11),
  completed: false,
});
const leadership = interview("leadership", { application_id: "lumen", category: "people_management", title: "Leadership", at: null, completed: false });
const lumen = application("lumen", {
  company: "Lumen Bio",
  applied_on: daysFromNow(-26).slice(0, 10),
  is_waiting: false,
  interviews: [screenRound, deepDive, leadership],
});

const meta = {
  component: MarkDoneDialog,
  args: {
    app: lumen,
    asking: { change: { status: "done", outcome: "rejected", done_on: daysFromNow(0).slice(0, 10) }, interviews: [deepDive, leadership] },
    onConfirm: fn(async (): Promise<SaveResult> => ({ ok: true })),
    onClose: fn(),
  },
} satisfies Meta<typeof MarkDoneDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const dialog = () => screen.findByRole("dialog", { name: "Did these Interviews happen?" });

/** One row per Interview, by Round, each starting on No / Didn't happen: one click confirms. */
export const Default: Story = {
  play: async ({ args, userEvent }) => {
    const open = await dialog();
    await expect(within(open).getByRole("radiogroup", { name: "Round 2 · Technical Deep-Dive" })).toBeVisible();
    await expect(within(open).getByRole("radio", { name: "Didn’t happen" })).toBeChecked();
    await expect(within(open).getByRole("radio", { name: "No" })).toBeChecked();
    await userEvent.click(within(open).getByRole("button", { name: "Mark Rejected" }));
    await expect(args.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        interviews: [
          { id: "deep-dive", at: null },
          { id: "leadership", at: null },
        ],
      }),
    );
  },
};

/** Keep the date leaves the Interview still ahead as it is. */
export const KeepTheDate: Story = {
  play: async ({ args, userEvent }) => {
    const open = await dialog();
    await userEvent.click(within(open).getByRole("radio", { name: "Keep the date" }));
    await userEvent.click(within(open).getByRole("button", { name: "Mark Rejected" }));
    await expect(args.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ interviews: [{ id: "deep-dive", at: deepDive.at }, { id: "leadership", at: null }] }),
    );
  },
};

/** Yes on an Unscheduled Interview asks when it happened, and saving without a date says so. */
export const HappenedNeedsADate: Story = {
  play: async ({ args, userEvent }) => {
    const open = await dialog();
    await userEvent.click(within(open).getByRole("radio", { name: "Yes" }));
    await expect(within(open).getByRole("group", { name: "When did it happen?" })).toBeVisible();
    await userEvent.click(within(open).getByRole("button", { name: "Mark Rejected" }));
    await expect(within(open).getByText("Enter when it happened.")).toBeVisible();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** Only Unscheduled Interviews to ask about. */
export const OnlyUnscheduled: Story = {
  args: { asking: { change: { status: "done", outcome: "withdrawn", done_on: null }, interviews: [leadership] } },
  play: async () => {
    const open = await dialog();
    await expect(within(open).getByRole("button", { name: "Mark Withdrawn" })).toBeVisible();
    await expect(within(open).queryByRole("radio", { name: "Keep the date" })).not.toBeInTheDocument();
  },
};

/** The save fails: the error stays in the dialog, beside its button. */
export const SaveFails: Story = {
  args: { onConfirm: fn(async (): Promise<SaveResult> => ({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." })) },
  play: async ({ userEvent }) => {
    const open = await dialog();
    await userEvent.click(within(open).getByRole("button", { name: "Mark Rejected" }));
    await expect(await within(open).findByRole("alert")).toHaveTextContent("Couldn’t reach Bigfoot’s server. Try again.");
  },
};

/** On a phone: the rows and their choices fit the width. */
export const OnAPhone: Story = {
  ...HappenedNeedsADate,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

/** Long titles wrap inside the dialog. */
export const LongText: Story = {
  args: {
    asking: {
      change: { status: "done", outcome: "rejected", done_on: null },
      interviews: [
        { ...leadership, title: "Leadership and cross-functional collaboration with the VP of Product and the Director of Design" },
      ],
    },
    app: {
      ...lumen,
      interviews: [
        screenRound,
        deepDive,
        { ...leadership, title: "Leadership and cross-functional collaboration with the VP of Product and the Director of Design" },
      ],
    },
  },
};
