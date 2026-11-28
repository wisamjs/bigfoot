import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { DESKTOP, journey, MOBILE, NOW, PAGE, user } from "@/test/pages";
import { JourneyPreview } from "./journey-preview";

// The job seeker's own preview of their Journey, whole, as /account/journey-preview renders it
// (BIG-198), at a laptop's width and a phone's: a Viewer's page under the preview banner, no Lock.
// "Today" is fixed (src/test/pages.ts).

const meta = {
  title: "Pages/Journey preview",
  component: JourneyPreview,
  args: { journey: { ...journey, shared_by: null }, sharedBy: user.name, now: NOW },
  ...PAGE,
} satisfies Meta<typeof JourneyPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Bigfoot family right of the heading, as a Viewer sees it (BIG-229): on a laptop, not on a phone. */
const withBigfoot = (story: Story, shown: boolean): Story => ({
  ...story,
  play: async (context) => {
    await story.play?.(context);
    const art = context.canvasElement.querySelector<HTMLImageElement>('img[src*="bigfoot-family"]');
    await expect(art).toHaveAttribute("alt", "");
    if (shown) await expect(art).toBeVisible();
    else await expect(art).not.toBeVisible();
  },
});

/** Alex's Journey as their Viewers see it, with the way back to Account and no Lock. */
const preview: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("This is what your Viewers see.")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
    await expect(canvas.getByRole("heading", { level: 1, name: "Alex’s Journey" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Lock" })).not.toBeInTheDocument();
  },
};
export const PreviewDesktop: Story = { ...withBigfoot(preview, true), ...DESKTOP };
export const PreviewMobile: Story = { ...withBigfoot(preview, false), ...MOBILE };

/** Nothing to show yet: the same empty Journey a Viewer would see. */
const nothing: Story = {
  args: { journey: { shared_by: null, applications: [], other_completed_interviews: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No Applications in progress right now.")).toBeVisible();
  },
};
export const NothingInProgressDesktop: Story = { ...withBigfoot(nothing, true), ...DESKTOP };
export const NothingInProgressMobile: Story = { ...withBigfoot(nothing, false), ...MOBILE };
