import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { PasscodeField } from "./passcode-field";

// A Share link's Passcode field, as the create form and the Change passcode dialog show it.

const meta = {
  component: PasscodeField,
  args: { id: "passcode" },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof PasscodeField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty and masked. */
export const Default: Story = {};

export const WithError: Story = { args: { error: "Use at least 8 characters." } };

/** Suggest fills in a Passcode that's easy to say out loud, and shows it. */
export const Suggest: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Suggest" }));
    const input = canvas.getByLabelText("Passcode");
    await expect((input as HTMLInputElement).value).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d\d$/);
    await expect(input).toHaveAttribute("type", "text");
    await expect(canvas.getByRole("button", { name: "Show passcode" })).toHaveAttribute("aria-pressed", "true");
  },
};

/** Show reveals what was typed; pressing it again masks it. */
export const ShowAndHide: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText("Passcode");
    await userEvent.type(input, "maple-river-42");
    await expect(input).toHaveAttribute("type", "password");
    const toggle = canvas.getByRole("button", { name: "Show passcode" });
    await userEvent.click(toggle);
    await expect(input).toHaveAttribute("type", "text");
    await userEvent.click(toggle);
    await expect(input).toHaveAttribute("type", "password");
  },
};

export const NewPasscode: Story = { args: { label: "New passcode" } };
