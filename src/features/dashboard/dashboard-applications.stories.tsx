import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import { previewApplications } from "@/lib/mock-data";
import { application } from "@/test/applications";
import { DashboardApplications } from "./dashboard-applications";

// The dashboard's Applications card, for the landing page's sample Applications plus two Done ones.

const done = [
  application("maple", { company: "Maple Health", title: "Engineering Manager, Growth", status: "done", outcome: "rejected", is_waiting: false }),
  application("harbor", { company: "Harbor Ed", title: "Director of Engineering", status: "done", outcome: "withdrawn", is_waiting: false }),
];

const meta = {
  component: DashboardApplications,
  args: { applications: [...previewApplications(), ...done] },
  parameters: { nextjs: { navigation: { pathname: "/dashboard" } } },
} satisfies Meta<typeof DashboardApplications>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In Progress Applications and Offers, with a line saying how many Done ones are hidden. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2 Done Applications are hidden. Turn on “Show done” to see them.")).toBeVisible();
  },
};

/** Show done adds the Done Applications, and the line goes. */
export const ShowDone: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("switch", { name: "Show done" }));
    await expect(canvas.getByRole("link", { name: /^Open Maple Health\b/ })).toBeVisible();
    await expect(canvas.queryByText(/Done Applications are hidden/)).not.toBeInTheDocument();
  },
};

/** No Done Applications: no Show done and no line. */
export const NoneDone: Story = { args: { applications: previewApplications() } };

/** No Applications yet: Bigfoot and a first Add button. */
export const Empty: Story = {
  args: { applications: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Add your first Application" })).toBeVisible();
  },
};

/** Only Done Applications, hidden: the table has nothing to show until Show done. */
export const OnlyDone: Story = { args: { applications: done } };

/** Sorted by Location, as the dashboard's URL says (`?sort=location`, BIG-209); the Location header shows it. */
export const SortedByLocation: Story = {
  parameters: { nextjs: { navigation: { pathname: "/dashboard", query: { sort: "location" } } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("columnheader", { name: "Location" })).toHaveAttribute("aria-sort", "ascending");
  },
};

/** On a phone, where the column headers are hidden, the Sort by menu sits beside Show done, open here. */
export const PhoneSortBy: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sort by Progress" }));
    await expect(canvas.getByRole("menuitemradio", { name: "Progress" })).toBeChecked();
    await expect(canvas.getByRole("menuitemradio", { name: "Location" })).toBeVisible();
  },
};
