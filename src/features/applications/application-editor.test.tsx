import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import type { Application } from "@/lib/applications";
import { DATE_NEEDED } from "@/lib/validation";
import { application, interview } from "@/test/applications";
import { ApplicationEditor } from "./application-editor";
import { NOTES_PAUSE_MS } from "./interview-notes-form";

// Server Actions are mocked at their module: what the page sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({
  createApplicationAction: vi.fn(),
  updateApplicationAction: vi.fn(),
  deleteApplicationAction: vi.fn(),
  createInterviewAction: vi.fn(),
  updateInterviewAction: vi.fn(),
  deleteInterviewAction: vi.fn(),
}));

beforeEach(() => {
  for (const action of Object.values(actions)) {
    if (typeof action === "function") vi.mocked(action).mockReset().mockResolvedValue({ ok: true });
  }
});

/** What the Application page puts around the editor: a named region, so tests can look inside it. */
function Editor({ app }: { app: Application }) {
  return (
    <section aria-label={app.company}>
      <ApplicationEditor app={app} />
    </section>
  );
}

function openEditor(app: Application) {
  const user = userEvent.setup();
  const utils = render(<Editor app={app} />);
  return { user, ...utils };
}

const technical = interview("i1", { application_id: "birch", kind: "technical", completed: true });
const birch = application("birch", { company: "Birch", location: "Remote", salary: "$150k", interviews: [technical] });
// Saved before an Interview's date was required (docs/adr/0005).
const undated = { ...birch, interviews: [{ ...technical, at: null }] };

function openBirch(app = birch) {
  const opened = openEditor(app);
  return { ...opened, dialog: screen.getByRole("region", { name: "Birch" }) };
}

