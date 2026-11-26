import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { ParticipantsField, type ParticipantDraft, type ParticipantsProblem } from "./participants-field";

// Who the job seeker meets in an Interview (BIG-191), as Add Interview and Edit details show it.
// The field holds its rows itself here, as those forms do; `onChange` is a spy.
const dana = { id: "dana", role: "Recruiter", name: "Dana Lee" };
const sam = { id: "sam", role: "Engineering Manager", name: "Sam Okafor" };

function Stateful({
  initial,
  ...props
}: { initial: ParticipantDraft[] } & Omit<Parameters<typeof ParticipantsField>[0], "value">) {
  const [value, setValue] = useState(initial);
  return (
    <ParticipantsField
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange(next);
      }}
    />
  );
}

const meta = {
  component: Stateful,
  args: { id: "participants", initial: [{ key: "first", role: "", name: "" }], known: [], onChange: fn() },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof Stateful>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new Interview at an Application with nobody met yet: one blank row, and Add someone. */
export const Empty: Story = {};

/** People already on the Application are offered as "Dana Lee · Recruiter"; picking one adds their row. */
export const PickSomeoneMet: Story = {
  args: { known: [dana, sam] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Add someone you’ve met" }), "sam");
    const names = canvas.getAllByRole("textbox", { name: /^Name/ });
    await expect(names[1]).toHaveValue("Sam Okafor");
    await waitFor(() => expect(names[1]).toHaveFocus());
    await expect(canvas.getByText(/changes them on every Interview they’re in/)).toBeVisible();
    // Sam is in, so only Dana is still offered.
    await expect(canvas.getAllByRole("option").map((o) => o.textContent)).toEqual(["Add someone you’ve met", "Dana Lee · Recruiter"]);
  },
};

/** Several people, one with only a role, as Edit details opens them. */
export const Filled: Story = {
  args: {
    known: [dana, sam],
    initial: [
      { key: "dana", id: "dana", role: "Recruiter", name: "Dana Lee" },
      { key: "staff", role: "Staff Engineer", name: "" },
    ],
  },
};

/** Removing someone moves focus to the row that took their place. */
export const Remove: Story = {
  args: Filled.args,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Remove Dana Lee" }));
    await waitFor(() => expect(canvas.getByRole("textbox", { name: "Role" })).toHaveFocus());
    await expect(canvas.getByRole("textbox", { name: "Role" })).toHaveValue("Staff Engineer");
  },
};

/** A row without a role, marked, with the reason under the field. */
export const MissingRole: Story = {
  args: {
    initial: [{ key: "first", role: "", name: "Dana Lee" }],
    problem: { message: "Enter each person’s role.", key: "first" } satisfies ParticipantsProblem,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Role" })).toHaveAccessibleDescription("Enter each person’s role.");
  },
};

/** Long roles and names wrap their rows rather than the page; on a phone, Name goes under Role. */
export const LongText: Story = {
  args: {
    known: [{ id: "vp", role: "Vice President, Platform Engineering and Developer Productivity", name: "Maximiliana Featherstonehaugh-Okonkwo" }],
    initial: [{ key: "a", role: "Senior Director, Product Strategy and Operations", name: "Bartholomew Montgomery-Vasquez" }],
  },
};
