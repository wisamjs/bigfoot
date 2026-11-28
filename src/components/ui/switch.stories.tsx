import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { Switch } from "./switch";

type Props = { label: string; checked?: boolean; disabled?: boolean; onCheckedChange: (checked: boolean) => void };

/** A labelled switch that holds its value, as a form would; the 44px-tall label is its touch target. */
function Labelled({ label, checked: initial = false, disabled, onCheckedChange }: Props) {
  const [checked, setChecked] = useState(initial);
  return (
    <label htmlFor="story-switch" className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-heading">
      <Switch
        id="story-switch"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => {
          setChecked(next);
          onCheckedChange(next);
        }}
      />
      {label}
    </label>
  );
}

const meta = {
  component: Labelled,
  args: { label: "Date TBD", onCheckedChange: fn() },
} satisfies Meta<typeof Labelled>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { checked: true } };

export const Hovered: Story = { parameters: { pseudo: { hover: true } } };

/** Reached with Tab; Space turns it on and clicking the label turns it off. */
export const Keyboard: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.tab();
    const toggle = canvas.getByRole("switch", { name: "Date TBD" });
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(toggle).toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(canvas.getByText("Date TBD"));
    await expect(toggle).not.toBeChecked();
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const DisabledOn: Story = { args: { disabled: true, checked: true } };

export const LongText: Story = {
  args: { label: "Postponed, with no new date yet" },
  decorators: [
    (Story) => (
      <div className="max-w-48">
        <Story />
      </div>
    ),
  ],
};
