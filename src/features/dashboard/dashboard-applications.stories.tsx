import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { brightwater, cobalt, everyGroupApplications, harbour, plinth } from "@/test/pages";
import { DashboardApplications, DashboardApplicationsSkeleton } from "./dashboard-applications";

// The dashboard's Applications card (BIG-253): a row per Progress group, each opening the
// Applications behind it. Pages/Dashboard shows it in the whole page.

const meta = {
  component: DashboardApplications,
  args: { applications: everyGroupApplications },
  parameters: { nextjs: { navigation: { pathname: "/dashboard" } } },
} satisfies Meta<typeof DashboardApplications>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every group: three names then "+1 more" for Waiting's four; Harbour and Cobalt alone open their own pages. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: /^Show the 4 Waiting Applications\./ })).toHaveTextContent(/\+1 more$/);
    await expect(canvas.getByRole("link", { name: /^Open Harbour Analytics, Senior Engineering Manager\./ })).toHaveAttribute(
      "href",
      "/applications/harbour",
    );
  },
};

/** Groups of one each: every row opens its Application's page. */
export const GroupsOfOne: Story = {
  args: { applications: [harbour, cobalt] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: /^Open Cobalt Genomics, Engineering Manager, Web\./ })).toHaveAttribute(
      "href",
      "/applications/cobalt",
    );
  },
};

/** On a phone: names under each badge, wrapping, and "View all 9 Applications" at the card's foot. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas }) => {
    const visible = canvas.getAllByRole("link", { name: /^View all/ }).filter((link) => link.checkVisibility());
    await expect(visible).toHaveLength(1);
    await expect(visible[0]).toHaveTextContent("View all 9 Applications");
  },
};

/** No Applications yet: Bigfoot and a first Add button, without View all. */
export const Empty: Story = {
  args: { applications: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Add your first Application" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /^View all/ })).not.toBeInTheDocument();
  },
};

/** Every Application Done, none an Offer: Bigfoot hugging a folder, Add Application, and View all to the Done ones. */
export const AllDone: Story = {
  args: { applications: [brightwater, plinth] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Every Application is wrapped up" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "View all 2 Done Applications" })).toHaveAttribute("href", "/applications?progress=done");
  },
};

/** While the Applications load: the real heading over four group rows in skeleton shapes. */
export const Loading: Story = {
  render: () => <DashboardApplicationsSkeleton />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { name: "Applications" })).toBeVisible();
  },
};
