import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { application } from "@/test/applications";
import { DashboardApplications } from "./dashboard-applications";

// Each row's Change Status menu saves through a Server Action, which needs a request.
vi.mock("@/app/applications/actions", () => ({ updateApplicationAction: vi.fn() }));

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

    await user.click(screen.getByRole("checkbox", { name: "Show done" }));
    const umbrella = screen.getAllByRole("row").find((row) => row.textContent?.includes("Umbrella"))!;
    expect(within(umbrella).getAllByText("Done")[0]).toBeInTheDocument();
    expect(screen.queryByText(/Done Application is hidden/)).not.toBeInTheDocument();
  });

  it("has no Show done when no Application is Done", () => {
    render(<DashboardApplications applications={[birch]} />);
    expect(screen.queryByRole("checkbox", { name: "Show done" })).not.toBeInTheDocument();
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
  });

  it("links each row to its Application's page, so ⌘-click opens it in a new tab", async () => {
    const user = setUpDashboard();
    expect(screen.getByRole("link", { name: /^Open Birch\b/ })).toHaveAttribute("href", "/applications/birch");

    await user.click(screen.getByRole("checkbox", { name: "Show done" }));
    expect(screen.getByRole("link", { name: /^Open Umbrella\b/ })).toHaveAttribute("href", "/applications/umbrella");
  });

  it("welcomes a job seeker with no Applications, and offers the first one", () => {
    render(<DashboardApplications applications={[]} />);
    expect(screen.getByRole("heading", { name: "Your search starts here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first Application" })).toHaveAttribute("href", "/applications/new");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
