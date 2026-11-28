import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { accessTokens, API_URL, applications, DESKTOP, MOBILE, PAGE, shareLinks, user } from "@/test/pages";
import { AccountPage, AccountPageSkeleton } from "./account-page";

// The Account page, whole, as /account renders it (BIG-203), at a laptop's width and a phone's.
// Server Actions are mocked (src/app/account/__mocks__/actions.ts); "today" is fixed
// (src/test/pages.ts), so "Expires in 3 days" reads the same on every run.

const meta = {
  title: "Pages/Account",
  component: AccountPage,
  args: { user, count: applications.length, accessTokens, shareLinks, apiUrl: API_URL },
  ...PAGE,
} satisfies Meta<typeof AccountPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No Share links and no Access tokens yet. */
const none: Story = {
  args: { accessTokens: [], shareLinks: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
    await expect(canvas.queryByText("Mom & Dad")).not.toBeInTheDocument();
    // Before any link, the job seeker can still check what a Viewer would see (BIG-198).
    await expect(canvas.getByRole("link", { name: "Preview Alex’s Journey" })).toHaveAttribute("href", "/account/journey-preview");
  },
};
export const NoneDesktop: Story = { ...none, ...DESKTOP };
export const NoneMobile: Story = { ...none, ...MOBILE };

/** Two Share links in use and one expired; one Access token in use and one expired. */
const withLinks: Story = {
  play: async ({ canvas, userEvent }) => {
    const share = within(canvas.getByRole("region", { name: "Share your progress" }));
    await expect(share.getByText("Mom & Dad")).toBeVisible();
    await expect(share.getByText("Old flatmate")).toBeVisible();
    await expect(share.getByRole("link", { name: "Preview Alex’s Journey" })).toBeVisible();
    const tokens = within(canvas.getByRole("region", { name: "Access tokens" }));
    await expect(tokens.getByText("Calendar cron job")).toBeVisible();
    await expect(canvas.getByText(/all 8 of your Applications/)).toBeVisible();
    // What stays and the Google account fold away (BIG-240); what gets deleted stays in view.
    const google = canvas.getByRole("link", { name: "your Google account’s third-party connections" });
    await expect(google).not.toBeVisible();
    await userEvent.click(canvas.getByText("What stays for a while, and your Google account"));
    await expect(google).toBeVisible();
    await userEvent.click(canvas.getByText("What stays for a while, and your Google account"));
  },
};
export const WithLinksDesktop: Story = { ...withLinks, ...DESKTOP };
export const WithLinksMobile: Story = { ...withLinks, ...MOBILE };

/** While the account loads. */
const loading: Story = {
  render: () => <AccountPageSkeleton />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
  },
};
export const LoadingDesktop: Story = { ...loading, ...DESKTOP };
export const LoadingMobile: Story = { ...loading, ...MOBILE };
