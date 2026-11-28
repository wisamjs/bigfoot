import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { application } from "@/test/applications";
import { DashboardApplications } from "./dashboard-applications";

vi.mock("next/navigation", () => import("@/test/navigation"));

afterEach(() => window.history.replaceState(null, "", "/dashboard"));

const birch = application("birch", { company: "Birch", title: "Engineer" });
const rejected = application("umbrella", { company: "Umbrella", status: "done", outcome: "rejected", is_waiting: false });

function setUpDashboard() {
  const user = userEvent.setup();
  render(<DashboardApplications applications={[birch, rejected]} />);
  return user;
}

describe("Dashboard Applications", () => {
  it("is a card named by its heading, with Add Application", () => {
    setUpDashboard();
    const card = screen.getByRole("region", { name: "Applications" });
    expect(within(card).getByRole("link", { name: "Add Application" })).toHaveAttribute("href", "/applications/new");
  });

  it("says how many Done Applications are hidden, and shows them after Show done", async () => {
    const user = setUpDashboard();
    expect(screen.queryByText("Umbrella")).not.toBeInTheDocument();
    expect(screen.getByText("1 Done Application is hidden. Turn on “Show done” to see it.")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Show done" }));
    const umbrella = screen.getAllByRole("row").find((row) => row.textContent?.includes("Umbrella"))!;
    expect(within(umbrella).getAllByText("Done")[0]).toBeInTheDocument();
    expect(screen.queryByText(/Done Application is hidden/)).not.toBeInTheDocument();
  });

  it("has no Show done when no Application is Done", () => {
    render(<DashboardApplications applications={[birch]} />);
    expect(screen.queryByRole("switch", { name: "Show done" })).not.toBeInTheDocument();
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
  });

  it("links each row to its Application's page, so ⌘-click opens it in a new tab", async () => {
    const user = setUpDashboard();
    expect(screen.getByRole("link", { name: /^Open Birch\b/ })).toHaveAttribute("href", "/applications/birch");

    await user.click(screen.getByRole("switch", { name: "Show done" }));
    expect(screen.getByRole("link", { name: /^Open Umbrella\b/ })).toHaveAttribute("href", "/applications/umbrella");
  });

  it("welcomes a job seeker with no Applications, and offers the first one", () => {
    render(<DashboardApplications applications={[]} />);
    expect(screen.getByRole("heading", { name: "Your search starts here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first Application" })).toHaveAttribute("href", "/applications/new");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  describe("sorting (BIG-209)", () => {
    const zeta = application("zeta", { company: "Zeta", location: "in_office", waiting_since: "2026-11-10" });
    const alpha = application("alpha", { company: "Alpha", location: "remote", waiting_since: "2026-11-20" });
    const companies = () =>
      screen
        .getAllByRole("link", { name: /^Open / })
        .map((link) => link.textContent?.replace(/^Open /, "").split(",")[0]);

    it("sorts by Progress until a column header is picked, then by that column, keeping it in the URL", async () => {
      const user = userEvent.setup();
      render(<DashboardApplications applications={[alpha, zeta]} />);
      // Both Waiting with no Interviews: the longest wait first.
      expect(companies()).toEqual(["Zeta", "Alpha"]);
      expect(screen.getByRole("columnheader", { name: "Progress" })).toHaveAttribute("aria-sort", "ascending");

      await user.click(screen.getByRole("button", { name: "Application" }));
      expect(companies()).toEqual(["Alpha", "Zeta"]);
      expect(window.location.search).toBe("?sort=application");
      expect(screen.getByRole("columnheader", { name: "Application" })).toHaveAttribute("aria-sort", "ascending");
      expect(screen.getByRole("columnheader", { name: "Progress" })).not.toHaveAttribute("aria-sort");

      await user.click(screen.getByRole("button", { name: "Progress" }));
      expect(window.location.search).toBe("");
    });

    it("opens in the sort the URL names", () => {
      window.history.replaceState(null, "", "/dashboard?sort=location");
      render(<DashboardApplications applications={[alpha, zeta]} />);
      expect(companies()).toEqual(["Zeta", "Alpha"]); // In-Office before Remote
      expect(screen.getByRole("columnheader", { name: "Location" })).toHaveAttribute("aria-sort", "ascending");
    });

    it("sorts from the Sort by menu on a phone", async () => {
      const user = userEvent.setup();
      render(<DashboardApplications applications={[alpha, zeta]} />);
      await user.click(screen.getByRole("button", { name: "Sort by Progress" }));
      const menu = screen.getByRole("menu");
      expect(within(menu).getAllByRole("menuitemradio").map((o) => o.textContent)).toEqual(["Progress", "Application", "Next", "Location"]);
      expect(within(menu).getByRole("menuitemradio", { name: "Progress" })).toBeChecked();

      await user.click(within(menu).getByRole("menuitemradio", { name: "Application" }));
      expect(companies()).toEqual(["Alpha", "Zeta"]);
      expect(window.location.search).toBe("?sort=application");
      expect(screen.getByRole("button", { name: "Sort by Application" })).toBeInTheDocument();
    });

    it("keeps Done Applications below the others in every sort", async () => {
      const user = userEvent.setup();
      window.history.replaceState(null, "", "/dashboard?sort=application");
      render(<DashboardApplications applications={[zeta, rejected, alpha]} />);
      await user.click(screen.getByRole("switch", { name: "Show done" }));
      expect(companies()).toEqual(["Alpha", "Zeta", "Umbrella"]);
    });

    it("has no Sort by menu for a single Application", () => {
      render(<DashboardApplications applications={[birch]} />);
      expect(screen.queryByRole("button", { name: /^Sort by/ })).not.toBeInTheDocument();
    });
  });
});
