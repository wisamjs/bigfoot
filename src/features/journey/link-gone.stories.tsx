import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { expectBigfootClear } from "@/test/art";
import { LinkGone } from "./link-gone";

// A Share link that no longer opens (BIG-197).

const meta = {
  component: LinkGone,
  args: { kind: "not_active" },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LinkGone>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Stopped, or never a link: the same page, naming nobody. On a phone, Bigfoot looks over the card, smaller (BIG-232). */
export const NotActive: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "This link isn’t active" })).toBeVisible();
    await expect(canvas.getByText("Ask the person who sent it for a new one.")).toBeVisible();
    await expectBigfootClear(canvasElement, "bigfoot-peek-over");
  },
};

/** Expired: the job seeker can renew it. */
export const Expired: Story = {
  args: { kind: "expired", sharedBy: "Wisam Zaghal" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "This link has expired" })).toBeVisible();
    await expect(canvas.getByText("Ask Wisam to renew it.")).toBeVisible();
  },
};

/** Expired, made before Bigfoot stored names. */
export const ExpiredNoName: Story = {
  args: { kind: "expired", sharedBy: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Ask the person who sent it to renew it.")).toBeVisible();
  },
};

/** Bigfoot looks over the card's top edge, right of the wordmark (BIG-229), on a light page. */
export const ExpiredLight: Story = {
  args: { kind: "expired", sharedBy: "Wisam Zaghal" },
  globals: { theme: "light", viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    const art = canvasElement.querySelector('img[src*="bigfoot-peek-over"]');
    await expect(art).toHaveAttribute("alt", "");
    await expect(art).toBeVisible();
  },
};

/** The same Bigfoot on a stopped link, which still names nobody. */
export const NotActiveDesktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('img[src*="bigfoot-peek-over"]')).toBeVisible();
    await expect(canvas.getByText("Ask the person who sent it for a new one.")).toBeVisible();
  },
};
