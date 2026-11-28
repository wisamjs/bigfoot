import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, within } from "storybook/test";
import { applications, DESKTOP, MOBILE, NARROW, PAGE, unscheduledApplications, user } from "@/test/pages";
import { ApplicationsPage, ApplicationsPageSkeleton } from "./applications-page";

// The Applications page, whole, as /applications renders it (BIG-252): each filter at a laptop's
// width and a phone's. The filter and sort come from the URL (`?progress=waiting`), as a story's
// `query` sets them.

const meta = {
  title: "Pages/Applications",
  component: ApplicationsPage,
  args: { user, applications },
  ...PAGE,
  parameters: { ...PAGE.parameters, nextjs: { appDirectory: true, navigation: { pathname: "/applications" } } },
} satisfies Meta<typeof ApplicationsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page opened at `query`, such as `{ progress: "waiting" }`. */
function at(query: Record<string, string>) {
  return { parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/applications", query } } } };
}

/** All: In Progress Applications and Offers, the filter's counts, and a line pointing to Done. */
const all: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();
    await expect(canvas.getByRole("region", { name: "All Applications" })).toBeVisible();
    await expect(canvas.getByText("2 Done Applications aren’t shown. Pick Done to see them.")).toBeVisible();
    await expect(canvas.queryByRole("switch", { name: "Show done" })).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Applications" })).toHaveAttribute("aria-current", "page");
  },
};
export const AllDesktop: Story = {
  ...all,
  ...DESKTOP,
  play: async (context) => {
    await all.play!(context);
    const filter = context.canvas.getByRole("radiogroup", { name: "Progress" });
    await expect(within(filter).getByRole("radio", { name: /^All \d+$/ })).toBeChecked();
  },
};
export const AllMobile: Story = {
  ...all,
  ...MOBILE,
  play: async (context) => {
    await all.play!(context);
    await expect(context.canvas.getByRole("button", { name: "Filter: All" })).toBeVisible();
    await expect(context.canvas.getByRole("link", { name: "Add Application" })).toBeVisible();
  },
};
/** The narrowest phone, 320px: the toolbar wraps, nothing scrolls sideways. */
export const AllNarrow: Story = {
  ...all,
  ...NARROW,
  play: async (context) => {
    await all.play!(context);
    const doc = context.canvasElement.ownerDocument.documentElement;
    await expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth);
  },
};

/** Filtered to Waiting: "Showing N of M", announced, Clear filter, and the card named for it. */
const waiting: Story = {
  ...at({ progress: "waiting" }),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("region", { name: "Waiting Applications" })).toBeVisible();
    const showing = canvas.getAllByText(/^Showing \d+ of \d+$/).find((status) => status.checkVisibility())!;
    await expect(showing).toHaveAttribute("aria-live", "polite");
    await expect(canvas.getAllByRole("button", { name: "Clear filter" }).some((b) => b.checkVisibility())).toBe(true);
  },
};
export const WaitingDesktop: Story = { ...waiting, ...DESKTOP };
export const WaitingMobile: Story = {
  ...waiting,
  ...MOBILE,
  play: async (context) => {
    await waiting.play!(context);
    await expect(context.canvas.getByRole("button", { name: "Filter: Waiting" })).toBeVisible();
  },
};

/** Filtered to Done: the Done Applications, "Showing 2 Done", and no line pointing to them. */
const done: Story = {
  ...at({ progress: "done" }),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: /^Open Brightwater Data\b/ })).toBeVisible();
    await expect(canvas.getAllByText("Showing 2 Done").some((status) => status.checkVisibility())).toBe(true);
    await expect(canvas.queryByText(/aren’t shown/)).not.toBeInTheDocument();
  },
};
export const DoneDesktop: Story = { ...done, ...DESKTOP };
export const DoneMobile: Story = { ...done, ...MOBILE };

/** Unscheduled Interviews (BIG-221): Next round · date TBD between Interview scheduled and Waiting, in the filter too. */
export const DateTbdDesktop: Story = {
  ...DESKTOP,
  args: { applications: unscheduledApplications },
  play: async ({ canvas }) => {
    const filter = canvas.getByRole("radiogroup", { name: "Progress" });
    const names = within(filter)
      .getAllByRole("radio")
      .map((item) => item.textContent?.replace(/ \d+$/, ""));
    await expect(names).toEqual(["All", "Interview scheduled", "Next round · date TBD", "Waiting", "Offer", "Done"]);
  },
};

/** No Applications at all: Bigfoot and Add your first Application, the page's one brand button. */
const none: Story = {
  args: { applications: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Your search starts here" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Add your first Application" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Add Application" })).not.toBeInTheDocument();
  },
};
export const NoApplicationsDesktop: Story = { ...none, ...DESKTOP };
export const NoApplicationsMobile: Story = { ...none, ...MOBILE };

/** A filter with no matches, which only a stale link can pick: Bigfoot and Clear filter. */
const noMatches: Story = {
  ...at({ progress: "unscheduled" }),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "No Next round · date TBD Applications right now" })).toBeVisible();
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument();
  },
};
export const NoMatchesDesktop: Story = { ...noMatches, ...DESKTOP };
export const NoMatchesMobile: Story = { ...noMatches, ...MOBILE };

/** On a phone, the filter's menu, open: All set off first, then each Progress value with its count. */
export const FilterMenuMobile: Story = {
  ...at({ progress: "waiting" }),
  ...MOBILE,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter: Waiting" }));
    const menu = screen.getByRole("menu", { name: "Filter by Progress" });
    await expect(within(menu).getByRole("menuitemradio", { name: /^Waiting/ })).toBeChecked();
    await expect(within(menu).getByRole("menuitemradio", { name: /^All/ })).toBeVisible();
  },
};
/** The menu on the narrowest phone fits on screen. */
export const FilterMenuNarrow: Story = {
  ...FilterMenuMobile,
  ...NARROW,
  play: async (context) => {
    await FilterMenuMobile.play!(context);
    const box = screen.getByRole("menu").getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual(0);
    await expect(box.right).toBeLessThanOrEqual(context.canvasElement.ownerDocument.documentElement.clientWidth);
  },
};

/** While the Applications load: the real heading and filter label, shapes for the rest. */
const loading: Story = {
  render: () => <ApplicationsPageSkeleton />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();
  },
};
export const LoadingDesktop: Story = {
  ...loading,
  ...DESKTOP,
  play: async (context) => {
    await loading.play!(context);
    await expect(context.canvas.getByText("Progress", { selector: "span" })).toBeVisible();
  },
};
export const LoadingMobile: Story = { ...loading, ...MOBILE };
