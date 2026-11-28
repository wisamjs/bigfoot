import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import { THEME_KEY } from "./theme";
import { ThemeToggle } from "./theme-toggle";

// The headers' light and dark mode switch (BIG-251). Storybook's Theme toolbar sets the same
// data-theme the toggle does, so the toolbar picks the starting mode.
const meta = {
  component: ThemeToggle,
  beforeEach: () => () => localStorage.removeItem(THEME_KEY),
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dark mode: a sun, pressed. */
export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "true");
  },
};

/** Light mode: a moon, not pressed. */
export const Light: Story = {
  globals: { theme: "light" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "false");
  },
};

/** A click switches the page to dark and saves it; another switches it back. */
export const Switches: Story = {
  globals: { theme: "light" },
  play: async ({ canvas, canvasElement }) => {
    const html = canvasElement.ownerDocument.documentElement;
    const toggle = canvas.getByRole("button", { name: "Dark mode" });
    await userEvent.click(toggle);
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    await userEvent.click(toggle);
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(localStorage.getItem(THEME_KEY)).toBe("light");
  },
};
