import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { expectBigfootClear } from "@/test/art";
import { DESKTOP, journey, MOBILE, NARROW, PAGE, SHARE_LINK_ID, unscheduledJourney, user } from "@/test/pages";
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

/**
 * Each page's Bigfoot (BIG-229): decorative, with an empty alt, and shown on a phone as well as a
 * laptop (BIG-232), smaller or moved where the laptop's place doesn't fit, clear of text and controls.
 */
const withBigfoot = (story: Story, sprite: string): Story => ({
  ...story,
  play: async (context) => {
    await story.play?.(context);
    await expectBigfootClear(context.canvasElement, sprite);
  },
});

/** In flight: an Offer, upcoming and completed Interviews, the calendar, and where each Application stands. */
const inFlight: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Alex’s Journey" })).toBeVisible();
    await expect(canvas.getByRole("region", { name: "Where things stand" })).toBeVisible();
  },
};
export const InFlightDesktop: Story = { ...withBigfoot(inFlight, "bigfoot-family"), ...DESKTOP };
export const InFlightMobile: Story = { ...withBigfoot(inFlight, "bigfoot-family"), ...MOBILE };
/** The narrowest phone, 320px: the family right of the heading, which wraps short of it. */
export const InFlightNarrow: Story = { ...withBigfoot(inFlight, "bigfoot-family"), ...NARROW };

/** Nothing In Progress and no Offers. */
const nothing: Story = {
  args: { page: { kind: "journey", journey: { shared_by: user.name, applications: [], other_completed_interviews: [] } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No Applications in progress right now.")).toBeVisible();
  },
};
export const NothingInProgressDesktop: Story = { ...withBigfoot(nothing, "bigfoot-family"), ...DESKTOP };
export const NothingInProgressMobile: Story = { ...withBigfoot(nothing, "bigfoot-family"), ...MOBILE };

/** The Passcode page, before the Viewer has typed it. */
const passcode: Story = {
  args: { page: { kind: "passcode", sharedBy: user.name, locked: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Alex shared a job search with you" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "See Alex’s progress" })).toBeEnabled();
  },
};
export const PasscodeDesktop: Story = { ...withBigfoot(passcode, "bigfoot-peek-right"), ...DESKTOP };
export const PasscodeMobile: Story = { ...withBigfoot(passcode, "bigfoot-peek-right"), ...MOBILE };
/** The narrowest phone, 320px: Bigfoot peeks in from the screen's edge, beside the initials. */
export const PasscodeNarrow: Story = { ...withBigfoot(passcode, "bigfoot-peek-right"), ...NARROW };

/** The Passcode page, locked after five wrong tries. */
const locked: Story = {
  args: { page: { kind: "passcode", sharedBy: user.name, locked: true } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "See Alex’s progress" })).toBeDisabled();
  },
};
export const LockedDesktop: Story = { ...withBigfoot(locked, "bigfoot-peek-right"), ...DESKTOP };
export const LockedMobile: Story = { ...withBigfoot(locked, "bigfoot-peek-right"), ...MOBILE };

/** The link expired. */
const expired: Story = {
  args: { page: { kind: "expired", sharedBy: user.name } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "This link has expired" })).toBeVisible();
  },
};
export const ExpiredDesktop: Story = { ...withBigfoot(expired, "bigfoot-peek-over"), ...DESKTOP };
export const ExpiredMobile: Story = { ...withBigfoot(expired, "bigfoot-peek-over"), ...MOBILE };
/** The narrowest phone, 320px: Bigfoot looks over the card, clear of the wordmark. */
export const ExpiredNarrow: Story = { ...withBigfoot(expired, "bigfoot-peek-over"), ...NARROW };

/** The link was stopped, or never existed. */
const notActive: Story = {
  args: { page: { kind: "not_active" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "This link isn’t active" })).toBeVisible();
  },
};
export const NotActiveDesktop: Story = { ...withBigfoot(notActive, "bigfoot-peek-over"), ...DESKTOP };
export const NotActiveMobile: Story = { ...withBigfoot(notActive, "bigfoot-peek-over"), ...MOBILE };

/** While the route asks which page the link shows. */
const loading: Story = { render: () => <SharedPageSkeleton /> };
export const LoadingDesktop: Story = { ...loading, ...DESKTOP };
export const LoadingMobile: Story = { ...loading, ...MOBILE };

/**
 * Unscheduled Interviews (BIG-221): Harbour shows "Next round · date TBD", its Next is the title over
 * "Date TBD", and no Unscheduled Interview is on the calendar or in the counts.
 */
const dateTbd: Story = {
  args: { page: { kind: "journey", journey: unscheduledJourney } },
  play: async ({ canvas }) => {
    // Rows draw Progress and Next twice, stacked for a phone and in columns wider: one of each shows.
    await expect(canvas.getAllByText("Next round · date TBD").some((label) => label.checkVisibility())).toBe(true);
    await expect(canvas.getAllByText("Date TBD").some((label) => label.checkVisibility())).toBe(true);
  },
};
export const DateTbdDesktop: Story = { ...withBigfoot(dateTbd, "bigfoot-family"), ...DESKTOP };
export const DateTbdMobile: Story = { ...withBigfoot(dateTbd, "bigfoot-family"), ...MOBILE };
