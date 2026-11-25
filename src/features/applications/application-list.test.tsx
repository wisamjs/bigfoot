import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
      "Opens the Application",
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

  it("marks completed Interviews green while In Progress and grey once Done (BIG-177)", () => {
    const past = interview("u-past", { at: "2026-11-02T15:00:00Z", completed: true, category: "recruiter", title: "Recruiter Screen" });
    render(<ApplicationList applications={[scheduled, { ...rejected, interviews: [past] }]} showDone />);
    // Each row draws Progress twice: under the role on a phone, and in its own column.
    // eslint-disable-next-line testing-library/no-node-access -- the marks are decoration (aria-hidden), with no role or text to query by.
    const marks = (company: string) => [...row(company).querySelectorAll("span.rounded-full")].map((mark) => mark.className);
    expect(marks("Birch")).toHaveLength(2);
    expect(marks("Birch").every((mark) => mark.includes("bg-fg-success-strong"))).toBe(true);
    expect(marks("Umbrella")).toHaveLength(2);
    expect(marks("Umbrella").every((mark) => mark.includes("bg-tone-gray-fg"))).toBe(true);
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
    const upcoming = within(screen.getByRole("list", { name: "Upcoming Interviews" })).getAllByRole("listitem");
    expect(upcoming.map((li) => li.textContent)).toEqual([
      expect.stringMatching(/^Final Round, Hiring Manager, Jan 5/),
      expect.stringMatching(/^Technical, Technical, Jan 5/),
    ]);
    expect(upcoming[0]).toHaveAttribute("title", expect.stringMatching(/^Hiring Manager · Jan 5, 2027/));
    expect(screen.queryByText("Recruiter Screen")).not.toBeInTheDocument();
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
    expect(screen.getAllByText("3 completed Interviews")).toHaveLength(2);
    expect(screen.queryByText(/Asked about caching/)).not.toBeInTheDocument();
    expect(screen.queryByText(/with notes/)).not.toBeInTheDocument();
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
