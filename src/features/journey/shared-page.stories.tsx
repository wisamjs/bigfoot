import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { DESKTOP, journey, MOBILE, PAGE, SHARE_LINK_ID, user } from "@/test/pages";
import { SharedPage, SharedPageSkeleton } from "./shared-page";

// A Share link's page, whole, as /journey/[id] renders it for a Viewer (BIG-203), at a laptop's
// width and a phone's: the Journey, the Passcode page, or why the link no longer opens. Server
// Actions are mocked (src/app/journey/[id]/__mocks__/actions.ts); "today" is fixed
// (src/test/pages.ts). Alex's Journey is the job seeker's own search from the other Pages stories.

const meta = {
  title: "Pages/Journey",
  component: SharedPage,
  args: { id: SHARE_LINK_ID, page: { kind: "journey", journey } },
  ...PAGE,
} satisfies Meta<typeof SharedPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In flight: an Offer, upcoming and completed Interviews, the calendar, and where each Application stands. */
const inFlight: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Alex’s Journey" })).toBeVisible();
    await expect(canvas.getByRole("region", { name: "Where things stand" })).toBeVisible();
  },
};
export const InFlightDesktop: Story = { ...inFlight, ...DESKTOP };
export const InFlightMobile: Story = { ...inFlight, ...MOBILE };

/** Nothing In Progress and no Offers. */
const nothing: Story = {
  args: { page: { kind: "journey", journey: { shared_by: user.name, applications: [] } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No Applications in progress right now.")).toBeVisible();
  },
};
export const NothingInProgressDesktop: Story = { ...nothing, ...DESKTOP };
export const NothingInProgressMobile: Story = { ...nothing, ...MOBILE };

/** The Passcode page, before the Viewer has typed it. */
const passcode: Story = {
  args: { page: { kind: "passcode", sharedBy: user.name, locked: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Alex shared a job search with you" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "See Alex’s progress" })).toBeEnabled();
  },
};
export const PasscodeDesktop: Story = { ...passcode, ...DESKTOP };
export const PasscodeMobile: Story = { ...passcode, ...MOBILE };

/** The Passcode page, locked after five wrong tries. */
const locked: Story = {
  args: { page: { kind: "passcode", sharedBy: user.name, locked: true } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "See Alex’s progress" })).toBeDisabled();
  },
};
export const LockedDesktop: Story = { ...locked, ...DESKTOP };
export const LockedMobile: Story = { ...locked, ...MOBILE };

/** The link expired. */
const expired: Story = {
  args: { page: { kind: "expired", sharedBy: user.name } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "This link has expired" })).toBeVisible();
  },
};
export const ExpiredDesktop: Story = { ...expired, ...DESKTOP };
export const ExpiredMobile: Story = { ...expired, ...MOBILE };

/** The link was stopped, or never existed. */
const notActive: Story = {
  args: { page: { kind: "not_active" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "This link isn’t active" })).toBeVisible();
  },
};
export const NotActiveDesktop: Story = { ...notActive, ...DESKTOP };
export const NotActiveMobile: Story = { ...notActive, ...MOBILE };

/** While the route asks which page the link shows. */
const loading: Story = { render: () => <SharedPageSkeleton /> };
export const LoadingDesktop: Story = { ...loading, ...DESKTOP };
export const LoadingMobile: Story = { ...loading, ...MOBILE };
