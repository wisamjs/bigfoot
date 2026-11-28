import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { EditButton, EditMark } from "./edit-button";

const meta = {
  component: EditButton,
  args: { label: "Edit details", onClick: fn() },
} satisfies Meta<typeof EditButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At rest: the pencil alone, named for the card it edits. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Edit details" });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** Under the pointer (storybook-addon-pseudo-states forces :hover): card background, heading colour. */
export const Hovered: Story = { parameters: { pseudo: { hover: true } } };

/** Reached by keyboard: the 4px focus ring. */
export const Focused: Story = { parameters: { pseudo: { focusVisible: true } } };

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Edit details" })).toBeDisabled();
  },
};

/** The same look inside a link, hidden from screen readers, as a completed Interview's row shows it. */
export const InsideALink: Story = {
  render: () => (
    <a href="#interview" className="group flex items-center justify-between gap-4 rounded-card border border-line p-4 text-heading">
      Recruiter Screen
      <EditMark />
    </a>
  ),
};
