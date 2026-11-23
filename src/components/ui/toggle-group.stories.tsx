import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { expect, fn } from "storybook/test";
import { fieldLabelClasses } from "./field";
import { FieldError, invalidProps } from "./field-error";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

type Props = {
  options: string[];
  value?: string;
  disabled?: boolean;
  error?: string;
  onValueChange: (value: string) => void;
} & Pick<ComponentProps<typeof ToggleGroup>, "className">;

/** A labelled single-choice group that holds its value, as a form would. */
function Controlled({ options, value: initial = "", disabled, error, onValueChange, className }: Props) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <div id="location-label" className={fieldLabelClasses}>
        Location
      </div>
      <ToggleGroup
        type="single"
        aria-labelledby="location-label"
        value={value}
        disabled={disabled}
        className={className}
        onValueChange={(next) => {
          setValue(next);
          onValueChange(next);
        }}
        {...invalidProps("location-error", error)}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option} value={option}>
            {option}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FieldError id="location-error" error={error} />
    </div>
  );
}

const meta = {
  component: Controlled,
  args: { options: ["In-Office", "Remote", "Hybrid"], onValueChange: fn() },
} satisfies Meta<typeof Controlled>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing picked yet. */
export const Default: Story = {};

export const Picked: Story = { args: { value: "Hybrid" } };

export const Hovered: Story = { args: { value: "Remote" }, parameters: { pseudo: { hover: true } } };

/** Reached with Tab, then moved with the arrow keys; Space picks. Picking the picked one again clears it. */
export const Keyboard: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("radio", { name: "In-Office" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", { name: "Remote" })).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("Remote");
    await userEvent.keyboard(" ");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("");
  },
};

export const Disabled: Story = { args: { value: "Remote", disabled: true } };

export const Error: Story = { args: { error: "Choose a Location." } };

/** Short numbered choices, like days in office. */
export const Numbers: Story = { args: { options: ["1", "2", "3", "4"], value: "3" } };

/** Long labels in a narrow column: each wraps inside its button rather than the strip overflowing. */
export const LongText: Story = {
  args: {
    options: ["In the office every weekday", "Fully remote within Canada", "Hybrid, with a flexible schedule"],
  },
  decorators: [
    (Story) => (
      <div className="max-w-72">
        <Story />
      </div>
    ),
  ],
};
