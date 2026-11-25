import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { SaveStatus } from "./save-status";

const meta = {
  component: SaveStatus,
  args: { status: { phase: "saving" }, label: "Interview 2 title", onRetry: fn() },
} satisfies Meta<typeof SaveStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saving: Story = {};

/** Fades out after a moment; reload the story to see it again. */
export const Saved: Story = { args: { status: { phase: "saved", run: 1 } } };

export const Error: Story = {
  args: { status: { phase: "failed", error: "Couldn’t save. Check your connection and try again." } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Retry, Interview 2 title" }));
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

export const RetryFocused: Story = {
  args: Error.args,
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: /Retry/ })).toHaveFocus();
  },
};

/** Nothing to show, but the live region is there, so the first status is announced. */
export const Idle: Story = { args: { status: { phase: "idle" } } };

/** A long error wraps, and Retry wraps to the next line with it. */
export const LongText: Story = {
  args: {
    status: {
      phase: "failed",
      error: "Bigfoot’s server didn’t answer in time, so the Interview’s title wasn’t saved. Your change is still here.",
    },
  },
  decorators: [(Story) => <div className="max-w-64">{Story()}</div>],
};
