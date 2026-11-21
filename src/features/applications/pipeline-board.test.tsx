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

  it("lists a card's Interviews, marking completed ones as past", () => {
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[scheduled]} />);
    const items = within(screen.getByRole("list", { name: "Interviews" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringMatching(/^Recruiter Screen.*\(past\)$/),
      expect.not.stringContaining("(past)"),
    ]);
    expect(items[1]).toHaveTextContent("Technical");
  });

  it("marks an Interview that has Interview notes, without showing them", () => {
    const noted = { ...scheduled.interviews[0], notes: "Asked about caching." };
    const app = { ...scheduled, interviews: [noted, scheduled.interviews[1]] };
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[app]} />);
    const items = within(screen.getByRole("list", { name: "Interviews" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("(has notes)");
    expect(items[1]).not.toHaveTextContent("(has notes)");
    expect(screen.queryByText(/Asked about caching/)).not.toBeInTheDocument();
  });

  it("opens an Application from its card", async () => {
    const onOpen = vi.fn();
    render(<PipelineBoard title="Pipeline" subtitle="" applications={all} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /^Open Birch\b/ }));
    expect(onOpen).toHaveBeenCalledWith(scheduled);
  });

  it("hides a card's completed Interviews and shows them again, leaving upcoming ones", async () => {
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[scheduled]} />);
    const toggle = screen.getByRole("button", { name: "Hide completed Interviews, Birch" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    const items = within(screen.getByRole("list", { name: "Interviews" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([expect.stringContaining("Technical")]);

    await userEvent.click(toggle);
    expect(within(screen.getByRole("list", { name: "Interviews" })).getAllByRole("listitem")).toHaveLength(2);
  });

  it("offers only the buttons that would change a card", () => {
    const upcomingOnly = { ...scheduled, id: "elm", company: "Elm", interviews: [scheduled.interviews[1]] };
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[waiting, upcomingOnly]} />);
    expect(screen.queryByRole("button", { name: /Hide completed/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse card, Elm" })).toBeInTheDocument();
    // A brand-new Waiting card has nothing to collapse.
    expect(screen.queryByRole("button", { name: /card, Acme/ })).not.toBeInTheDocument();
  });

  it("collapses a card to its header and expands it with the hide choice kept", async () => {
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[scheduled, offer]} />);
    await userEvent.click(screen.getByRole("button", { name: "Hide completed Interviews, Birch" }));
    const collapse = screen.getByRole("button", { name: "Collapse card, Birch" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(collapse);
    expect(collapse).toHaveAttribute("aria-expanded", "false");
    expect(collapse).toHaveAccessibleName("Expand card, Birch");
    expect(screen.queryByRole("list", { name: "Interviews" })).not.toBeInTheDocument();
    expect(screen.getByText("Birch")).toBeVisible();
    // Only Birch collapsed.
    expect(screen.getByRole("button", { name: "Collapse card, Cedar" })).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(collapse);
    const items = within(screen.getByRole("list", { name: "Interviews" })).getAllByRole("listitem");
    expect(items).toHaveLength(1);
  });

  it("does not open the Application from a card's controls", async () => {
    const onOpen = vi.fn();
    render(<PipelineBoard title="Pipeline" subtitle="" applications={[scheduled]} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "Hide completed Interviews, Birch" }));
    await userEvent.click(screen.getByRole("button", { name: "Collapse card, Birch" }));
    expect(onOpen).not.toHaveBeenCalled();
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
