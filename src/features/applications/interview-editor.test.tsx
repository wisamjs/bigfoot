import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { DATE_NEEDED } from "@/lib/validation";
import { InterviewEditor } from "./interview-editor";
import { NOTES_PAUSE_MS } from "./interview-notes-form";
import { UnsavedChanges } from "./unsaved-changes";

// The editor guards leaving the page, which needs the router.
vi.mock("next/navigation", () => import("@/test/navigation"));

// Server Actions are mocked at their module: what the page sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({
  updateInterviewAction: vi.fn(),
  deleteInterviewAndLeaveAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(actions.updateInterviewAction).mockReset().mockResolvedValue({ ok: true });
  // On success the action redirects, so it never comes back.
  vi.mocked(actions.deleteInterviewAndLeaveAction).mockReset().mockReturnValue(new Promise(() => {}));
});

const technical = interview("i1", { application_id: "birch", kind: "technical", notes: "Asked about caching" });
const birch = application("birch", { company: "Birch", interviews: [technical] });

/** The page puts the editor inside UnsavedChanges, with the heading. */
function openPage(app = birch, current = technical) {
  const user = userEvent.setup();
  render(
    <UnsavedChanges>
      <Link href="/dashboard">Dashboard</Link>
      <InterviewEditor app={app} interview={current} />
    </UnsavedChanges>,
  );
  return { user };
}

