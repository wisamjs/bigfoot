import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { application, interview } from "@/test/applications";
import { ApplicationList, ApplicationListSkeleton } from "./application-list";

const waiting = application("Acme");
const scheduled = application("Birch", {
  is_waiting: false,
  interviews: [
    interview("past", { at: "2026-11-02T15:00:00Z", completed: true, category: "recruiter", title: "Recruiter Screen" }),
    interview("next", { at: "2027-01-05T15:00:00Z", completed: false, category: "technical", title: "Technical" }),
  ],
});
const offer = application("Cedar", { status: "done", outcome: "offer", is_waiting: false });
const rejected = application("Umbrella", { status: "done", outcome: "rejected", is_waiting: false });
const all = [waiting, scheduled, offer, rejected];

beforeEach(() => {
  // Friday 20 November 2026, mid-afternoon. Only Date is faked, so user events still run.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 20, 15, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/** A local time on a day of November 2026, as an ISO timestamp. */
function nov(day: number, hour = 14) {
  return new Date(2026, 10, day, hour, 0).toISOString();
}

/** Each body row's company and Progress label, in order. */
function rows() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => {
      const cells = within(row).getAllByRole("cell");
      return [cells[0].querySelector("p")?.textContent, cells[1].querySelector("span")?.textContent];
    });
}

/** A row's cell: 0 Application (with the phone's stacked copy), 1 Progress, 2 Next, 3 Location. */
function cell(company: string, n: number) {
  return within(row(company)).getAllByRole("cell")[n];
}

