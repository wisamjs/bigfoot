import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { DateTimePicker } from "./date-time-picker";
import { FieldError } from "./field-error";

const meta = {
  component: DateTimePicker,
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
  args: {
    id: "interview-1",
    dateLabel: "Date, Interview 1",
    timeLabel: "Time, Interview 1",
    value: "2026-11-24T14:30",
    onChange: fn(),
  },
} satisfies Meta<typeof DateTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No date yet, so the time field waits, disabled. */
export const Empty: Story = {
  args: { value: "" },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Time, Interview 1")).toBeDisabled();
  },
};

export const Focused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByLabelText("Time, Interview 1"));
    await expect(canvas.getByLabelText("Time, Interview 1")).toHaveFocus();
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const Error: Story = {
  args: { value: "2026-11-24T", invalid: { time: true }, "aria-describedby": "interview-1-error" },
  render: (args) => (
    <>
      <DateTimePicker {...args} />
      <FieldError id="interview-1-error" error="Add a time, or clear the date." />
    </>
  ),
};

/** Long labels are accessible names only; the fields keep their width. */
export const LongText: Story = {
  args: {
    dateLabel: "Date of the onsite loop with the platform team, Interview 4",
    timeLabel: "Start time of the onsite loop with the platform team, Interview 4",
  },
};
