import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { Calendar } from "./calendar";

// A fixed "today", so the stories look the same whichever day they run.
const today = new Date(2026, 10, 18);

const meta = {
  component: Calendar,
  args: { mode: "single", today, defaultMonth: today, weekStartsOn: 1, onSelect: fn() },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Today takes the card fill. */
export const Default: Story = {};

/** The picked day takes the brand fill. */
export const Selected: Story = { args: { selected: new Date(2026, 10, 24) } };

/** Day buttons are ghost buttons: card fill under the pointer. */
export const Hovered: Story = { parameters: { pseudo: { hover: true } } };

/** Arrow keys move between days; the focused day shows the brand ring. */
export const Focused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Wednesday, November 18, 2026/ }));
    await expect(canvas.getByRole("button", { name: /Wednesday, November 18, 2026/ })).toHaveFocus();
  },
};

/** Days before today can't be picked. */
export const Disabled: Story = { args: { disabled: { before: today } } };
