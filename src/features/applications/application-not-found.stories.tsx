import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ApplicationNotFound } from "./application-not-found";

// The Application not found page's body (BIG-174). Recently viewed reads this browser's storage,
// so each story sets it first.
const KEY = "bigfoot:recent-applications";
const applications = [
  { id: "lumen", company: "Lumen Bio", title: "Engineering Manager, ML Platform" },
  { id: "quillon", company: "Quillon Learning", title: "Senior Engineering Manager" },
];

const meta = {
  component: ApplicationNotFound,
  args: { applications },
  decorators: [(Story) => <main>{Story()}</main>],
} satisfies Meta<typeof ApplicationNotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recently viewed lists the ones that still exist, newest first; a deleted one ("gone") is left out. */
export const Default: Story = {
  beforeEach: () => {
    localStorage.setItem(KEY, JSON.stringify(["gone", "lumen", "quillon"]));
    return () => localStorage.removeItem(KEY);
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Application not found" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
    const links = await canvas.findAllByRole("link", { name: /Lumen Bio|Quillon Learning/ });
    await expect(links.map((link) => link.getAttribute("href"))).toEqual(["/applications/lumen", "/applications/quillon"]);
  },
};

/** Nothing viewed in this browser: no Recently viewed. */
export const NothingViewed: Story = {
  beforeEach: () => localStorage.removeItem(KEY),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("heading", { name: "Recently viewed" })).not.toBeInTheDocument();
  },
};
