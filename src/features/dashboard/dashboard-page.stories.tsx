import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";
import {
  applications,
  brightwater,
  DESKTOP,
  everyGroupApplications,
  MOBILE,
  NARROW,
  NOW,
  PAGE,
  plinth,
  samples,
  unscheduledApplications,
  user,
} from "@/test/pages";
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

/** A new job seeker who deleted the samples: no Applications, and nothing on the calendar. */
const empty: Story = {
  args: { applications: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Add your first Application" })).toBeVisible();
    await expect(canvas.getByText("All quiet in the woods")).toBeVisible();
  },
};
export const EmptyDesktop: Story = { ...empty, ...DESKTOP };
export const EmptyMobile: Story = { ...empty, ...MOBILE };

/** Every Application Done, none an Offer (BIG-253): Bigfoot hugging a folder, and one brand button. */
const allDone: Story = {
  args: { applications: [brightwater, plinth] },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: "Applications" });
    await expect(within(card).getByRole("heading", { name: "Every Application is wrapped up" })).toBeVisible();
    await expect(within(card).getAllByRole("link", { name: "Add Application" })).toHaveLength(1);
    await expect(within(card).getByRole("link", { name: "View all 2 Done Applications" })).toBeVisible();
  },
};
export const AllDoneDesktop: Story = { ...allDone, ...DESKTOP };
export const AllDoneMobile: Story = { ...allDone, ...MOBILE };

/** A new job seeker's first look: only Sample Applications, grouped on the Applications card. */
const samplesOnly: Story = {
  args: { applications: samples },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: "Applications" });
    await expect(within(within(card).getByRole("list")).getAllByRole("link").length).toBeGreaterThan(0);
  },
};
export const SamplesDesktop: Story = { ...samplesOnly, ...DESKTOP };
export const SamplesMobile: Story = { ...samplesOnly, ...MOBILE };

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
    // The Applications card: a row per Progress group, Done left out.
    const card = canvas.getByRole("region", { name: "Applications" });
    await expect(within(card).getByRole("link", { name: /^Show the 3 Applications with an Interview scheduled\./ })).toBeVisible();
    await expect(within(card).queryByText(/^Done/)).not.toBeInTheDocument();
  },
};
export const InFlightDesktop: Story = { ...inFlight, ...DESKTOP };
export const InFlightMobile: Story = { ...inFlight, ...MOBILE };
/** The narrowest phone, 320px: Bigfoot still hangs right of the title. */
export const InFlightNarrow: Story = { ...inFlight, ...NARROW };

/**
 * Unscheduled Interviews (BIG-221): Harbour's "Next round · date TBD" after Waiting, Northwind's
 * "+1 later", "2 awaiting a date" in the summary line, and a Date TBD group ending the agenda.
 */
const dateTbd: Story = {
  args: { applications: unscheduledApplications },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/2 awaiting a date/)).toBeVisible();
    await expect(canvas.getByRole("link", { name: /^Open Harbour Analytics, Senior Engineering Manager\./ })).toBeVisible();
    await expect(await canvas.findByRole("region", { name: "Date TBD" })).toBeVisible();
  },
};
export const DateTbdDesktop: Story = { ...dateTbd, ...DESKTOP };
export const DateTbdMobile: Story = { ...dateTbd, ...MOBILE };

/**
 * Every Progress group on the Applications card (BIG-253): Interview scheduled, Next round · date
 * TBD and Offer with one Application each opening it, and Waiting's four, three names then "+1 more",
 * opening the Applications list filtered to Waiting. "View all" is in the heading on wide screens,
 * at the card's foot on a phone.
 */
const everyGroup: Story = {
  args: { applications: everyGroupApplications },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: "Applications" });
    const rows = within(within(card).getByRole("list")).getAllByRole("link");
    // Each row's name: where it goes, then what it shows.
    await expect(rows.map((row) => row.textContent?.split(". ")[0])).toEqual([
      "Show the 3 Applications with an Interview scheduled",
      "Open Harbour Analytics, Senior Engineering Manager",
      "Show the 4 Waiting Applications",
      "Open Cobalt Genomics, Engineering Manager, Web",
    ]);
    await expect(rows[2]).toHaveAttribute("href", "/applications?progress=waiting");
    await expect(rows[2]).toHaveTextContent(/\+1 more$/);
    const viewAll = within(card).getAllByRole("link", { name: /^View all 9 Applications/ });
    await expect(viewAll.filter((link) => link.checkVisibility())).toHaveLength(1);
    // Each row and View all is a 44px touch target.
    const heights = [...rows, ...viewAll.filter((link) => link.checkVisibility())].map((target) => target.getBoundingClientRect().height);
    await expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
  },
};
export const EveryGroupDesktop: Story = { ...everyGroup, ...DESKTOP };
export const EveryGroupMobile: Story = { ...everyGroup, ...MOBILE };
/** The narrowest phone, 320px: the names wrap rather than overflow. */
export const EveryGroupNarrow: Story = { ...everyGroup, ...NARROW };

/** While the Applications load. */
const loading: Story = {
  render: () => <DashboardPageSkeleton />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 2, name: "Applications" })).toBeVisible();
  },
};
export const LoadingDesktop: Story = { ...loading, ...DESKTOP };
export const LoadingMobile: Story = { ...loading, ...MOBILE };