describe("the salary", () => {
  it("is hidden until Reveal is pressed", async () => {
    const { user, dialog } = openBirch();
    expect(within(dialog).getByRole("group", { name: "Salary" })).toHaveTextContent("Hidden");
    expect(dialog).not.toHaveTextContent("$150k");
    expect(within(dialog).queryByDisplayValue("$150k")).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Reveal" }));
    expect(within(dialog).getByLabelText("Salary")).toHaveValue("$150k");
  });

  it("is hidden again each time the page opens", async () => {
    const { user, unmount } = openBirch();
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    unmount();
    openBirch();
    expect(screen.getByRole("button", { name: "Reveal" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("$150k")).not.toBeInTheDocument();
  });

  it("stays revealed after the details are saved", async () => {
    const { user, rerender } = openBirch();
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    // What a saved change does: the page re-renders with the Application as saved.
    rerender(<Editor app={{ ...birch, salary: "$160k" }} />);
    expect(screen.getByLabelText("Salary")).toHaveValue("$160k");
  });

  it("has nothing to hide on an Application without one", () => {
    openEditor(application("maple", { company: "Maple" }));
    expect(screen.getByLabelText("Salary")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Reveal" })).not.toBeInTheDocument();
  });
});

describe("editing an Application", () => {
  it("saves an Interview's kind as soon as it changes", async () => {
    const { user, dialog } = await openBirch();
    await user.selectOptions(within(dialog).getByLabelText(/^Kind/), "behavioural");
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { kind: "behavioural" });
  });

  it("saves an Interview's date and time once both are given, with no time assumed", async () => {
    const { user, dialog } = await openBirch(undated);
    const time = within(dialog).getByLabelText(/^Time/);
    expect(time).toBeDisabled();

    await user.click(within(dialog).getByRole("button", { name: /^Date/ }));
    await user.click(within(screen.getByRole("grid")).getByText("15"));
    expect(time).toHaveValue("");
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();

    await user.type(time, "09:45");
    await user.tab();
    const now = new Date();
    expect(actions.updateInterviewAction).toHaveBeenLastCalledWith("birch", "i1", {
      at: new Date(now.getFullYear(), now.getMonth(), 15, 9, 45).toISOString(),
    });
  });

  it("refuses clearing an Interview's date, and says so beside it", async () => {
    const { user, dialog } = await openBirch();
    await user.click(within(dialog).getByRole("button", { name: /^Date/ }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(within(dialog).getByText("Enter the date and time.")).toBeInTheDocument();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  });

  it("shows Date needed beside the date of an Interview with no date (ADR 0005)", async () => {
    const { dialog } = await openBirch(undated);
    expect(within(dialog).getByText(DATE_NEEDED)).toBeInTheDocument();
  });

  it("saves no other change to an Interview with no date until it has one", async () => {
    const { user, dialog } = await openBirch(undated);
    await user.selectOptions(within(dialog).getByLabelText(/^Kind/), "behavioural");
    await user.type(within(dialog).getByLabelText(/^Interview notes/), "Went well.");
    await user.tab();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    expect(within(dialog).getByText(DATE_NEEDED)).toBeInTheDocument();
  });

  it("shows the API's error about the date beside the date", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({
      ok: false,
      error: "Interview date is needed",
      fieldErrors: { at: "Interview date is needed" },
    });
    const { user, dialog } = await openBirch();
    await user.selectOptions(within(dialog).getByLabelText(/^Kind/), "behavioural");
    await within(dialog).findByRole("alert");
    expect(within(dialog).getByRole("button", { name: /^Date/ })).toHaveAccessibleDescription(
      "Interview date is needed",
    );
  });

  it("saves each detail when it's left, trimmed, with a cleared optional field as empty", async () => {
    const { user, dialog } = await openBirch();
    await user.clear(within(dialog).getByLabelText("Company"));
    await user.type(within(dialog).getByLabelText("Company"), "  Birch Trees ");
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
    await user.tab();
    expect(actions.updateApplicationAction).toHaveBeenCalledTimes(1);
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", { company: "Birch Trees" });

    await user.clear(within(dialog).getByLabelText("Location"));
    await user.tab();
    expect(actions.updateApplicationAction).toHaveBeenCalledTimes(2);
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", { location: null });
  });

  it("sends nothing for a detail that was left unchanged", async () => {
    const { user, dialog } = await openBirch();
    await user.click(within(dialog).getByLabelText("Title"));
    await user.tab();
    await user.type(within(dialog).getByLabelText("Location"), "x{Backspace}");
    await user.tab();
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  });

  it("saves the applied date when it's picked", async () => {
    const { user, dialog } = await openBirch();
    await user.click(within(dialog).getByRole("button", { name: /^Applied/ }));
    await user.click(within(screen.getByRole("grid")).getByText("15"));
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", { applied_on: day });
  });

  it("refuses an empty Company beside it, keeps what was typed, and sends nothing", async () => {
    const { user, dialog } = await openBirch();
    await user.clear(within(dialog).getByLabelText("Company"));
    await user.tab();
    expect(within(dialog).getByLabelText("Company")).toHaveValue("");
    expect(within(dialog).getByLabelText("Company")).toBeInvalid();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/company/i);
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  });

  it("keeps a detail being typed in when another one's save lands", async () => {
    const { user, dialog, rerender } = await openBirch();
    await user.type(within(dialog).getByLabelText("Title"), " II");
    rerender(<Editor app={{ ...birch, location: "Toronto" }} />);
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Engineer II");
    expect(within(dialog).getByLabelText("Location")).toHaveValue("Toronto");
  });

  it("has no Save details button", async () => {
    const { dialog } = await openBirch();
    expect(within(dialog).queryByRole("button", { name: /^Save (details|notes)/ })).not.toBeInTheDocument();
  });

  it("asks for an Outcome before saving Done", async () => {
    const { user, dialog } = await openBirch();
    expect(within(dialog).queryByLabelText("Outcome")).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText("Status"), "done");
    expect(within(dialog).getByLabelText("Outcome")).toBeRequired();

    await user.selectOptions(within(dialog).getByLabelText("Outcome"), "withdrawn");
    await user.click(within(dialog).getByRole("button", { name: "Save status" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", { status: "done", outcome: "withdrawn" });
  });

  it("shows why a save failed", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Interview kind is invalid" });
    const { user, dialog } = await openBirch();
    await user.selectOptions(within(dialog).getByLabelText(/^Kind/), "behavioural");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Interview kind is invalid");
  });
});

describe("deleting an Application", () => {
  async function askToDelete() {
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Delete application" }));
    return { user, confirm: screen.getByRole("dialog", { name: "Delete application?" }) };
  }

  it("asks for confirmation first, and Cancel keeps the Application", async () => {
    const { user, confirm } = await askToDelete();
    expect(confirm).toHaveTextContent("Birch, Engineer will be deleted");

    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(actions.deleteApplicationAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes once confirmed (the action then takes the job seeker to the dashboard)", async () => {
    const { user, confirm } = await askToDelete();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(actions.deleteApplicationAction).toHaveBeenCalledWith("birch");
  });

  it("stays on the Application and says why when deleting fails", async () => {
    vi.mocked(actions.deleteApplicationAction).mockResolvedValue({ ok: false, error: "Application not found" });
    const { user, confirm } = await askToDelete();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(await within(confirm).findByRole("alert")).toHaveTextContent("Application not found");
    expect(within(confirm).getByRole("button", { name: "Delete" })).toBeEnabled();
  });
});

describe("Interview notes", () => {
  const screenCall = interview("i1", { application_id: "oak", kind: "recruiter_screen" });
  const technical = interview("i2", { application_id: "oak", kind: "technical", notes: "Asked about caching." });
  const oak = application("oak", { company: "Oak", interviews: [screenCall, technical] });

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

  async function openOak() {
    const opened = await openEditor(oak);
    const page = screen.getByRole("region", { name: "Oak" });
    return {
      ...opened,
      page,
      notes: (n: number) => within(page).getByLabelText(`Interview notes, Interview ${n}`),
    };
  }

  it("shows each Interview's notes under it, empty when there are none, with no Save button", async () => {
    const { page, notes } = await openOak();
    expect(notes(1)).toHaveValue("");
    expect(notes(2)).toHaveValue("Asked about caching.");
    expect(within(page).queryByRole("button", { name: /^Save notes/ })).not.toBeInTheDocument();
  });

  it("saves notes on leaving the field, trimmed, keeping line breaks", async () => {
    const { user, notes } = await openOak();
    await user.type(notes(1), " Friendly.{Enter}{Enter}Ask about the team. ");
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i1", {
      notes: "Friendly.\n\nAsk about the team.",
    });
  });

  it("saves notes after a pause in typing, and the pause starts over with each key", async () => {
    const { user, notes } = await openOak();
    await user.type(notes(1), "Fri");
    pause(NOTES_PAUSE_MS / 2);
    await user.type(notes(1), " end");
    pause(NOTES_PAUSE_MS / 2);
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();

    pause(NOTES_PAUSE_MS / 2);
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i1", { notes: "Fri end" });

    // Leaving the field with nothing new to save sends nothing more.
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);
  });

  it("changes notes, and shows them as saved", async () => {
    const { user, notes, rerender } = await openOak();
    await user.type(notes(2), " Draw the diagram first.");
    await user.tab();
    const saved = "Asked about caching. Draw the diagram first.";
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i2", { notes: saved });

    rerender(<Editor app={{ ...oak, interviews: [screenCall, { ...technical, notes: saved }] }} />);
    expect(notes(2)).toHaveValue(saved);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("clears notes when they are emptied, and has nothing to save when only spaces are typed", async () => {
    const { user, notes } = await openOak();
    await user.clear(notes(2));
    await user.type(notes(2), "  ");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i2", { notes: null });

    vi.mocked(actions.updateInterviewAction).mockClear();
    await user.type(notes(1), "   ");
    await user.tab();
    pause();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  });

  it("keeps typing possible while a save is in flight, and never sends two saves at once", async () => {
    let settle!: (result: actions.ActionResult) => void;
    vi.mocked(actions.updateInterviewAction).mockReturnValueOnce(new Promise((resolve) => (settle = resolve)));
    const { user, notes } = await openOak();
    await user.type(notes(1), "One");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);

    await user.click(notes(1));
    expect(notes(1)).not.toHaveAttribute("readonly");
    await user.type(notes(1), " two");
    await user.tab();
    pause();
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);

    await act(async () => settle({ ok: true }));
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(2);
    expect(actions.updateInterviewAction).toHaveBeenLastCalledWith("oak", "i1", { notes: "One two" });
    expect(notes(1)).toHaveValue("One two");
  });

  it("keeps notes being written when the Interview's kind is saved", async () => {
    const { user, page, notes, rerender } = await openOak();
    await user.type(notes(1), "Half-written");
    await user.selectOptions(within(page).getAllByLabelText(/^Kind/)[0], "leadership");
    rerender(
      <Editor app={{ ...oak, interviews: [{ ...screenCall, kind: "leadership", updated_at: "later" }, technical] }} />,
    );
    expect(notes(1)).toHaveValue("Half-written");
    expect(within(page).getAllByLabelText(/^Kind/)[0]).toHaveValue("leadership");
  });

  it("keeps what was written and shows why saving failed", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Interview notes are too long" });
    const { user, page, notes } = await openOak();
    await user.type(notes(1), "Kept");
    await user.tab();
    expect(await within(page).findByRole("alert")).toHaveTextContent("Interview notes are too long");
    expect(notes(1)).toHaveValue("Kept");
  });

  it("counts characters only near the limit, and stops at it", async () => {
    const { user, page, notes } = await openOak();
    expect(notes(1)).toHaveAttribute("maxlength", "20000");
    expect(page).not.toHaveTextContent("of 20,000 characters");
    await user.click(notes(1));
    await user.paste("x".repeat(18_000));
    expect(page).toHaveTextContent("18,000 of 20,000 characters");
  });
});

