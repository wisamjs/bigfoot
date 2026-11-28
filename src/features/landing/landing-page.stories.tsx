import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { DESKTOP, MOBILE, PAGE } from "@/test/pages";
import { LandingPage } from "./landing-page";

// The home page, signed out, as / renders it (BIG-231), at a laptop's width and a phone's: Bigfoot in
// the hero, peeking over the Applications preview, on each feature card and cheering in the closing
// call. Every Bigfoot shows on a phone too. "Today" is fixed (src/test/pages.ts).

const meta = {
  title: "Pages/Landing",
  component: LandingPage,
  ...PAGE,
} satisfies Meta<typeof LandingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const SPRITES = [
  "bigfoot-welcome",
  "bigfoot-peek-over",
  "bigfoot-folder-hug",
  "bigfoot-clipboard-writing",
  "bigfoot-calendar-surprised",
  "bigfoot-family",
  "bigfoot-double-thumbs-up",
];

const landing: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: /Job hunting is chasing Bigfoot/ })).toBeVisible();
    const features = canvas.getByRole("region", { name: "Your search in one place" });
    await expect(within(features).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Applications",
      "Interviews",
      "Interview calendar",
      "Share your Journey",
    ]);
    const call = canvas.getByRole("region", { name: "Ready to find yours?" });
    await expect(within(call).getByRole("link", { name: "Find your Bigfoot" })).toHaveAttribute("href", "/sign-up");
    const art = SPRITES.map((sprite) => canvasElement.querySelector(`img[src*="${sprite}"]`));
    await Promise.all(art.map((image) => expect(image).toHaveAttribute("alt", "")));
    await Promise.all(art.map((image) => expect(image).toBeVisible()));
  },
};

export const Desktop: Story = { ...landing, ...DESKTOP };

/** On a phone: Bigfoot above the heading, the preview cut short, full-width buttons, nothing scrolls sideways. */
export const Mobile: Story = {
  ...MOBILE,
  play: async (context) => {
    await landing.play?.(context);
    const { canvas, canvasElement } = context;
    const doc = canvasElement.ownerDocument.documentElement;
    await expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth);
    const hero = canvas.getByRole("region", { name: /Job hunting is chasing Bigfoot/ });
    const button = within(hero).getByRole("link", { name: "Find your Bigfoot" }).getBoundingClientRect();
    await expect(button.height).toBeGreaterThanOrEqual(44);
    await expect(button.width).toBeGreaterThan(doc.clientWidth - 64);
    const art = canvasElement.querySelector('img[src*="bigfoot-welcome"]')!.getBoundingClientRect();
    const heading = canvas.getByRole("heading", { level: 1 }).getBoundingClientRect();
    await expect(art.bottom).toBeLessThanOrEqual(heading.top);
  },
};
