import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { PreviewBanner } from "./preview-banner";

// Above the job seeker's own preview of their Journey (BIG-198).

const meta = {
  component: PreviewBanner,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PreviewBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What the page is, and the way back to the Account page. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("complementary", { name: "Preview" })).toHaveTextContent("This is what your Viewers see.");
    await expect(canvas.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
  },
};
