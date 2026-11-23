import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { ApplicationList, ApplicationListSkeleton } from "./application-list";

// Server Actions are mocked at their module: what the menu sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({ updateApplicationAction: vi.fn() }));

beforeEach(() => {
  vi.mocked(actions.updateApplicationAction).mockReset().mockResolvedValue({ ok: true });
});

const waiting = application("Acme");
const scheduled = application("Birch", {
  is_waiting: false,
  interviews: [
    interview("past", { at: "2026-11-02T15:00:00Z", completed: true, kind: "recruiter_screen" }),
    interview("next", { at: "2027-01-05T15:00:00Z", completed: false, kind: "technical" }),
  ],
});
const offer = application("Cedar", { status: "done", outcome: "offer", is_waiting: false });
const rejected = application("Umbrella", { status: "done", outcome: "rejected", is_waiting: false });
const all = [waiting, scheduled, offer, rejected];

/** Each body row's company and Progress group, in order. */
function rows() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => {
      const cells = within(row).getAllByRole("cell");
      return [cells[0].querySelector("p")?.textContent, cells[1].querySelector("p")?.textContent];
    });
}

/** A row by its company. */
function row(company: string) {
  return screen.getAllByRole("row").find((r) => r.querySelector("p")?.textContent?.includes(company))!;
}