/** The classes of each Interview's mark in a cell's Progress. */
function marks(container: HTMLElement) {
  // The marks are decoration (aria-hidden), with no role or text to query by.
  return [...container.querySelectorAll("[data-mark]")].map((mark) => mark.className);
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
      "Opens the Application",
    ]);
  });

  it("orders rows Waiting, Interview scheduled and Offer, leaving other Done ones off", () => {
    render(<ApplicationList applications={all} />);
    expect(rows()).toEqual([
      ["Acme", "Waiting · 19 days"],
      ["Birch", "Interview scheduled"],
      ["Cedar", "Offer"],
    ]);
  });

  it("adds Done rows last when asked", () => {
    render(<ApplicationList applications={all} showDone />);
    expect(rows().at(-1)).toEqual(["Umbrella", "Done"]);
  });

  it("marks every Interview: completed green, the next in the brand colour, later ones muted", () => {
    const app = application("Birch", {
      is_waiting: false,
      interviews: [
        interview("done", { at: nov(2), completed: true }),
        interview("next", { at: nov(23), completed: false }),
        interview("later", { at: nov(30), completed: false }),
      ],
    });
    render(<ApplicationList applications={[app]} />);
    const [completed, next, later] = marks(cell("Birch", 1));
    expect(completed).toContain("bg-fg-success-strong");
    expect(next).toContain("bg-brand");
    expect(later).toContain("bg-line-medium");
    expect(within(cell("Birch", 1)).getByText("1 of 3 Interviews completed")).toBeInTheDocument();
    // The phone's stacked copy marks them the same way.
    expect(marks(cell("Birch", 0))).toEqual([completed, next, later]);
  });

  it("marks a Done Application's completed Interviews grey (BIG-177)", () => {
    const past = interview("u-past", { at: "2026-11-02T15:00:00Z", completed: true, category: "recruiter", title: "Recruiter Screen" });
    render(<ApplicationList applications={[{ ...rejected, interviews: [past] }]} showDone />);
    expect(marks(cell("Umbrella", 1))).toEqual([expect.stringContaining("bg-tone-gray-fg")]);
  });

  it("labels Progress by group, each in its own colour", () => {
    render(<ApplicationList applications={all} showDone />);
    expect(within(cell("Acme", 1)).getByText("Waiting · 19 days")).toHaveClass("text-fg-warning");
    expect(within(cell("Birch", 1)).getByText("Interview scheduled")).toHaveClass("text-tone-blue-fg");
    expect(within(cell("Cedar", 1)).getByText("Offer")).toHaveClass("text-fg-success-strong");
  });

  it("explains the list when there's nothing to show", () => {
    render(<ApplicationList applications={[rejected]} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/Open Applications show up here/)).toBeInTheDocument();
  });

  it("shows each upcoming Interview's title, soonest first, with its category and date for screen readers", () => {
    const app = application("Birch", {
      is_waiting: false,
      interviews: [
        interview("past", { at: "2026-11-02T15:00:00Z", completed: true, category: "recruiter", title: "Recruiter Screen" }),
        interview("am", { at: "2027-01-05T15:00:00Z", completed: false, category: "hiring_manager", title: "Final Round" }),
        interview("pm", { at: "2027-01-05T19:00:00Z", completed: false, category: "technical", title: "Technical" }),
      ],
    });
    render(<ApplicationList applications={[app]} />);
    const next = cell("Birch", 2);
    expect(within(next).getByText("Final Round")).toHaveClass("font-semibold", "text-heading");
    expect(within(next).getByText(/^\s*·\s*\+1 later$/)).toBeInTheDocument();
    expect(next).toHaveTextContent(/Upcoming Interviews: Final Round, Hiring Manager, Jan 5.*; Technical, Technical, Jan 5/);
    // eslint-disable-next-line testing-library/no-node-access -- the hover text is on Next's wrapper.
    expect(next.firstElementChild).toHaveAttribute("title", expect.stringMatching(/^Final Round · Hiring Manager · Jan 5, 2027/));
    expect(screen.queryByText("Recruiter Screen")).not.toBeInTheDocument();
  });

  it("puts the next Interview's day and time in the brand colour when it is today or tomorrow", () => {
    const soon = application("Birch", { is_waiting: false, interviews: [interview("t", { at: nov(21), completed: false })] });
    const later = application("Cedar", { is_waiting: false, interviews: [interview("l", { at: nov(25), completed: false })] });
    render(<ApplicationList applications={[soon, later]} />);
    expect(within(cell("Birch", 2)).getByText(/^Tomorrow · /)).toHaveClass("text-fg-brand");
    expect(within(cell("Cedar", 2)).getByText(/^In 5 days · /)).toHaveClass("text-body");
    // On a phone, Next on one line.
    expect(within(cell("Birch", 0)).getByText(/^tomorrow /)).toHaveClass("text-fg-brand");
    expect(within(cell("Cedar", 0)).getByText("in 5 days")).toBeInTheDocument();
  });

  it("says Nothing booked while Waiting, with Waiting since in the warning colour", () => {
    render(<ApplicationList applications={[waiting]} />);
    expect(within(cell("Acme", 2)).getByText("Nothing booked")).toBeInTheDocument();
    expect(within(cell("Acme", 2)).getByText("Waiting since Nov 1")).toHaveClass("text-fg-warning");
  });

  it("stacks a phone's row: role · Location, Progress, then Next", () => {
    const hybrid = { ...waiting, location: "hybrid" as const, office_days: 3 };
    render(<ApplicationList applications={[hybrid]} />);
    const first = cell("Acme", 0);
    expect(within(first).getByText("Engineer")).toHaveTextContent("Engineer · Hybrid - 3x a Week");
    expect(within(first).getByText("Waiting · 19 days")).toBeInTheDocument();
    expect(within(first).getByText("Nothing booked")).toBeInTheDocument();
  });

  it("marks each completed Interview without showing or counting its Interview notes", () => {
    const app = application("Birch", {
      is_waiting: true,
      interviews: [
        interview("a", { at: "2026-10-01T15:00:00Z", completed: true, how_it_went: "Asked about caching." }),
        interview("b", { at: "2026-10-08T15:00:00Z", completed: true, how_it_went: "Pairing exercise." }),
        interview("c", { at: "2026-10-15T15:00:00Z", completed: true }),
      ],
    });
    render(<ApplicationList applications={[app]} />);
    // The Progress column and its phone-width copy under the role.
    expect(screen.getAllByText("3 of 3 Interviews completed")).toHaveLength(2);
    expect(screen.queryByText(/Asked about caching/)).not.toBeInTheDocument();
    expect(screen.queryByText(/with notes/)).not.toBeInTheDocument();
    expect(within(cell("Birch", 2)).getByText(/Waiting since/)).toBeInTheDocument();
  });

  it("shows a Done row's Outcome in Next, but not an Offer's, which Progress already says", () => {
    render(<ApplicationList applications={[offer, rejected]} showDone />);
    expect(within(cell("Umbrella", 2)).getByText("Rejected")).toBeInTheDocument();
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

  it("has no controls on a row besides its link, and ends a linked row in a decorative chevron", () => {
    render(<ApplicationList applications={all} linked />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Open/ }).map((link) => link.textContent)).toEqual([
      expect.stringMatching(/^Open Acme/),
      expect.stringMatching(/^Open Birch/),
      expect.stringMatching(/^Open Cedar/),
    ]);
    expect(within(row("Acme")).getAllByRole("cell").at(-1)).not.toBeEmptyDOMElement();
  });

  it("has no chevron on a row that isn't linked", () => {
    render(<ApplicationList applications={all} />);
    expect(within(row("Acme")).getAllByRole("cell").at(-1)).toBeEmptyDOMElement();
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