describe("the Interview page", () => {
  it("holds the Interview notes, named without a row number, and no kind or date (they're in the heading)", async () => {
    const { user } = openPage();
    expect(screen.queryByLabelText("Kind")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Date and time" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Interview notes")).toHaveValue("Asked about caching");

    await user.type(screen.getByLabelText("Interview notes"), " and queues");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { notes: "Asked about caching and queues" });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("works the same for an Interview of a Done Application", async () => {
    const done = { ...birch, status: "done" as const, outcome: "rejected" as const };
    const { user } = openPage(done);
    await user.type(screen.getByLabelText("Interview notes"), "!");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { notes: "Asked about caching!" });
  });

  it("won't save notes on an Interview with no date, and says to set one", async () => {
    const undated = interview("i1", { application_id: "birch", at: null });
    const { user } = openPage(application("birch", { company: "Birch", interviews: [undated] }), undated);
    await user.type(screen.getByLabelText("Interview notes"), "Went well");
    await user.tab();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Interview notes")).toHaveAccessibleDescription(DATE_NEEDED);
  });

  it("asks before deleting, warning about the Interview notes, then deletes and leaves", async () => {
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: "Delete Interview" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Interview?" });
    expect(dialog).toHaveTextContent("will be deleted, with its Interview notes");
    expect(actions.deleteInterviewAndLeaveAction).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(actions.deleteInterviewAndLeaveAction).toHaveBeenCalledWith("birch", "i1");
  });

  it("keeps the Interview when the dialog is cancelled", async () => {
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: "Delete Interview" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(actions.deleteInterviewAndLeaveAction).not.toHaveBeenCalled();
  });

  it("names the Interview and its notes in the delete warning, with Cancel focused", async () => {
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: "Delete Interview" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Interview?" });
    expect(dialog).toHaveTextContent(/Technical on \d+ Nov will be deleted, with its Interview notes\. This can’t be undone\./);
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("leaves the notes out of the warning when there are none, and the date when there is none", async () => {
    const bare = interview("i1", { application_id: "birch", kind: "technical", notes: null, at: null });
    const { user } = openPage(application("birch", { company: "Birch", interviews: [bare] }), bare);
    await user.click(screen.getByRole("button", { name: "Delete Interview" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Technical will be deleted. This can’t be undone.");
  });

  it("stays open and says why when deleting fails", async () => {
    vi.mocked(actions.deleteInterviewAndLeaveAction).mockResolvedValue({ ok: false, error: "Interview not found" });
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: "Delete Interview" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Interview?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Interview not found");
  });

  it("asks before leaving with Interview notes still inside their typing pause", async () => {
    const { user } = openPage();
    // Typing and then leaving at once: the link click blurs the notes, whose save hangs.
    vi.mocked(actions.updateInterviewAction).mockReturnValue(new Promise(() => {}));
    await user.type(screen.getByLabelText("Interview notes"), " and queues");
    await user.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You have unsaved changes.");
    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
  });
});

describe("Interview notes", () => {
  const blank = interview("i1", { application_id: "oak", kind: "recruiter_screen" });
  const oak = application("oak", { company: "Oak", interviews: [blank] });

  // The pause before notes save is a timer; user-event's own delays keep running with the clock.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function pause(ms = NOTES_PAUSE_MS) {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  function openNotes(current = blank) {
    const { user } = openPage({ ...oak, interviews: [current] }, current);
    return { user, notes: screen.getByLabelText("Interview notes") };
  }

  it("has no Save button", () => {
    openNotes();
    expect(screen.queryByRole("button", { name: /^Save/ })).not.toBeInTheDocument();
  });

  it("saves on leaving the field, trimmed, keeping line breaks", async () => {
    const { user, notes } = openNotes();
    await user.type(notes, " Friendly.{Enter}{Enter}Ask about the team. ");
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledExactlyOnceWith("oak", "i1", {
      notes: "Friendly.\n\nAsk about the team.",
    });
  });

  it("saves after a pause in typing, and the pause starts over with each key", async () => {
    const { user, notes } = openNotes();
    await user.type(notes, "Fri");
    pause(NOTES_PAUSE_MS / 2);
    await user.type(notes, " end");
    pause(NOTES_PAUSE_MS / 2);
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();

    pause(NOTES_PAUSE_MS / 2);
    expect(actions.updateInterviewAction).toHaveBeenCalledExactlyOnceWith("oak", "i1", { notes: "Fri end" });

    // Leaving the field with nothing new to save sends nothing more.
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);
  });

  it("clears notes when they are emptied, and has nothing to save when only spaces are typed", async () => {
    const { user, notes } = openNotes(technical);
    await user.clear(notes);
    await user.type(notes, "  ");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i1", { notes: null });
  });

  it("sends nothing when only spaces are typed into empty notes", async () => {
    const { user, notes } = openNotes();
    await user.type(notes, "   ");
    await user.tab();
    pause();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  });

  it("keeps typing possible while a save is in flight, and never sends two saves at once", async () => {
    let settle!: (result: actions.ActionResult) => void;
    vi.mocked(actions.updateInterviewAction).mockReturnValueOnce(new Promise((resolve) => (settle = resolve)));
    const { user, notes } = openNotes();
    await user.type(notes, "One");
    await user.tab();
    expect(screen.getByRole("status")).toHaveTextContent("Interview notes: Saving…");

    await user.click(notes);
    expect(notes).not.toHaveAttribute("readonly");
    await user.type(notes, " two");
    await user.tab();
    pause();
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);

    await act(async () => settle({ ok: true }));
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(2);
    expect(actions.updateInterviewAction).toHaveBeenLastCalledWith("oak", "i1", { notes: "One two" });
    expect(notes).toHaveValue("One two");
  });

  it("keeps what was written and shows why saving failed", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Interview notes are too long" });
    const { user, notes } = openNotes();
    await user.type(notes, "Kept");
    await user.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Interview notes are too long");
    expect(notes).toHaveValue("Kept");
  });

  it("counts characters only near the limit, and stops at it", async () => {
    const { user, notes } = openNotes();
    expect(notes).toHaveAttribute("maxlength", "20000");
    expect(document.body).not.toHaveTextContent("of 20,000 characters");
    await user.click(notes);
    await user.paste("x".repeat(18_000));
    expect(document.body).toHaveTextContent("18,000 of 20,000 characters");
  });
});
