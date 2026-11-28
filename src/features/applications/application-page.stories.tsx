import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { nextInterview, prepLookBack, type Application } from "@/lib/applications";
import {
  applications,
  brightwater,
  cobalt,
  DESKTOP,
  fernway,
  harbour,
  lumen,
  MOBILE,
  northwindWithPanel,
  PAGE,
  quillon,
  unscheduledApplications,
  user,
} from "@/test/pages";
import { ApplicationNotFoundPage, ApplicationPage, ApplicationPageSkeleton } from "./application-page";

// An Application's page, whole, as /applications/[id] renders it (BIG-203), at a laptop's width and
// a phone's. Server Actions are mocked (src/app/applications/__mocks__/actions.ts); "today" is fixed
// (src/test/pages.ts). The look back is worked out from every Application, as the route does.

/** The page's props for `app`, as the route works them out. */
function page(app: Application, justAdded = false, all = applications) {
  const next = nextInterview(app);
  return { app, justAdded, lookBack: next ? prepLookBack(all, app, next) : undefined };
}

const meta = {
  title: "Pages/Application",
  component: ApplicationPage,
  args: { user, ...page(lumen) },
  ...PAGE,
} satisfies Meta<typeof ApplicationPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just added, from Add Application: no Interviews yet. */
const justAdded: Story = {
  args: page(quillon, true),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Added. Got an Interview lined up? Add it here.")).toBeVisible();
  },
};
export const JustAddedDesktop: Story = { ...justAdded, ...DESKTOP };
export const JustAddedMobile: Story = { ...justAdded, ...MOBILE };

/** Waiting to hear back after its one Interview: nothing scheduled. */
const waiting: Story = {
  args: page(fernway),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Fernway Health" })).toBeVisible();
    await expect(canvas.getByRole("list", { name: "Completed" })).toBeVisible();
  },
};
export const WaitingDesktop: Story = { ...waiting, ...DESKTOP };
export const WaitingMobile: Story = { ...waiting, ...MOBILE };

/**
 * In flight: two completed Rounds, the next in the Next up card with its takeaways (this
 * Application's Hiring Manager, and Brightwater Data's Deep-Dive) and They asked last time, and one later.
 */
const inFlight: Story = {
  play: async ({ canvas }) => {
    const next = within(canvas.getByRole("region", { name: "Round 3 · Technical Deep-Dive" }));
    await expect(next.getAllByRole("listitem").length).toBeGreaterThan(0);
    await expect(next.getByText("Draw the system before talking through it.")).toBeVisible();
    await expect(canvas.getByRole("list", { name: "Completed" })).toBeVisible();
  },
};
export const InFlightDesktop: Story = { ...inFlight, ...DESKTOP };
export const InFlightMobile: Story = { ...inFlight, ...MOBILE };

/** An Offer, with its Outcome card and note. */
const offer: Story = {
  args: page(cobalt),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Offer letter by Friday. Start date flexible.")).toBeVisible();
  },
};
export const OfferDesktop: Story = { ...offer, ...DESKTOP };
export const OfferMobile: Story = { ...offer, ...MOBILE };

/** Rejected, with its Outcome card and Outcome note. */
const rejected: Story = {
  args: page(brightwater),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("They went with an internal candidate.")).toBeVisible();
  },
};
export const RejectedDesktop: Story = { ...rejected, ...DESKTOP };
export const RejectedMobile: Story = { ...rejected, ...MOBILE };

/** A deleted Application, a malformed id or another job seeker's: links to the job seeker's own. */
const notFound: Story = {
  render: () => (
    <ApplicationNotFoundPage user={user} applications={applications.map(({ id, company, title }) => ({ id, company, title }))} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Application not found" })).toBeVisible();
  },
};
export const NotFoundDesktop: Story = { ...notFound, ...DESKTOP };
export const NotFoundMobile: Story = { ...notFound, ...MOBILE };

/** While the Application loads. */
const loading: Story = { render: () => <ApplicationPageSkeleton /> };
export const LoadingDesktop: Story = { ...loading, ...DESKTOP };
export const LoadingMobile: Story = { ...loading, ...MOBILE };

/**
 * Through to the next round with no date yet (BIG-221): "Next round · date TBD", the strip ending
 * in a dashed Date TBD segment, and Next up with a TBD tile and Add the date.
 */
const dateTbd: Story = {
  args: page(harbour, false, unscheduledApplications),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Next round · date TBD")).toBeVisible();
    const next = canvas.getByRole("region", { name: "Round 3 · Leadership" });
    await expect(within(next).getByRole("link", { name: "Add the date" })).toBeVisible();
    await expect(within(next).getByText(/Ask who I’d be meeting next/)).toBeVisible();
  },
};
export const DateTbdDesktop: Story = { ...dateTbd, ...DESKTOP };
export const DateTbdMobile: Story = { ...dateTbd, ...MOBILE };

/** A Scheduled Interview ahead, then one with no date (BIG-221): still Interview scheduled, Later lists it as Date TBD. */
const laterDateTbd: Story = {
  args: page(northwindWithPanel, false, unscheduledApplications),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Interview scheduled")).toBeVisible();
    await expect(within(canvas.getByRole("list", { name: "Later" })).getByText("Date TBD")).toBeVisible();
  },
};
export const LaterDateTbdDesktop: Story = { ...laterDateTbd, ...DESKTOP };
export const LaterDateTbdMobile: Story = { ...laterDateTbd, ...MOBILE };
