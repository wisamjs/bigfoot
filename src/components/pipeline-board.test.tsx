import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { application, interview } from "@/test/applications";
import { PipelineBoard } from "./pipeline-board";

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

  it("opens an Application from its card", async () => {
    const onOpen = vi.fn();
    render(<PipelineBoard title="Pipeline" subtitle="" applications={all} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /^Edit Birch\b/ }));
    expect(onOpen).toHaveBeenCalledWith(scheduled);
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
