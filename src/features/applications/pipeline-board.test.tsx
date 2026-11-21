import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { application, interview } from "@/test/applications";
import { PipelineBoard, PipelineBoardSkeleton } from "./pipeline-board";

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

/** Each column's label and the companies on its cards. */
function columns() {
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

describe("PipelineBoard", () => {
  it("groups Applications into Waiting, Interview scheduled and Offer, leaving other Done ones off", () => {
    render(<PipelineBoard title="Pipeline" subtitle="4 open" applications={all} />);
    expect(columns()).toEqual([
      ["Waiting", ["Acme"]],
      ["Interview scheduled", ["Birch"]],
      ["Offer", ["Cedar"]],
    ]);
  });

  it("adds a Done column when asked", () => {
    render(<PipelineBoard title="Pipeline" subtitle="4 open" applications={all} showDone />);
    expect(columns().at(-1)).toEqual(["Done", ["Umbrella"]]);
  });

  it("explains the board when there's nothing to show", () => {
    render(<PipelineBoard title="Pipeline" subtitle="0 open" applications={[rejected]} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByText(/Open applications show up here/)).toBeInTheDocument();
  });

  it("shows a card's next Interview and how many are completed, not every Interview", () => {
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[scheduled]} />);
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
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[app]} />);
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
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[app]} />);
    expect(screen.getByText("3 completed Interviews, 2 with notes")).toBeInTheDocument();
    expect(screen.queryByText(/Asked about caching/)).not.toBeInTheDocument();
    expect(screen.queryByText("Next Interview:")).not.toBeInTheDocument();
  });

  it("shows a Done card's Outcome", () => {
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[offer]} />);
    expect(within(screen.getByRole("listitem")).getByText("Offer")).toBeInTheDocument();
  });

  it("opens an Application from its card", async () => {
    const onOpen = vi.fn();
    render(<PipelineBoard title="Pipeline" subtitle="" applications={all} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /^Open Birch\b/ }));
    expect(onOpen).toHaveBeenCalledWith(scheduled);
  });

  it("has no controls on a card besides opening it", () => {
    render(<PipelineBoard title="Pipeline" subtitle="" applications={all} onOpen={vi.fn()} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      expect.stringMatching(/^Open Acme/),
      expect.stringMatching(/^Open Birch/),
      expect.stringMatching(/^Open Cedar/),
    ]);
  });

  it("is a single labelled picture when decorative", () => {
    render(<PipelineBoard title="Your pipeline" subtitle="" applications={all} decorative />);
    expect(
      screen.getByRole("img", { name: "Your pipeline: pipeline board with Waiting, Interview scheduled, Offer columns" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("PipelineBoardSkeleton", () => {
  it("shows the real title and hides its column shapes", () => {
    // Skeleton shapes are aria-hidden, with no role or text, so this checks the DOM itself.
    // eslint-disable-next-line testing-library/no-node-access -- see above
    const columns = render(<PipelineBoardSkeleton title="Pipeline" />).container.querySelector("[aria-hidden='true'].grid")!;
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- see above
    expect(columns.children).toHaveLength(3);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