describe("ApplicationList", () => {
  it("is one table: Application, Progress, Next, Location", () => {
    render(<ApplicationList applications={all} linked />);
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Application",
      "Progress",
      "Next",
      "Location",
      "Change Status",
    ]);
  });

  it("orders rows Waiting, Interview scheduled and Offer, leaving other Done ones off", () => {
    render(<ApplicationList applications={all} />);
    expect(rows()).toEqual([
      ["Acme", "Waiting"],
      ["Birch", "Interview scheduled"],
      ["Cedar", "Offer"],
    ]);
  });

  it("adds Done rows last when asked", () => {
    render(<ApplicationList applications={all} showDone />);
    expect(rows().at(-1)).toEqual(["Umbrella", "Done"]);
  });

  it("explains the list when there's nothing to show", () => {
    render(<ApplicationList applications={[rejected]} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/Open Applications show up here/)).toBeInTheDocument();
  });

  it("shows each upcoming Interview's kind, soonest first, with its date for screen readers", () => {
    const app = application("Birch", {
      is_waiting: false,
      interviews: [
        interview("past", { at: "2026-11-02T15:00:00Z", completed: true, kind: "recruiter_screen" }),
        interview("am", { at: "2027-01-05T15:00:00Z", completed: false, kind: "hiring_manager" }),
        interview("pm", { at: "2027-01-05T19:00:00Z", completed: false, kind: "technical" }),
      ],
    });
    render(<ApplicationList applications={[app]} />);
    const upcoming = within(screen.getByRole("list", { name: "Upcoming Interviews" })).getAllByRole("listitem");
    expect(upcoming.map((li) => li.textContent)).toEqual([
      expect.stringMatching(/^Hiring Manager, Jan 5/),
      expect.stringMatching(/^Technical, Jan 5/),
    ]);
    expect(upcoming[0]).toHaveAttribute("title", expect.stringMatching(/Jan 5, 2027/));
    expect(screen.queryByText("Recruiter Screen")).not.toBeInTheDocument();
  });

  it("marks each completed Interview and says how many have Interview notes, without showing them", () => {
    const app = application("Birch", {
      is_waiting: true,
      interviews: [
        interview("a", { at: "2026-10-01T15:00:00Z", completed: true, notes: "Asked about caching." }),
        interview("b", { at: "2026-10-08T15:00:00Z", completed: true, notes: "Pairing exercise." }),
        interview("c", { at: "2026-10-15T15:00:00Z", completed: true }),
      ],
    });
    render(<ApplicationList applications={[app]} />);
    // The Progress column and its phone-width copy under the role.
    expect(screen.getAllByText("3 completed Interviews, 2 with notes")).toHaveLength(2);
    expect(screen.queryByText(/Asked about caching/)).not.toBeInTheDocument();
    expect(within(row("Birch")).getByText(/Waiting since/)).toBeInTheDocument();
  });

  it("shows a Done row's Outcome in Next, but not an Offer's, which Progress already says", () => {
    render(<ApplicationList applications={[offer, rejected]} showDone />);
    expect(within(row("Umbrella")).getByText("Rejected")).toBeInTheDocument();
    expect(within(within(row("Cedar")).getAllByRole("cell")[2]).getByText("—")).toBeInTheDocument();
  });

  it("shows the Location as text, or a dash", () => {
    const hybrid = { ...waiting, location: "hybrid" as const, office_days: 3 };
    render(<ApplicationList applications={[hybrid, offer]} />);
    expect(within(row("Acme")).getByText("Hybrid - 3x a Week")).toBeInTheDocument();
    expect(within(row("Cedar")).getAllByRole("cell")[3]).toHaveTextContent("—");
  });

  it("links a row to its Application's page", () => {
    render(<ApplicationList applications={all} linked />);
    expect(screen.getByRole("link", { name: /^Open Birch\b/ })).toHaveAttribute("href", "/applications/Birch");
  });

  it("has no controls on a row besides its link and its Change Status menu", () => {
    render(<ApplicationList applications={all} linked />);
    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Change Status, Acme",
      "Change Status, Birch",
      "Change Status, Cedar",
    ]);
    expect(screen.getAllByRole("link", { name: /^Open/ }).map((link) => link.textContent)).toEqual([
      expect.stringMatching(/^Open Acme/),
      expect.stringMatching(/^Open Birch/),
      expect.stringMatching(/^Open Cedar/),
    ]);
  });

  it("is a single labelled picture when decorative", () => {
    render(<ApplicationList applications={all} decorative />);
    expect(
      screen.getByRole("img", { name: "Applications ordered as Waiting, Interview scheduled, Offer" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ApplicationListSkeleton", () => {
  it("hides its shapes from assistive technology", () => {
    // Skeleton shapes are aria-hidden, with no role or text, so this checks the DOM itself.
    // eslint-disable-next-line testing-library/no-node-access -- see above
    const list = render(<ApplicationListSkeleton />).container.querySelector("[aria-hidden='true']")!;
    // eslint-disable-next-line testing-library/no-node-access -- see above
    expect(list.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

describe("a row's Change Status menu", () => {
  const menuButton = (company: string) => screen.getByRole("button", { name: `Change Status, ${company}` });

  it("is one button per linked row, named with its company, and none on a decorative list", () => {
    const { rerender } = render(<ApplicationList applications={all} showDone linked />);
    expect(screen.getAllByRole("button", { name: /^Change Status, / })).toHaveLength(4);
    expect(menuButton("Acme")).toBeInTheDocument();
    rerender(<ApplicationList applications={all} showDone decorative />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lists every Outcome on an In Progress row, and no Reopen", async () => {
    const user = userEvent.setup();
    render(<ApplicationList applications={[waiting]} linked />);
    await user.click(menuButton("Acme"));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Mark Offer",
      "Mark Rejected",
      "Mark Position Filled",
      "Mark Withdrawn",
      "Mark No Open Position",
      "Mark Not the Right Fit",
    ]);
    await user.keyboard("{Escape}");
  });

  it("lists the other Outcomes and Reopen on a Done row", async () => {
    const user = userEvent.setup();
    render(<ApplicationList applications={[rejected]} showDone linked />);
    await user.click(menuButton("Umbrella"));
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).not.toContain("Mark Rejected");
    expect(items.at(-1)).toBe("Reopen");
    await user.keyboard("{Escape}");
  });

  it("saves the pick at once, without opening the Application, and says so", async () => {
    const user = userEvent.setup();
    render(<ApplicationList applications={[waiting]} linked />);
    await user.click(menuButton("Acme"));
    await user.click(screen.getByRole("menuitem", { name: "Mark Rejected" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("Acme", { status: "done", outcome: "rejected" });
    expect(await screen.findByText(/Acme marked Rejected/)).toBeInTheDocument();
    expect(screen.getByText(/Show done/)).toBeInTheDocument();
  });

  it("reopens a Done row, clearing its Outcome", async () => {
    const user = userEvent.setup();
    render(<ApplicationList applications={[rejected]} showDone linked />);
    await user.click(menuButton("Umbrella"));
    await user.click(screen.getByRole("menuitem", { name: "Reopen" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("Umbrella", { status: "in_progress", outcome: null });
    expect(await screen.findByText("Umbrella reopened")).toBeInTheDocument();
  });

  it("moves focus to the row once its change reaches the list", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ApplicationList applications={[waiting, offer]} linked />);
    await user.click(menuButton("Acme"));
    await user.click(screen.getByRole("menuitem", { name: "Mark Offer" }));
    await screen.findByText("Acme marked Offer");
    rerender(<ApplicationList applications={[{ ...waiting, status: "done", outcome: "offer", is_waiting: false }, offer]} linked />);
    expect(screen.getByRole("link", { name: /^Open Acme/ })).toHaveFocus();
  });

  it("shows why a save failed beside the button, and the row stays where it is", async () => {
    vi.mocked(actions.updateApplicationAction).mockResolvedValue({ ok: false, error: "Couldn’t save" });
    const user = userEvent.setup();
    render(<ApplicationList applications={[waiting]} linked />);
    await user.click(menuButton("Acme"));
    await user.click(screen.getByRole("menuitem", { name: "Mark Rejected" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t save");
    expect(screen.queryByText(/marked Rejected/)).not.toBeInTheDocument();
  });
});
