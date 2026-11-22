import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { application } from "@/test/applications";
import { DashboardPipeline } from "./dashboard-pipeline";

const birch = application("birch", { company: "Birch", title: "Engineer" });
const rejected = application("umbrella", { company: "Umbrella", status: "done", outcome: "rejected", is_waiting: false });

function setUpDashboard() {
  const user = userEvent.setup();
  render(<DashboardPipeline applications={[birch, rejected]} subtitle="1 open" />);
  return user;
}

describe("Dashboard Pipeline", () => {
  it("shows Done Applications only after Show done", async () => {
    const user = setUpDashboard();
    expect(screen.queryByRole("region", { name: "Done" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Show done (1)" }));
    expect(within(screen.getByRole("region", { name: "Done" })).getByText("Umbrella")).toBeInTheDocument();
  });

  it("links each card to its Application's page, so ⌘-click opens it in a new tab", async () => {
    const user = setUpDashboard();
    expect(screen.getByRole("link", { name: /^Open Birch\b/ })).toHaveAttribute("href", "/applications/birch");

    await user.click(screen.getByRole("checkbox", { name: "Show done (1)" }));
    expect(screen.getByRole("link", { name: /^Open Umbrella\b/ })).toHaveAttribute("href", "/applications/umbrella");
  });
});
