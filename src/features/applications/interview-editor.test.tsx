import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { InterviewEditor } from "./interview-editor";
import { hasInterviewNotes, prepLookBack, takeawayShowsOn } from "@/lib/applications";
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
  // On success the action redirects, so it never comes back.
  vi.mocked(actions.deleteInterviewAndLeaveAction).mockReset().mockReturnValue(new Promise(() => {}));
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({ matches: query.includes("min-width"), addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
  );
});

const technical = interview("i1", { application_id: "birch", kind: "technical", how_it_went: "Asked about caching" });
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

const editNotes = () => screen.getByRole("button", { name: "Edit Interview notes" });
const notesField = () => screen.getByRole("textbox", { name: "How it went" });
const askedField = () => screen.getByRole("textbox", { name: "What they asked" });
const takeawayField = () => screen.getByRole("textbox", { name: "Takeaway for next time" });

describe("the Interview page", () => {
  it("reads the Interview notes as text, and no kind or date field (they're in the heading's Edit details)", () => {
    openPage();
    expect(screen.queryByLabelText("Kind")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Date and time" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Interview notes" })).toBeInTheDocument();
    expect(screen.getByText("Asked about caching")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("writes the Interview notes in a field opened by Edit, and saves them", async () => {
    const { user } = openPage();
    await user.click(editNotes());
    expect(notesField()).toHaveValue("Asked about caching");
    expect(askedField()).toHaveFocus();

    await user.type(notesField(), " and queues");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { how_it_went: "Asked about caching and queues" });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("works the same for an Interview of a Done Application", async () => {
    const done = { ...birch, status: "done" as const, outcome: "rejected" as const };
    const { user } = openPage(done);
    await user.click(editNotes());
    await user.type(notesField(), "!");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { how_it_went: "Asked about caching!" });
  });

  it("asks before deleting, warning about the Interview notes, then deletes and leaves", async () => {
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: /^More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Interview?" });
    expect(dialog).toHaveTextContent("will be deleted, with its Interview notes");
    expect(actions.deleteInterviewAndLeaveAction).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(actions.deleteInterviewAndLeaveAction).toHaveBeenCalledWith("birch", "i1");
  });

  it("keeps the Interview when the dialog is cancelled", async () => {
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: /^More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(actions.deleteInterviewAndLeaveAction).not.toHaveBeenCalled();
  });

  it("names the Interview and its notes in the delete warning, with Cancel focused", async () => {
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: /^More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Interview?" });
    expect(dialog).toHaveTextContent(/Technical on \d+ Nov will be deleted, with its Interview notes\. This can’t be undone\./);
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("leaves the notes out of the warning when there are none", async () => {
    const bare = interview("i1", { application_id: "birch", kind: "technical" });
    // Completed with no notes: the fields are open already.
    const { user } = openPage(application("birch", { company: "Birch", interviews: [bare] }), bare);
    await user.click(screen.getByRole("button", { name: /^More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/Technical on \d+ \w+ will be deleted\. This can’t be undone\./);
  });

  it("stays open and says why when deleting fails", async () => {
    vi.mocked(actions.deleteInterviewAndLeaveAction).mockResolvedValue({ ok: false, error: "Interview not found" });
    const { user } = openPage();
    await user.click(screen.getByRole("button", { name: /^More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Interview?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Interview not found");
  });

  it("asks before leaving with Interview notes still inside their typing pause", async () => {
    const { user } = openPage();
    // Typing and then leaving at once: the link click blurs the notes, whose save hangs.
    vi.mocked(actions.updateInterviewAction).mockReturnValue(new Promise(() => {}));
    await user.click(editNotes());
    await user.type(notesField(), " and queues");
    await user.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You have unsaved changes.");
    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
  });
});

describe("Interview notes", () => {
  // Upcoming, so it starts with Add Interview notes rather than open fields.
  const blank = interview("i1", { application_id: "oak", kind: "recruiter_screen", completed: false });
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

  /** The page with its notes open for writing: Add Interview notes when empty, Edit otherwise. */
  async function openNotes(current = blank) {
    const { user } = openPage({ ...oak, interviews: [current] }, current);
    await user.click(screen.getByRole("button", { name: hasInterviewNotes(current) ? "Edit Interview notes" : "Add Interview notes" }));
    return { user, notes: notesField() };
  }

  it("has Done, no Save button, and no \"Saves as you type\" text", async () => {
    await openNotes();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Save/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Saves as you type/)).not.toBeInTheDocument();
  });

  it("saves on leaving the field, trimmed, keeping line breaks", async () => {
    const { user, notes } = await openNotes();
    await user.type(notes, " Friendly.{Enter}{Enter}Ask about the team. ");
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledExactlyOnceWith("oak", "i1", {
      how_it_went: "Friendly.\n\nAsk about the team.",
    });
  });

  it("saves after a pause in typing, and the pause starts over with each key", async () => {
    const { user, notes } = await openNotes();
    await user.type(notes, "Fri");
    pause(NOTES_PAUSE_MS / 2);
    await user.type(notes, " end");
    pause(NOTES_PAUSE_MS / 2);
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();

    pause(NOTES_PAUSE_MS / 2);
    expect(actions.updateInterviewAction).toHaveBeenCalledExactlyOnceWith("oak", "i1", { how_it_went: "Fri end" });

    // Leaving the field with nothing new to save sends nothing more.
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);
  });

  it("clears notes when they are emptied, and has nothing to save when only spaces are typed", async () => {
    const { user, notes } = await openNotes(technical);
    await user.clear(notes);
    await user.type(notes, "  ");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i1", { how_it_went: null });
  });

  it("sends nothing when only spaces are typed into empty notes", async () => {
    const { user, notes } = await openNotes();
    await user.type(notes, "   ");
    await user.tab();
    pause();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  });

  it("keeps typing possible while a save is in flight, and never sends two saves at once", async () => {
    let settle!: (result: actions.ActionResult) => void;
    vi.mocked(actions.updateInterviewAction).mockReturnValueOnce(new Promise((resolve) => (settle = resolve)));
    const { user, notes } = await openNotes();
    await user.type(notes, "One");
    await user.tab();
    expect(screen.getAllByRole("status").map((status) => status.textContent)).toContain("How it went: Saving…");

    await user.click(notes);
    expect(notes).not.toHaveAttribute("readonly");
    await user.type(notes, " two");
    await user.tab();
    pause();
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(1);

    await act(async () => settle({ ok: true }));
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(2);
    expect(actions.updateInterviewAction).toHaveBeenLastCalledWith("oak", "i1", { how_it_went: "One two" });
    expect(notes).toHaveValue("One two");
  });

  it("keeps what was written and shows why saving failed", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Interview notes are too long" });
    const { user, notes } = await openNotes();
    await user.type(notes, "Kept");
    await user.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Interview notes are too long");
    expect(notes).toHaveValue("Kept");
  });

  it("counts characters only near the limit, and stops at it", async () => {
    const { user, notes } = await openNotes();
    expect(notes).toHaveAttribute("maxlength", "20000");
    expect(document.body).not.toHaveTextContent("of 20,000 characters");
    await user.click(notes);
    await user.paste("x".repeat(18_000));
    expect(document.body).toHaveTextContent("18,000 of 20,000 characters");
  });

  it("says there are none, with Add Interview notes, which opens the field", async () => {
    const { user } = openPage({ ...oak, interviews: [blank] }, blank);
    expect(screen.getByText("Nothing yet, that’s expected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Interview notes" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Interview notes" }));
    expect(askedField()).toHaveFocus();
  });

  it("shows lines starting with a dash as a list", () => {
    const listed = interview("i1", { application_id: "oak", how_it_went: "Went well.\n\n- Send a thank-you\n- Ask about on-call" });
    openPage({ ...oak, interviews: [listed] }, listed);
    const items = within(screen.getByRole("region", { name: "Interview notes" })).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Send a thank-you", "Ask about on-call"]);
    expect(screen.getByText("Went well.")).toBeInTheDocument();
  });

  it("goes back to the text on Done, saving what was typed, and gives focus back to Edit", async () => {
    const { user, notes } = await openNotes(technical);
    await user.type(notes, " More.");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(actions.updateInterviewAction).toHaveBeenCalledExactlyOnceWith("oak", "i1", { how_it_went: "Asked about caching More." });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Asked about caching More.")).toBeInTheDocument();
    await waitFor(() => expect(editNotes()).toHaveFocus());
  });

  it("stays in the field on Done while a save has failed", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server." });
    const { user, notes } = await openNotes();
    await user.type(notes, "Kept");
    await user.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t reach Bigfoot’s server.");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(notesField()).toHaveFocus();
    expect(notesField()).toHaveValue("Kept");
  });

  it("saves each field by itself, with its own save status", async () => {
    const { user } = await openNotes();
    await user.type(askedField(), "Why us?{Enter}Why now?");
    await user.type(takeawayField(), "Slow down");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenNthCalledWith(1, "oak", "i1", { what_they_asked: "Why us?\nWhy now?" });
    expect(actions.updateInterviewAction).toHaveBeenNthCalledWith(2, "oak", "i1", { takeaway: "Slow down" });
    await waitFor(() =>
      expect(screen.getAllByRole("status").map((status) => status.textContent)).toEqual(
        expect.arrayContaining(["What they asked: Saved", "Takeaway for next time: Saved"]),
      ),
    );
  });

  it("keeps the takeaway to one short line", async () => {
    await openNotes();
    expect(takeawayField()).toHaveAttribute("maxlength", "500");
    expect(takeawayField().tagName).toBe("INPUT");
  });

  it("reads the takeaway in its own card above the notes, and What they asked as a list under They asked", () => {
    const full = interview("i1", {
      application_id: "oak",
      what_they_asked: "Why us?\n\n Why now? ",
      how_it_went: "Went well.",
      takeaway: "Lead with the decision.",
    });
    openPage({ ...oak, interviews: [full] }, full);
    expect(screen.getByRole("region", { name: "Takeaway for next time" })).toHaveTextContent("Lead with the decision.");
    const asked = screen.getByRole("list", { name: "They asked" });
    expect(within(asked).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Why us?", "Why now?"]);
    expect(screen.getByText("Went well.")).toBeInTheDocument();
  });

  it("opens a completed Interview with no notes straight into the three empty fields, under How did it go?", () => {
    const fresh = interview("i1", { application_id: "oak" });
    openPage({ ...oak, interviews: [fresh] }, fresh);
    expect(screen.getByRole("heading", { level: 2, name: "How did it go?" })).toBeInTheDocument();
    expect(screen.getByText("Just finished · write it down while it’s fresh")).toBeInTheDocument();
    expect(askedField()).toHaveValue("");
    expect(notesField()).toHaveValue("");
    expect(takeawayField()).toHaveValue("");
    // Arriving at the page doesn't move focus into a field.
    expect(askedField()).not.toHaveFocus();
    expect(screen.queryByRole("button", { name: "Add Interview notes" })).not.toBeInTheDocument();
  });

  it("asks before leaving with an unsaved takeaway, and Keep editing goes back to it", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server." });
    const { user } = await openNotes();
    await user.type(takeawayField(), "Kept");
    await user.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(await screen.findByText(/You have unsaved changes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(takeawayField()).toHaveFocus());
  });
});

describe("Prep notes", () => {
  const DAY = 86_400_000;
  const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();
  const weekdayOf = (iso: string) => new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(iso));
  const dateOf = (iso: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso));

  function page(overrides: Parameters<typeof interview>[1]) {
    const current = interview("i1", { application_id: "elm", kind: "technical", ...overrides });
    return openPage(application("elm", { company: "Elm", interviews: [current] }), current);
  }

  const prepField = () => screen.getByRole("textbox", { name: "Prep notes" });

  describe("before the Interview", () => {
    it("shows the Before card first, then the After card waiting for how it went", () => {
      page({ completed: false, at: inDays(2), prep_notes: "Review caching" });
      const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(headings).toEqual(["Prep notes", "Interview notes"]);
      expect(screen.getByText("Review caching")).toBeInTheDocument();
      expect(screen.getByText("Nothing yet, that’s expected")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add Interview notes" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Show Prep notes/ })).not.toBeInTheDocument();
    });

    it("says \"Get ready for\" the weekday within the next 7 days, and the date after that", async () => {
      const soon = inDays(2);
      page({ completed: false, at: soon });
      expect(await screen.findByText(`Get ready for ${weekdayOf(soon)}`)).toBeInTheDocument();
    });

    it("says \"Get ready for\" the date when it is a week or more away", async () => {
      const later = inDays(20);
      page({ completed: false, at: later });
      expect(await screen.findByText(`Get ready for ${dateOf(later)}`)).toBeInTheDocument();
    });

    it("offers Add Prep notes while there are none, which opens the field", async () => {
      const { user } = page({ completed: false, at: inDays(2) });
      await user.click(screen.getByRole("button", { name: "Add Prep notes" }));
      expect(prepField()).toHaveFocus();
    });

    it("saves Prep notes by themselves, on their own field, leaving Interview notes alone", async () => {
      const { user } = page({ completed: false, at: inDays(2) });
      await user.click(screen.getByRole("button", { name: "Add Prep notes" }));
      await user.type(prepField(), "  Review caching ");
      await user.tab();
      expect(actions.updateInterviewAction).toHaveBeenCalledExactlyOnceWith("elm", "i1", { prep_notes: "Review caching" });
      expect(await screen.findByText("Saved")).toBeInTheDocument();
    });

    it("edits with Edit and Done, gives focus back to Edit, and shows what was typed", async () => {
      const { user } = page({ completed: false, at: inDays(2), prep_notes: "Review caching" });
      await user.click(screen.getByRole("button", { name: "Edit Prep notes" }));
      await user.type(prepField(), " and queues");
      await user.click(screen.getByRole("button", { name: "Done" }));
      expect(actions.updateInterviewAction).toHaveBeenCalledWith("elm", "i1", { prep_notes: "Review caching and queues" });
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole("button", { name: "Edit Prep notes" })).toHaveFocus());
    });

    it("asks before leaving with Prep notes not yet saved", async () => {
      const { user } = page({ completed: false, at: inDays(2) });
      vi.mocked(actions.updateInterviewAction).mockReturnValue(new Promise(() => {}));
      await user.click(screen.getByRole("button", { name: "Add Prep notes" }));
      await user.type(prepField(), "Review caching");
      await user.click(screen.getByRole("link", { name: "Dashboard" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("You have unsaved changes.");
    });

    it("shows Interview notes normally once written, in the After card", () => {
      page({ completed: false, at: inDays(2), how_it_went: "Moved up." });
      expect(screen.getByText("Moved up.")).toBeInTheDocument();
      expect(screen.queryByText("Nothing yet, that’s expected")).not.toBeInTheDocument();
    });
  });

  describe("after the Interview", () => {
    it("shows Interview notes first, then Prep notes folded to their first lines", async () => {
      const { user } = page({ how_it_went: "Went well.", prep_notes: "One\nTwo\nThree\nFour" });
      const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(headings).toEqual(["Interview notes", "Prep notes"]);
      const prep = screen.getByRole("region", { name: "Prep notes" });
      expect(prep).toHaveTextContent("One");
      expect(prep).toHaveTextContent("Two");
      expect(prep).not.toHaveTextContent("Three");
      expect(within(prep).queryByRole("button", { name: "Edit Prep notes" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Show Prep notes" }));
      expect(prep).toHaveTextContent("Four");
      expect(screen.getByRole("button", { name: "Hide Prep notes" })).toHaveAttribute("aria-expanded", "true");
      expect(within(prep).getByRole("button", { name: "Edit Prep notes" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Hide Prep notes" }));
      expect(prep).not.toHaveTextContent("Four");
    });

    it("leaves the Prep notes card out when there are none", () => {
      page({ how_it_went: "Went well." });
      expect(screen.queryByRole("region", { name: "Prep notes" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Prep notes/ })).not.toBeInTheDocument();
    });

    it("edits folded Prep notes once opened", async () => {
      const { user } = page({ prep_notes: "Review caching" });
      await user.click(screen.getByRole("button", { name: "Show Prep notes" }));
      await user.click(screen.getByRole("button", { name: "Edit Prep notes" }));
      await user.type(prepField(), "!");
      await user.tab();
      expect(actions.updateInterviewAction).toHaveBeenCalledExactlyOnceWith("elm", "i1", { prep_notes: "Review caching!" });
    });
  });

  it("is named in the delete warning, with the Interview notes when both are there", async () => {
    const { user } = page({ how_it_went: "Went well.", prep_notes: "Review caching" });
    await user.click(screen.getByRole("button", { name: /^More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("will be deleted, with its Interview notes and Prep notes. This can’t be undone.");
  });

  it("is named alone in the delete warning when it is all there is", async () => {
    const { user } = page({ prep_notes: "Review caching" });
    await user.click(screen.getByRole("button", { name: /^More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Interview" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("will be deleted, with its Prep notes. This can’t be undone.");
  });
});

describe("takeaways that apply (BIG-181)", () => {
  const DAY = 86_400_000;
  const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();
  const manager = interview("manager", {
    application_id: "lumen",
    kind: "hiring_manager",
    at: daysFromNow(-10),
    what_they_asked: "Why us?\nWhy now?",
    takeaway: "Lead with the decision.",
  });
  const deepDive = interview("deep-dive", { application_id: "lumen", kind: "technical_deep_dive", at: daysFromNow(2), completed: false });
  const lumen = application("lumen", { company: "Lumen Bio", interviews: [manager, deepDive] });
  const tilthManager = interview("tilth-manager", { application_id: "tilth", kind: "hiring_manager", at: daysFromNow(1), completed: false });
  const tilth = application("tilth", { company: "Tilth Agritech", interviews: [tilthManager] });
  const apps = [lumen, tilth];

  function openWith(props: Parameters<typeof InterviewEditor>[0]) {
    render(
      <UnsavedChanges>
        <InterviewEditor {...props} />
      </UnsavedChanges>,
    );
  }

  it("shows an upcoming Interview's takeaways and They asked last time in its Prep notes card", () => {
    openWith({ app: lumen, interview: deepDive, lookBack: prepLookBack(apps, lumen, deepDive) });
    const prep = screen.getByRole("region", { name: "Prep notes" });
    const [takeaway] = within(within(prep).getByRole("list", { name: "Takeaways for this Interview" })).getAllByRole("listitem");
    expect(takeaway).toHaveTextContent(/^Takeaway from Hiring Manager · .+Lead with the decision\.$/);
    expect(within(within(prep).getByRole("list", { name: "They asked last time" })).getAllByRole("listitem")).toHaveLength(2);
  });

  it("says where a completed Interview's takeaway shows, linking there", () => {
    openWith({ app: lumen, interview: manager, showsOn: takeawayShowsOn(apps, lumen, manager) });
    const card = screen.getByRole("region", { name: "Takeaway for next time" });
    const links = within(card).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Shows on the prep for Technical Deep-Dive · in 2 days",
      "Shows on the prep for your next Hiring Manager · Tilth Agritech, tomorrow",
    ]);
    expect(links[0]).toHaveAttribute("href", "/applications/lumen/interviews/deep-dive");
    expect(links[1]).toHaveAttribute("href", "/applications/tilth/interviews/tilth-manager");
  });

  it("says nothing about where it shows when nothing is ahead", () => {
    const alone = { ...lumen, interviews: [manager] };
    openWith({ app: alone, interview: manager, showsOn: takeawayShowsOn([alone], alone, manager) });
    expect(within(screen.getByRole("region", { name: "Takeaway for next time" })).queryByRole("link")).not.toBeInTheDocument();
  });
});
