import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { CurrentUser } from "@/lib/current-user";
import { AppHeader } from "./app-header";

// The header of signed-in pages. Sign out is mocked (src/app/__mocks__/actions.ts).
const user: CurrentUser = {
  id: "u1",
  name: "Alex Morgan",
  firstName: "Alex",
  email: "alex.morgan@example.com",
  image: null,
};

const meta = {
  component: AppHeader,
  args: { user, current: "/dashboard" },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the dashboard, with initials where Google has no photo. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  },
};

/** On the Account page. */
export const Account: Story = { args: { current: "/account" } };

/** A page's loading state: shapes where the job seeker goes. */
export const Loading: Story = { args: { user: undefined } };

export const LongText: Story = {
  args: {
    user: {
      ...user,
      name: "Alexandra Morgan-Harrison Wellington",
      email: "alexandra.morgan-harrison.wellington@northern-lights-cooperative.example.com",
    },
  },
};
