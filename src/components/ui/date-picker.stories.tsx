import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { DatePicker } from "./date-picker";
import { FieldError, invalidProps } from "./field-error";
import { fieldLabelClasses } from "./field";

/** Holds the value, as a form would, so picking a date shows it. */
function Controlled(props: ComponentProps<typeof DatePicker>) {
  const [value, setValue] = useState(props.value);
  return (
    <div className="max-w-xs">
      <label htmlFor={props.id} className={fieldLabelClasses}>
        {props.label}
      </label>
      <DatePicker
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next);
          props.onChange(next);
        }}
      />
    </div>
  );
}

const meta = {
  component: DatePicker,
  render: (args) => <Controlled {...args} />,
  args: { id: "applied", label: "Applied", value: "2026-11-03", onChange: fn() },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: "" } };
export const Hovered: Story = { parameters: { pseudo: { hover: true } } };

/** Opened from the keyboard: focus moves to the picked day. */
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Applied/ }));
    await expect(await screen.findByRole("button", { name: /November 3, 2026, selected/ })).toHaveFocus();
  },
};

/** A clearable date shows Clear under the calendar. */
export const Clearable: Story = {
  args: { clearable: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Applied/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Clear" }));
    await expect(args.onChange).toHaveBeenCalledWith("");
    // Axe looks once the popover has finished closing: during its fade-out the page is still
    // aria-hidden while focus is already back on the field.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const Error: Story = {
  args: { value: "", ...invalidProps("applied-error", "Enter the date you applied.") },
  render: (args) => (
    <div className="max-w-xs">
      <Controlled {...args} />
      <FieldError id="applied-error" error="Enter the date you applied." />
    </div>
  ),
};

/** A long placeholder wraps inside the field rather than being cut off. */
export const LongText: Story = {
  args: { value: "", placeholder: "Pick the day the recruiter first got in touch with you" },
};
