import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { InterviewEditor } from "./interview-editor";
import { InterviewHeading } from "./interview-heading";
import { UnsavedChanges } from "./unsaved-changes";

// Guarding leaving the page needs the router.
vi.mock("next/navigation", () => import("@/test/navigation"));

// Server Actions are mocked at their module: what the page sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({
  updateInterviewAction: vi.fn(),
  deleteInterviewAndLeaveAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(actions.updateInterviewAction).mockReset().mockResolvedValue({ ok: true });
});

// 15:00 UTC on November 1st: the calendar opens on November, wherever the tests run.
const technical = interview("i1", { application_id: "birch", kind: "technical", at: "2026-11-01T15:00:00Z" });
const birch = application("birch", { company: "Birch", title: "Senior Engineer", interviews: [technical] });

/** The Interview page's guarded column: the heading and the editor under one UnsavedChanges. */
function openPage(current = technical) {
  const user = userEvent.setup();
  render(
    <UnsavedChanges>
      <Link href="/dashboard">Dashboard</Link>
      <InterviewHeading app={birch} interview={current} />
      <InterviewEditor app={birch} interview={current} />
    </UnsavedChanges>,
  );
  return { user };
}

const editButton = () => screen.getByRole("button", { name: "Edit kind and date" });
const form = () => screen.getByRole("form", { name: "Edit kind and date" });

describe("the Interview page heading", () => {
  it("shows the company, then the role, the kind and the date and time", () => {
    openPage();
    expect(screen.getByRole("heading", { level: 1, name: "Birch" })).toBeInTheDocument();
    const details = screen.getByText(/Senior Engineer · Technical Interview ·/);
    expect(within(details).getByText((_, el) => el?.tagName === "TIME")).toHaveAttribute("datetime", technical.at);
  });

  it("turns the kind and the date into fields, with focus on the kind", async () => {
    const { user } = openPage();
    await user.click(editButton());
    expect(screen.getByLabelText(/^Kind/)).toHaveFocus();
    expect(screen.getByLabelText(/^Kind/)).toHaveValue("technical");
    expect(screen.getByRole("group", { name: "Date and time" })).toBeInTheDocument();
    // The card below no longer has them.
    expect(screen.getAllByLabelText(/^Kind/)).toHaveLength(1);
  });

  it("saves a new kind on Enter, shows it, and gives focus back to the edit button", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.selectOptions(screen.getByLabelText(/^Kind/), "behavioural");
    await user.keyboard("{Enter}");

    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { kind: "behavioural" });
    expect(await screen.findByText(/Behavioural Interview/)).toBeInTheDocument();
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
    await user.click(screen.getByLabelText("Interview notes"));
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
    expect(screen.getByText(/Technical Interview/)).toBeInTheDocument();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    await waitFor(() => expect(editButton()).toHaveFocus());
  });

  it("puts them back on Cancel too", async () => {
    const { user } = openPage();
    await user.click(editButton());
    await user.selectOptions(screen.getByLabelText(/^Kind/), "leadership");
    await user.click(within(form()).getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/Technical Interview/)).toBeInTheDocument();
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
});