describe("save status beside each field (BIG-118)", () => {
  const first = interview("i1", { application_id: "oak", kind: "recruiter_screen" });
  const second = interview("i2", { application_id: "oak", kind: "technical" });
  const oak = application("oak", { company: "Oak", interviews: [first, second] });

  async function openOak(apps = [oak]) {
    const opened = await openEditor(apps[0]);
    const page = screen.getByRole("region", { name: "Oak" });
    return {
      ...opened,
      page,
      kind: (n: number) => within(page).getByLabelText(`Kind, Interview ${n}`),
      at: (n: number) => within(page).getByRole("button", { name: new RegExp(`^Date, Interview ${n}`) }),
      /** Every status the page shows, as screen readers hear them. */
      statuses: () =>
        within(page)
          .getAllByRole("status")
          .map((s) => s.textContent)
          .filter(Boolean),
    };
  }

  /** An action that stays in flight until the test settles it. */
  function inFlight() {
    let settle!: (result: actions.ActionResult) => void;
    const promise = new Promise<actions.ActionResult>((resolve) => (settle = resolve));
    return { promise, settle };
  }

  it("shows Saving… then Saved beside the kind that changed, and nowhere else", async () => {
    const save = inFlight();
    vi.mocked(actions.updateInterviewAction).mockReturnValue(save.promise);
    const { user, kind, statuses } = await openOak();
    await user.selectOptions(kind(2), "leadership");
    expect(statuses()).toEqual(["Interview 2 kind: Saving…"]);

    save.settle({ ok: true });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(statuses()).toEqual(["Interview 2 kind: Saved"]);
  });

  it("disables only the field that is saving", async () => {
    vi.mocked(actions.updateInterviewAction).mockReturnValue(inFlight().promise);
    const { user, page, kind, at } = await openOak();
    await user.selectOptions(kind(1), "leadership");

    expect(kind(1)).toBeDisabled();
    expect(kind(2)).toBeEnabled();
    expect(at(1)).toBeEnabled();
    expect(within(page).getByLabelText("Interview notes, Interview 1")).not.toHaveAttribute("readonly");
    expect(within(page).getByRole("button", { name: /^Delete .* Interview, Interview 1$/ })).toBeEnabled();
  });

  it("saves the date and time once both are given, assuming no time, and nothing when the time didn't change", async () => {
    // Saved before dates were required, so it has no time to keep (docs/adr/0005).
    const { user, page, at, statuses } = await openOak([{ ...oak, interviews: [{ ...first, at: null }, second] }]);
    const time = within(page).getByLabelText("Time, Interview 1");
    await user.click(at(1));
    await user.click(within(screen.getByRole("grid")).getByText("15"));
    expect(time).toHaveValue("");
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();

    await user.type(time, "10:30");
    await user.tab();
    const now = new Date();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i1", {
      at: new Date(now.getFullYear(), now.getMonth(), 15, 10, 30).toISOString(),
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(statuses()).toEqual(["Interview 1 date and time: Saved"]);

    vi.mocked(actions.updateInterviewAction).mockClear();
    await user.click(within(page).getByLabelText("Time, Interview 1"));
    await user.tab();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  });

  it("shows a failed save beside its field, keeps the pick, and Retry sends it again", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValueOnce({ ok: false, error: "Interview kind is invalid" });
    const { user, page, kind } = await openOak();
    await user.selectOptions(kind(1), "leadership");

    expect(await within(page).findByRole("alert")).toHaveTextContent("Interview 1 kind: Interview kind is invalid");
    expect(kind(1)).toHaveValue("leadership");

    await user.click(within(page).getByRole("button", { name: "Retry, Interview 1 kind" }));
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(2);
    expect(actions.updateInterviewAction).toHaveBeenLastCalledWith("oak", "i1", { kind: "leadership" });
    expect(within(page).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows Interview notes saving by themselves, and stays writable while they do", async () => {
    const save = inFlight();
    vi.mocked(actions.updateInterviewAction).mockReturnValue(save.promise);
    const { user, page, statuses } = await openOak();
    const notes = within(page).getByLabelText("Interview notes, Interview 2");
    await user.type(notes, "Went well");
    await user.tab();

    expect(notes).not.toHaveAttribute("readonly");
    expect(statuses()).toEqual(["Interview 2 notes: Saving…"]);
    await act(async () => save.settle({ ok: true }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(statuses()).toEqual(["Interview 2 notes: Saved"]);
  });

  it("shows Status saving by its button, and each detail saving beside itself", async () => {
    const { user, page, statuses } = await openOak();
    await user.selectOptions(within(page).getByLabelText("Status"), "done");
    await user.selectOptions(within(page).getByLabelText("Outcome"), "rejected");
    await user.click(within(page).getByRole("button", { name: "Save status" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(statuses()).toEqual(["Status: Saved"]);

    await user.type(within(page).getByLabelText("Location"), "Remote");
    await user.tab();
    expect(statuses()).toContain("Location: Saved");
  });

  it("opens the Add Interview page with this Application chosen, and creates nothing itself", async () => {
    const { page } = await openOak();
    expect(within(page).getByRole("link", { name: "Add Interview" })).toHaveAttribute(
      "href",
      "/interviews/new?application=oak",
    );
    expect(within(page).queryByRole("button", { name: "Add Interview" })).not.toBeInTheDocument();
    expect(actions.createInterviewAction).not.toHaveBeenCalled();
  });

});

describe("deleting an Interview", () => {
  const first = interview("i1", { application_id: "oak", kind: "recruiter_screen", notes: "Friendly." });
  const second = interview("i2", { application_id: "oak", kind: "technical" });
  const oak = application("oak", { company: "Oak", interviews: [first, second] });

  async function askToDelete(app = oak, n = 1) {
    const user = userEvent.setup();
    const view = render(<Editor app={app} />);
    const page = screen.getByRole("region", { name: "Oak" });
    const trash = within(page).getAllByRole("button", { name: /^Delete .* Interview, Interview \d$/ })[n - 1];
    await user.click(trash);
    return { user, page, trash, view, confirm: screen.getByRole("dialog", { name: "Delete Interview?" }) };
  }

  it("asks first, naming the Interview and its notes, with Cancel focused, and deletes nothing yet", async () => {
    const { confirm } = await askToDelete();
    expect(confirm).toHaveTextContent(/Recruiter Screen on \d+ Nov will be deleted, with its Interview notes\. This can’t be undone\./);
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(actions.deleteInterviewAction).not.toHaveBeenCalled();
  });

  it("leaves the notes out of the warning when there are none, and the date when there is none", async () => {
    const bare = { ...second, notes: null, at: null };
    const { confirm } = await askToDelete({ ...oak, interviews: [bare] });
    expect(confirm).toHaveTextContent("Technical will be deleted. This can’t be undone.");
  });

  it("closes on Cancel or Escape, keeps the Interview, and returns focus to its delete button", async () => {
    const { user, confirm, trash } = await askToDelete();
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trash).toHaveFocus();

    await user.click(trash);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trash).toHaveFocus();
    expect(actions.deleteInterviewAction).not.toHaveBeenCalled();
  });

  it("deletes once confirmed, closes, announces it, and focuses the next Interview's delete button", async () => {
    const { user, confirm, view, page } = await askToDelete();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(actions.deleteInterviewAction).toHaveBeenCalledWith("oak", "i1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await within(page).findByText("Interview deleted")).toBeInTheDocument();
    expect(within(page).getByText("Interview deleted").tagName).toBe("OUTPUT");

    // The page refreshes with the Interview gone.
    view.rerender(<Editor app={{ ...oak, interviews: [second] }} />);
    const next = within(page).getByRole("button", { name: "Delete Technical Interview, Interview 1" });
    await vi.waitFor(() => expect(next).toHaveFocus());
  });

  it("focuses Add Interview when the last Interview is deleted", async () => {
    const { user, confirm, view, page } = await askToDelete({ ...oak, interviews: [second] });
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    view.rerender(<Editor app={{ ...oak, interviews: [] }} />);
    await vi.waitFor(() => expect(within(page).getByRole("link", { name: "Add Interview" })).toHaveFocus());
  });

  it("stays open and says why when deleting fails", async () => {
    vi.mocked(actions.deleteInterviewAction).mockResolvedValue({ ok: false, error: "Interview not found" });
    const { user, confirm } = await askToDelete();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(await within(confirm).findByRole("alert")).toHaveTextContent("Interview not found");
    expect(within(confirm).getByRole("button", { name: "Delete" })).toBeEnabled();
  });
});
