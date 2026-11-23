import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Field, RequiredNote } from "./field";
import { invalidProps } from "./field-error";
import { inputClasses } from "./input";
import { SaveStatus } from "./save-status";

// Field, FieldError, RequiredMark/RequiredNote and inputClasses, which together make a form field.
const meta = {
  component: Field,
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
  args: { id: "company", label: "Company", children: null },
  render: (args) => (
    <Field {...args}>
      <input
        id={args.id}
        className={inputClasses}
        defaultValue="Stripe"
        required={args.required}
        {...invalidProps(`${args.id}-error`, args.error)}
      />
    </Field>
  ),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A red * after the label; the form explains it once with RequiredNote. */
export const Required: Story = {
  args: { required: true },
  render: (args) => (
    <div className="flex flex-col gap-3">
      <RequiredNote />
      <Field {...args}>
        <input id={args.id} className={inputClasses} required />
      </Field>
    </div>
  ),
};

/** Brand-subtle border under the pointer. */
export const Hovered: Story = { parameters: { pseudo: { hover: true } } };

/** Brand border and ring. */
export const Focused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByLabelText("Company"));
    await expect(canvas.getByLabelText("Company")).toHaveFocus();
  },
};

export const Disabled: Story = {
  render: (args) => (
    <Field {...args}>
      <input id={args.id} className={`${inputClasses} disabled:opacity-60`} defaultValue="Stripe" disabled />
    </Field>
  ),
};

/** Danger border, and the error under the field, read with its label. */
export const Error: Story = {
  args: { required: true, error: "Enter the company’s name." },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText(/Company/)).toHaveAccessibleDescription("Enter the company’s name.");
  },
};

/** A field that saves itself shows its SaveStatus at the end of the label's line. */
export const WithStatus: Story = {
  args: { status: <SaveStatus status={{ phase: "saved", run: 1 }} label="Company" /> },
};

export const LongText: Story = {
  args: {
    label: "Where did you first hear about this role, and who referred you to the hiring team?",
    error: "Keep this under 200 characters so it fits on the Application’s card in the list.",
  },
};
