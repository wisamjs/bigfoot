import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { expectBigfootClear } from "@/test/art";
import { applications, DESKTOP, MOBILE, NARROW, NOW, PAGE, samples, unscheduledApplications, user } from "@/test/pages";
import { DashboardPage, DashboardPageSkeleton } from "./dashboard-page";

// The dashboard, whole, as /dashboard renders it (BIG-203): every state at a laptop's width and a
// phone's. "Today" is fixed (src/test/pages.ts), so the calendar opens on November 2026 and the Next
// up card's Interview is this afternoon on every run.

const meta = {
  title: "Pages/Dashboard",
  component: DashboardPage,
  args: { user, applications, now: NOW },
  ...PAGE,
  parameters: { ...PAGE.parameters, nextjs: { appDirectory: true, navigation: { pathname: "/dashboard" } } },
} satisfies Meta<typeof DashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Bigfoot hanging from the header (BIG-226): above the Interviews card on a laptop, at the right of
 * the title row on a phone (BIG-232), clear of the title and summary either way.
 */
const withBigfoot = (story: Story): Story => ({
  ...story,
  play: async (context) => {
    await story.play?.(context);
    await expectBigfootClear(context.canvasElement, "bigfoot-hanging");
  },
});

/** A new job seeker who deleted the samples: no Applications, and nothing on the calendar. */
const empty: Story = {
  args: { applications: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Add your first Application" })).toBeVisible();
    await expect(canvas.getByText("All quiet in the woods")).toBeVisible();
  },
};
export const EmptyDesktop: Story = { ...withBigfoot(empty), ...DESKTOP };
export const EmptyMobile: Story = { ...withBigfoot(empty), ...MOBILE };

/** A new job seeker's first look: only Sample Applications. */
const samplesOnly: Story = {
  args: { applications: samples },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText("Sample").length).toBeGreaterThan(0);
  },
};
export const SamplesDesktop: Story = { ...withBigfoot(samplesOnly), ...DESKTOP };
export const SamplesMobile: Story = { ...withBigfoot(samplesOnly), ...MOBILE };

/**
 * A search in flight: Applications Waiting, Interviewing and at Offer; Next up is the Interview this
 * afternoon, with a takeaway from another Application; the calendar has past and upcoming Interviews.
 */
const inFlight: Story = {
  play: async ({ canvas }) => {
    const next = canvas.getByRole("region", { name: /Hiring Manager/ });
    await waitFor(() => expect(next).toHaveTextContent(/Next up · today/));
    await expect(next).toHaveTextContent("Tilth Agritech · Head of Engineering");
    await expect(within(next).getByText(/^Lead with the decision/)).toBeVisible();
    await expect(canvas.getByText(/Done Applications are hidden/)).toBeVisible();
  },
};
export const InFlightDesktop: Story = { ...withBigfoot(inFlight), ...DESKTOP };
export const InFlightMobile: Story = { ...withBigfoot(inFlight), ...MOBILE };
/** The narrowest phone, 320px: Bigfoot still hangs right of the title. */
export const InFlightNarrow: Story = { ...withBigfoot(inFlight), ...NARROW };

/**
 * Unscheduled Interviews (BIG-221): Harbour's "Next round · date TBD" after Waiting, Northwind's
 * "+1 later", "2 awaiting a date" in the summary line, and a Date TBD group ending the agenda.
 */
const dateTbd: Story = {
  args: { applications: unscheduledApplications },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/2 awaiting a date/)).toBeVisible();
    // Progress is drawn twice, stacked for a phone and in its column wider: one of them shows.
    await expect(canvas.getAllByText("Next round · date TBD").some((label) => label.checkVisibility())).toBe(true);
    await expect(await canvas.findByRole("region", { name: "Date TBD" })).toBeVisible();
  },
};
export const DateTbdDesktop: Story = { ...withBigfoot(dateTbd), ...DESKTOP };
export const DateTbdMobile: Story = { ...withBigfoot(dateTbd), ...MOBILE };

/** Show done: the Done Applications join the In Progress ones. */
const showDone: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("switch", { name: "Show done" }));
    await expect(canvas.getByRole("link", { name: /^Open Brightwater Data\b/ })).toBeVisible();
    await expect(canvas.queryByText(/Done Applications are hidden/)).not.toBeInTheDocument();
  },
};
export const ShowDoneDesktop: Story = { ...withBigfoot(showDone), ...DESKTOP };
export const ShowDoneMobile: Story = { ...withBigfoot(showDone), ...MOBILE };

/** While the Applications load. */
const loading: Story = {
  render: () => <DashboardPageSkeleton />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  },
};
export const LoadingDesktop: Story = { ...withBigfoot(loading), ...DESKTOP };
export const LoadingMobile: Story = { ...withBigfoot(loading), ...MOBILE };
