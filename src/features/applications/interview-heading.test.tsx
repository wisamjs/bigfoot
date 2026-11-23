import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { InterviewEditor } from "./interview-editor";
import { UnsavedChanges } from "./unsaved-changes";

// Guarding leaving the page needs the router.
vi.mock("next/navigation", () => import("@/test/navigation"));

// Server Actions are mocked at their module: what the page sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({
  updateInterviewAction: vi.fn(),
  deleteInterviewAndLeaveAction: vi.fn(),
}));

/** Whether the window is as wide as a tablet or more, as matchMedia answers. */
let wide = true;

beforeEach(() => {
  vi.mocked(actions.updateInterviewAction).mockReset().mockResolvedValue({ ok: true });
  vi.mocked(actions.deleteInterviewAndLeaveAction).mockReset().mockReturnValue(new Promise(() => {}));
  wide = true;
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({ matches: query.includes("min-width") && wide, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
  );
});

// 15:00 UTC on November 1st: the calendar opens on November, wherever the tests run.
const technical = interview("i1", { application_id: "birch", kind: "technical", at: "2026-11-01T15:00:00Z" });
const birch = application("birch", { company: "Birch", title: "Senior Engineer", interviews: [technical] });

/** The Interview page's guarded column: the heading, the strip and the notes under one UnsavedChanges. */
function openPage(current = technical, app = birch) {
  const user = userEvent.setup();
  render(
    <UnsavedChanges>
      <Link href="/dashboard">Dashboard</Link>
      <InterviewEditor app={app} interview={current} />
    </UnsavedChanges>,
  );
  return { user };
}

const editButton = () => screen.getByRole("button", { name: "Edit details" });
const form = () => screen.getByRole("form", { name: "Edit details" });

describe("the Interview page heading", () => {
  it("shows the company and role, the kind as the title, and the date and time", () => {
    openPage();
    expect(screen.getByText("Birch · Senior Engineer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Technical" })).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- the date is a <time>, which has no role to query by.
    expect(document.querySelector("h1 ~ p time")).toHaveAttribute("datetime", technical.at);
  });

  it("says how far off a coming Interview is, and how long ago a completed one was", () => {
    const soon = interview("i2", { application_id: "birch", completed: false, at: new Date(Date.now() + 2 * 86_400_000).toISOString() });
    const { user } = openPage(soon, application("birch", { company: "Birch", interviews: [soon] }));
    expect(screen.getByText("Upcoming · in 2 days")).toBeInTheDocument();
    expect(user).toBeDefined();
  });

  it("says Completed with the days ago, grey once the Application is Done, and shows its Done badge", () => {
    const ago = interview("i3", { application_id: "birch", at: new Date(Date.now() - 10 * 86_400_000).toISOString() });
    openPage(ago, application("birch", { company: "Birch", interviews: [ago], status: "done", outcome: "rejected" }));
    const badge = screen.getByText("Completed · 10 days ago");
    expect(badge).toHaveClass("bg-tone-gray");
    expect(screen.getByText("Done · Rejected")).toBeInTheDocument();
  });

  it("shows no Done badge while the Application is In Progress", () => {
    openPage();
    expect(screen.queryByText(/^Done/)).not.toBeInTheDocument();
    expect(screen.getByText(/^Completed · /)).toHaveClass("bg-success-soft");
  });

  it("turns the kind and the date into fields, with focus on the kind", async () => {
    const { user } = openPage();
    await user.click(editButton());
    expect(screen.getByLabelText(/^Kind/)).toHaveFocus();
    expect(screen.getByLabelText(/^Kind/)).toHaveValue("technical");
    expect(screen.getByRole("group", { name: "Date and time" })).toBeInTheDocument();
    // The notes card has no kind.
    expect(screen.getAllByLabelText(/^Kind/)).toHaveLength(1);
  });

  it("saves a new kind on Enter, shows it, and gives focus back to the edit button", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.selectOptions(screen.getByLabelText(/^Kind/), "behavioural");
    await user.keyboard("{Enter}");

    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { kind: "behavioural" });
    expect(await screen.findByRole("heading", { level: 1, name: "Behavioural" })).toBeInTheDocument();
    await waitFor(() => expect(editButton()).toHaveFocus());
  });

  it("doesn't save on opening the date picker, then saves the picked date with its time", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.click(within(form()).getByRole("button", { name: /^Date, / }));
    await user.click(within(screen.getByRole("grid")).getByText("15"));
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    expect(form()).toBeInTheDocument();

    await user.click(within(form()).getByRole("button", { name: "Save" }));
    const saved = new Date(technical.at!);
    const expected = new Date(saved.getFullYear(), saved.getMonth(), 15, saved.getHours(), saved.getMinutes());
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { at: expected.toISOString() });
  });

  it("saves a time typed just before Enter", async () => {
    const { user } = openPage();
    await user.click(editButton());
    const time = within(form()).getByLabelText("Time");
    await user.clear(time);
    await user.type(time, "09:30{Enter}");
    const saved = new Date(technical.at!);
    const expected = new Date(saved.getFullYear(), saved.getMonth(), saved.getDate(), 9, 30);
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { at: expected.toISOString() });
  });

  it("saves on leaving the fields", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.selectOptions(screen.getByLabelText(/^Kind/), "leadership");
    await user.click(screen.getByRole("button", { name: "Add Interview notes" }));
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { kind: "leadership" });
  });

  it("refuses a cleared date, says why and sends nothing", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.click(within(form()).getByRole("button", { name: /^Date, / }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(within(form()).getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter the date and time.");
    expect(within(form()).getByRole("button", { name: /^Date, / })).toHaveAttribute("aria-invalid", "true");
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  });

  it("puts back the saved kind and date on Escape, without saving", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.selectOptions(screen.getByLabelText(/^Kind/), "leadership");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Technical" })).toBeInTheDocument();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    await waitFor(() => expect(editButton()).toHaveFocus());
  });

  it("puts them back on Cancel too", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.selectOptions(screen.getByLabelText(/^Kind/), "leadership");
    await user.click(within(form()).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { level: 1, name: "Technical" })).toBeInTheDocument();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  });

  it("closes only the date picker on Escape inside it", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.click(within(form()).getByRole("button", { name: /^Date, / }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(form()).toBeInTheDocument();
  });

  it("asks before leaving the page with a change not yet saved", async () => {
    const { user } = openPage();
    // The save on leaving the fields hangs, so the change is still unsaved when the link is followed.
    vi.mocked(actions.updateInterviewAction).mockReturnValue(new Promise(() => {}));
    await user.click(editButton());
    await user.selectOptions(screen.getByLabelText(/^Kind/), "leadership");
    await user.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(await screen.findByRole("button", { name: "Keep editing" })).toHaveFocus();
  });

  it("holds Delete Interview in ⋯, which asks first, and no card holds it", async () => {
    const { user } = openPage();
    expect(screen.queryByRole("button", { name: "Delete Interview" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More actions, Technical" }));
    expect(screen.queryByRole("menuitem", { name: "Edit details" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Interview?" });
    expect(actions.deleteInterviewAndLeaveAction).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(actions.deleteInterviewAndLeaveAction).toHaveBeenCalledWith("birch", "i1");
  });

  it("keeps the Interview when the delete dialog is cancelled", async () => {
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: "More actions, Technical" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(actions.deleteInterviewAndLeaveAction).not.toHaveBeenCalled();
  });

  it("moves Edit details into ⋯ on a phone", async () => {
    wide = false;
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: "More actions, Technical" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit details" }));
    expect(form()).toBeInTheDocument();
    expect(screen.getByLabelText(/^Kind/)).toHaveFocus();
  });

  it("outlines this Interview on the strip, with every segment linking to its page", async () => {
    const first = interview("i0", { application_id: "birch", kind: "recruiter_screen", at: "2026-10-20T15:00:00Z" });
    const last = interview("i2", { application_id: "birch", kind: "leadership", completed: false, at: new Date(Date.now() + 3 * 86_400_000).toISOString() });
    openPage(technical, application("birch", { company: "Birch", interviews: [first, technical, last] }));
    const segments = within(screen.getByRole("list", { name: "Interviews by date" })).getAllByRole("link");
    expect(segments.map((link) => link.getAttribute("href"))).toEqual([
      "/applications/birch/interviews/i0",
      "/applications/birch/interviews/i1",
      "/applications/birch/interviews/i2",
    ]);
    expect(segments.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page", null]);
    expect(await screen.findByText(/^This interview · /)).toBeInTheDocument();
    // The phone's line: where this one falls and a link to the next.
    expect(screen.getByText("Interview 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next: Leadership →" })).toHaveAttribute("href", "/applications/birch/interviews/i2");
  });

  it("has no link to a next Interview on the last one", () => {
    openPage();
    expect(screen.getByText("Interview 1 of 1")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Next:/ })).not.toBeInTheDocument();
  });
});
