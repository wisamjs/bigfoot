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
  it("shows Done Applications only after Show done", async () => {
    const user = setUpDashboard();
    expect(screen.queryByText("Umbrella")).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Show done (1)" }));
    const umbrella = screen.getAllByRole("row").find((row) => row.textContent?.includes("Umbrella"))!;
    expect(within(umbrella).getAllByText("Done")[0]).toBeInTheDocument();
  });

  it("links each row to its Application's page, so ⌘-click opens it in a new tab", async () => {
    const user = setUpDashboard();
    expect(screen.getByRole("link", { name: /^Open Birch\b/ })).toHaveAttribute("href", "/applications/birch");

    await user.click(screen.getByRole("checkbox", { name: "Show done (1)" }));
    expect(screen.getByRole("link", { name: /^Open Umbrella\b/ })).toHaveAttribute("href", "/applications/umbrella");
  });
});
