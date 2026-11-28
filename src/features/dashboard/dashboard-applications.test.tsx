import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { application, interview } from "@/test/applications";
import { DashboardApplications, DashboardApplicationsSkeleton } from "./dashboard-applications";

const upcoming = (id: string, at: string | null) => interview(id, { at, completed: false });
const scheduled = (id: string, company: string, at: string) =>
  application(id, { company, is_waiting: false, waiting_since: null, interviews: [upcoming(`${id}-next`, at)] });
const waiting = (id: string, company: string, since: string) => application(id, { company, waiting_since: since });
const done = (id: string, outcome: "offer" | "rejected") =>
  application(id, { company: id, status: "done", outcome, is_waiting: false, waiting_since: null });

const lumen = scheduled("lumen", "Lumen Bio", "2026-12-02T15:00:00Z");
const kestrel = scheduled("kestrel", "Kestrel AI", "2026-12-04T15:00:00Z");
const harbour = application("harbour", {
  company: "Harbour Analytics",
  title: "Senior Engineering Manager",
  is_waiting: false,
  waiting_since: null,
  interviews: [upcoming("harbour-tbd", null)],
});
const waitingApps = [
  waiting("fernway", "Fernway Health", "2026-09-01"),
  waiting("brightline", "Brightline Robotics", "2026-09-10"),
  waiting("saltmarsh", "Saltmarsh Energy", "2026-09-20"),
  waiting("quillon", "Quillon", "2026-10-01"),
];
const offer = done("Cobalt", "offer");
const rejected = done("Umbrella", "rejected");

const rows = () =>
  within(screen.getByRole("list"))
    .getAllByRole("link")
    .map((link) => [link.getAttribute("href"), link.textContent]);

describe("Dashboard Applications card", () => {
  it("is a card named by its heading, with Add Application and View all", () => {
    render(<DashboardApplications applications={[lumen, ...waitingApps, offer, rejected]} />);
    const card = screen.getByRole("region", { name: "Applications" });
    expect(within(card).getByRole("link", { name: "Add Application" })).toHaveAttribute("href", "/applications/new");
    // All counts In Progress Applications and Offers, as the Applications list's All does.
    const viewAll = within(card).getAllByRole("link", { name: /^View all 6 Applications/ });
    expect(viewAll).toHaveLength(2); // the heading's on wide screens, the foot's on a phone
    for (const link of viewAll) expect(link).toHaveAttribute("href", "/applications");
    expect(within(card).queryByRole("table")).not.toBeInTheDocument();
    expect(within(card).queryByRole("switch")).not.toBeInTheDocument();
  });

  it("has a row per Progress group in Progress order, leaving out empty groups and Done", () => {
    render(<DashboardApplications applications={[rejected, offer, ...waitingApps, harbour, lumen, kestrel]} />);
    expect(rows()).toEqual([
      [
        "/applications?progress=scheduled",
        "Show the 2 Applications with an Interview scheduled. Interview scheduled · 2 Lumen Bio, Kestrel AI",
      ],
      [
        "/applications/harbour",
        "Open Harbour Analytics, Senior Engineering Manager. Next round · date TBD · 1 Harbour Analytics",
      ],
      [
        "/applications?progress=waiting",
        "Show the 4 Waiting Applications. Waiting · 4 Fernway Health, Brightline Robotics, Saltmarsh Energy +1 more",
      ],
      ["/applications/Cobalt", "Open Cobalt, Engineer. Offer · 1 Cobalt"],
    ]);
  });

  it("lists a group's names in the Applications list's Progress order", () => {
    render(<DashboardApplications applications={[kestrel, lumen]} />);
    expect(rows()[0][1]).toMatch(/· 2 Lumen Bio, Kestrel AI$/);
  });

  it("shows each group's badge in the list's Progress colour", () => {
    render(<DashboardApplications applications={[lumen, ...waitingApps, offer]} />);
    expect(screen.getByText("Interview scheduled · 1")).toHaveClass("text-tone-blue-fg");
    expect(screen.getByText("Waiting · 4")).toHaveClass("text-fg-warning");
    expect(screen.getByText("Offer · 1")).toHaveClass("text-fg-success-strong");
  });

  it("welcomes a job seeker with no Applications, with one brand button and no View all", () => {
    render(<DashboardApplications applications={[]} />);
    expect(screen.getByRole("heading", { name: "Your search starts here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first Application" })).toHaveAttribute("href", "/applications/new");
    expect(screen.queryByRole("link", { name: "Add Application" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^View all/ })).not.toBeInTheDocument();
  });

  it("says every Application is wrapped up when all are Done and none an Offer", () => {
    render(<DashboardApplications applications={[rejected, done("Maple", "rejected")]} />);
    expect(screen.getByRole("heading", { name: "Every Application is wrapped up" })).toBeInTheDocument();
    expect(screen.getByText("Add the next role you apply for, or look back at the 2 you’ve finished.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Add Application" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "View all 2 Done Applications" })).toHaveAttribute("href", "/applications?progress=done");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

describe("DashboardApplicationsSkeleton", () => {
  it("keeps the real heading over four group rows in skeleton shapes", () => {
    const { container } = render(<DashboardApplicationsSkeleton />);
    expect(screen.getByRole("heading", { name: "Applications" })).toBeInTheDocument();
    // Skeleton shapes are aria-hidden, with no role or text, so this checks the DOM itself.
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see above
    expect(container.querySelectorAll("ul[aria-hidden] > li")).toHaveLength(4);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
