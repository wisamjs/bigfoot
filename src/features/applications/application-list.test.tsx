import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { application, interview } from "@/test/applications";
import { ApplicationList, ApplicationListSkeleton } from "./application-list";

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

/** Each group's label and the companies on its cards. */
function groups() {
  return screen.getAllByRole("region").map((section) => [
    section.getAttribute("aria-label"),
    within(section)
      .getAllByRole("listitem")
      .filter((li) => li.parentElement?.parentElement === section)
      .map((li) => li.querySelector("p")?.textContent),
  ]);
}

/** Matches a card's next-Interview row by its kind. */
function nextInterview(kind: string) {
  return (_: string, element: Element | null) =>
    element?.tagName === "P" && (element.textContent ?? "").startsWith(`Next Interview: ${kind}`);
}

describe("ApplicationList", () => {
  it("groups Applications into Waiting, Interview scheduled and Offer, leaving other Done ones off", () => {
    render(<ApplicationList applications={all} />);
    expect(groups()).toEqual([
      ["Waiting", ["Acme"]],
      ["Interview scheduled", ["Birch"]],
      ["Offer", ["Cedar"]],
    ]);
  });

  it("adds a Done group when asked", () => {
    render(<ApplicationList applications={all} showDone />);
    expect(groups().at(-1)).toEqual(["Done", ["Umbrella"]]);
  });

  it("explains the list when there's nothing to show", () => {
    render(<ApplicationList applications={[rejected]} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByText(/Open Applications show up here/)).toBeInTheDocument();
  });

  it("shows a card's next Interview and how many are completed, not every Interview", () => {
    render(<ApplicationList applications={[scheduled]} />);
    const card = screen.getByRole("listitem");
    expect(within(card).getByText(nextInterview("Technical"))).toBeInTheDocument();
    expect(within(card).queryByText("Recruiter Screen")).not.toBeInTheDocument();
    expect(within(card).getByText("1 completed Interview")).toBeInTheDocument();
    expect(within(card).queryByText(/more upcoming/)).not.toBeInTheDocument();
  });

  it("shows the soonest of two upcoming Interviews on the same day, plus how many more", () => {
    const app = application("Birch", {
      is_waiting: false,
      interviews: [
        interview("am", { at: "2027-01-05T15:00:00Z", completed: false, kind: "hiring_manager" }),
        interview("pm", { at: "2027-01-05T19:00:00Z", completed: false, kind: "technical" }),
      ],
    });
    render(<ApplicationList applications={[app]} />);
    expect(screen.getByText(nextInterview("Hiring Manager"))).toBeInTheDocument();
    expect(screen.queryByText("Technical")).not.toBeInTheDocument();
    expect(screen.getByText("+1 more upcoming")).toBeInTheDocument();
    expect(screen.queryByText(/completed/)).not.toBeInTheDocument();
  });

  it("says how many completed Interviews have Interview notes, without showing them", () => {
    const app = application("Birch", {
      is_waiting: true,
      interviews: [
        interview("a", { at: "2026-10-01T15:00:00Z", completed: true, notes: "Asked about caching." }),
        interview("b", { at: "2026-10-08T15:00:00Z", completed: true, notes: "Pairing exercise." }),
        interview("c", { at: "2026-10-15T15:00:00Z", completed: true }),
      ],
    });
    render(<ApplicationList applications={[app]} />);
    expect(screen.getByText("3 completed Interviews, 2 with notes")).toBeInTheDocument();
    expect(screen.queryByText(/Asked about caching/)).not.toBeInTheDocument();
    expect(screen.queryByText("Next Interview:")).not.toBeInTheDocument();
  });

  it("shows a Done card's Outcome", () => {
    render(<ApplicationList applications={[offer]} />);
    expect(within(screen.getByRole("listitem")).getByText("Offer")).toBeInTheDocument();
  });

  it("links a card to its Application's page", () => {
    render(<ApplicationList applications={all} linked />);
    expect(screen.getByRole("link", { name: /^Open Birch\b/ })).toHaveAttribute("href", "/applications/Birch");
  });

  it("has no controls on a card besides its link", () => {
    render(<ApplicationList applications={all} linked />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Open/ }).map((link) => link.textContent)).toEqual([
      expect.stringMatching(/^Open Acme/),
      expect.stringMatching(/^Open Birch/),
      expect.stringMatching(/^Open Cedar/),
    ]);
  });

  it("has a chip for each group that jumps to it, with its count", () => {
    render(<ApplicationList applications={all} linked />);
    const chips = within(screen.getByRole("navigation", { name: "Jump to a group" })).getAllByRole("link");
    expect(chips.map((chip) => chip.textContent)).toEqual(["Waiting1", "Scheduled1", "Offer1"]);
    expect(chips[1]).toHaveAttribute("href", "#applications-scheduled");
    expect(screen.getByRole("region", { name: "Interview scheduled" })).toHaveAttribute("id", "applications-scheduled");
  });

  it("has no chips for one group, or when decorative", () => {
    const { rerender } = render(<ApplicationList applications={[offer]} linked />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    rerender(<ApplicationList applications={all} decorative />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("is a single labelled picture when decorative", () => {
    render(<ApplicationList applications={all} decorative />);
    expect(
      screen.getByRole("img", { name: "Applications grouped as Waiting, Interview scheduled, Offer" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ApplicationListSkeleton", () => {
  it("hides its shapes from assistive technology", () => {
    // Skeleton shapes are aria-hidden, with no role or text, so this checks the DOM itself.
    // eslint-disable-next-line testing-library/no-node-access -- see above
    const list = render(<ApplicationListSkeleton />).container.querySelector("[aria-hidden='true']")!;
    // eslint-disable-next-line testing-library/no-node-access -- see above
    expect(list.children).toHaveLength(2);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
