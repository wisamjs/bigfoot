import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/dashboard/actions";
import type { Application } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { AddApplicationButton, ApplicationPanel, type PanelView } from "./application-panel";

// Server Actions are mocked at their module: what the panel sends, not how it reaches the API.
// Editing Status, details and an Interview's kind and date is covered in dashboard-pipeline.test.tsx.
vi.mock("@/app/dashboard/actions", () => ({
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

const birch = application("birch", { company: "Birch", salary: "$150k" });
const cedar = application("cedar", { company: "Cedar", title: "Designer", status: "done", outcome: "rejected" });
const maple = application("maple", { company: "Maple" });
const ALL = [birch, cedar, maple];

/** A caller that opens the panel on `view`, as the Pipeline does for a card. */
function Caller({ view, applications = ALL }: { view: PanelView; applications?: Application[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open panel
      </button>
      <ApplicationPanel view={open ? view : null} applications={applications} onClose={() => setOpen(false)} />
    </>
  );
}

async function openPanel(view: PanelView, applications?: Application[]) {
  const user = userEvent.setup();
  const utils = render(<Caller view={view} applications={applications} />);
  await user.click(screen.getByRole("button", { name: "Open panel" }));
  return { user, ...utils };
}

describe("adding an Application", () => {
  async function openAdd() {
    const user = userEvent.setup();
    render(<AddApplicationButton />);
    await user.click(screen.getByRole("button", { name: "Add application" }));
    return { user, panel: screen.getByRole("dialog", { name: "Add application" }) };
  }

  it("opens the panel empty, with no Status, Interviews or Delete", async () => {
    const { panel } = await openAdd();
    expect(within(panel).getByLabelText("Company")).toHaveValue("");
    expect(within(panel).getByLabelText("Salary (optional)")).toHaveValue("");
    expect(within(panel).getByLabelText("Applied")).not.toHaveValue("");
    expect(within(panel).queryByLabelText("Status")).not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Add Interview" })).not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Delete application" })).not.toBeInTheDocument();
  });

  it("creates the Application from the details, trimmed, and closes", async () => {
    const { user, panel } = await openAdd();
    await user.type(within(panel).getByLabelText("Company"), " Birch ");
    await user.type(within(panel).getByLabelText("Title"), "Engineer");
    await user.type(within(panel).getByLabelText("Salary (optional)"), "$150k");
    await user.click(within(panel).getByRole("button", { name: "Add application" }));

    expect(actions.createApplicationAction).toHaveBeenCalledWith({
      company: "Birch",
      title: "Engineer",
      applied_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      location: null,
      salary: "$150k",
      posting_url: null,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open and shows why adding failed", async () => {
    vi.mocked(actions.createApplicationAction).mockResolvedValue({ ok: false, error: "Company is required" });
    const { user, panel } = await openAdd();
    await user.type(within(panel).getByLabelText("Company"), "Birch");
    await user.type(within(panel).getByLabelText("Title"), "Engineer");
    await user.click(within(panel).getByRole("button", { name: "Add application" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent("Company is required");
  });

  it("closes without adding on Cancel", async () => {
    const { user, panel } = await openAdd();
    await user.click(within(panel).getByRole("button", { name: "Cancel" }));
    expect(actions.createApplicationAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("the salary", () => {
  const view: PanelView = { kind: "application", id: "birch" };

  it("is hidden until Reveal is pressed", async () => {
    const { user } = await openPanel(view);
    const panel = screen.getByRole("dialog", { name: "Birch" });
    expect(within(panel).getByRole("group", { name: "Salary (optional)" })).toHaveTextContent("Hidden");
    expect(panel).not.toHaveTextContent("$150k");
    expect(within(panel).queryByDisplayValue("$150k")).not.toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Reveal" }));
    expect(within(panel).getByLabelText("Salary (optional)")).toHaveValue("$150k");
  });

  it("is hidden again the next time the panel opens", async () => {
    const { user } = await openPanel(view);
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    expect(screen.getByRole("button", { name: "Reveal" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("$150k")).not.toBeInTheDocument();
  });

  it("stays revealed after the details are saved", async () => {
    const { user, rerender } = await openPanel(view);
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    // What a saved change does: the dashboard re-renders with the Application as saved.
    rerender(<Caller view={view} applications={[{ ...birch, salary: "$160k" }]} />);
    expect(screen.getByLabelText("Salary (optional)")).toHaveValue("$160k");
  });

  it("has nothing to hide on an Application without one", async () => {
    await openPanel({ kind: "application", id: "maple" });
    expect(screen.getByLabelText("Salary (optional)")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Reveal" })).not.toBeInTheDocument();
  });
});

describe("a list of Applications", () => {
  const view: PanelView = { kind: "list", title: "No reply after two weeks", ids: ["cedar", "birch", "gone"] };

  it("lists the Applications that still exist, in the order given, with each one's Outcome or Status", async () => {
    await openPanel(view);
    const panel = screen.getByRole("dialog", { name: "No reply after two weeks" });
    const items = within(panel).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Open Cedar, DesignerDesignerRejected", "Open Birch, EngineerEngineerIn Progress"]);
  });

  it("opens an Application in the panel, and Back returns to the list", async () => {
    const { user } = await openPanel(view);
    await user.click(screen.getByRole("button", { name: /^Open Cedar\b/ }));
    const panel = screen.getByRole("dialog", { name: "Cedar" });
    expect(within(panel).getByLabelText("Company")).toHaveValue("Cedar");
    expect(within(panel).getByLabelText("Outcome")).toHaveValue("rejected");

    await user.click(within(panel).getByRole("button", { name: "Back to list" }));
    expect(screen.getByRole("dialog", { name: "No reply after two weeks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Open Cedar\b/ })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Back to list" })).not.toBeInTheDocument();
  });

  it("starts at the list again the next time the panel opens", async () => {
    const { user } = await openPanel(view);
    await user.click(screen.getByRole("button", { name: /^Open Birch\b/ }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    expect(screen.getByRole("dialog", { name: "No reply after two weeks" })).toBeInTheDocument();
  });

  it("hides each Application's salary, even after another one's was revealed", async () => {
    const withSalaries = [birch, { ...cedar, salary: "$90k" }];
    const { user } = await openPanel(view, withSalaries);
    await user.click(screen.getByRole("button", { name: /^Open Birch\b/ }));
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    await user.click(screen.getByRole("button", { name: "Back to list" }));
    await user.click(screen.getByRole("button", { name: /^Open Cedar\b/ }));
    expect(screen.queryByDisplayValue("$90k")).not.toBeInTheDocument();
  });

  it("says so when every Application in it has been deleted", async () => {
    await openPanel({ kind: "list", title: "Old", ids: ["gone"] });
    expect(screen.getByRole("dialog", { name: "Old" })).toHaveTextContent("These Applications have been deleted.");
  });
});

describe("an Application deleted while the panel shows it", () => {
  it("closes the panel", async () => {
    const view: PanelView = { kind: "application", id: "birch" };
    const { rerender } = await openPanel(view);
    rerender(<Caller view={view} applications={[cedar]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Interview notes", () => {
  const view: PanelView = { kind: "application", id: "oak" };
  const screenCall = interview("i1", { application_id: "oak", kind: "recruiter_screen" });
  const technical = interview("i2", { application_id: "oak", kind: "technical", notes: "Asked about caching." });
  const oak = application("oak", { company: "Oak", interviews: [screenCall, technical] });

  async function openOak() {
    const opened = await openPanel(view, [oak]);
    const panel = screen.getByRole("dialog", { name: "Oak" });
    return {
      ...opened,
      panel,
      notes: (n: number) => within(panel).getByLabelText(`Interview notes (optional), Interview ${n}`),
      saveButton: (n: number) => within(panel).getByRole("button", { name: `Save notes, Interview ${n}` }),
    };
  }

  it("shows each Interview's notes under it, empty when there are none", async () => {
    const { notes, saveButton } = await openOak();
    expect(notes(1)).toHaveValue("");
    expect(notes(2)).toHaveValue("Asked about caching.");
    expect(saveButton(1)).toBeDisabled();
    expect(saveButton(2)).toBeDisabled();
  });

  it("adds notes when Save notes is pressed, trimmed, keeping line breaks", async () => {
    const { user, notes, saveButton } = await openOak();
    await user.type(notes(1), " Friendly.{Enter}{Enter}Ask about the team. ");
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    await user.click(saveButton(1));
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i1", {
      notes: "Friendly.\n\nAsk about the team.",
    });
  });

  it("changes notes, and shows them as saved", async () => {
    const { user, notes, saveButton, rerender } = await openOak();
    await user.type(notes(2), " Draw the diagram first.");
    await user.click(saveButton(2));
    const saved = "Asked about caching. Draw the diagram first.";
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i2", { notes: saved });

    rerender(<Caller view={view} applications={[{ ...oak, interviews: [screenCall, { ...technical, notes: saved }] }]} />);
    expect(notes(2)).toHaveValue(saved);
    expect(saveButton(2)).toBeDisabled();
  });

  it("clears notes when they are emptied, and has nothing to save when only spaces are typed", async () => {
    const { user, notes, saveButton } = await openOak();
    await user.clear(notes(2));
    await user.type(notes(2), "  ");
    await user.click(saveButton(2));
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i2", { notes: null });

    await user.type(notes(1), "   ");
    expect(saveButton(1)).toBeDisabled();
  });

  it("keeps notes being written when the Interview's kind is saved", async () => {
    const { user, notes, rerender } = await openOak();
    await user.type(notes(1), "Half-written");
    await user.selectOptions(within(screen.getByRole("dialog")).getAllByLabelText(/^Kind/)[0], "leadership");
    rerender(
      <Caller
        view={view}
        applications={[{ ...oak, interviews: [{ ...screenCall, kind: "leadership", updated_at: "later" }, technical] }]}
      />,
    );
    expect(notes(1)).toHaveValue("Half-written");
    expect(within(screen.getByRole("dialog")).getAllByLabelText(/^Kind/)[0]).toHaveValue("leadership");
  });

  it("keeps what was written and shows why saving failed", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Interview notes are too long" });
    const { user, panel, notes, saveButton } = await openOak();
    await user.type(notes(1), "Kept");
    await user.click(saveButton(1));
    expect(await within(panel).findByRole("alert")).toHaveTextContent("Interview notes are too long");
    expect(notes(1)).toHaveValue("Kept");
  });

  it("counts characters only near the limit, and stops at it", async () => {
    const { user, panel, notes } = await openOak();
    expect(notes(1)).toHaveAttribute("maxlength", "20000");
    expect(panel).not.toHaveTextContent("of 20,000 characters");
    await user.click(notes(1));
    await user.paste("x".repeat(18_000));
    expect(panel).toHaveTextContent("18,000 of 20,000 characters");
  });
});

describe("save status beside each field (BIG-118)", () => {
  const view: PanelView = { kind: "application", id: "oak" };
  const first = interview("i1", { application_id: "oak", kind: "recruiter_screen" });
  const second = interview("i2", { application_id: "oak", kind: "technical" });
  const oak = application("oak", { company: "Oak", interviews: [first, second] });

  async function openOak() {
    const opened = await openPanel(view, [oak]);
    const panel = screen.getByRole("dialog", { name: "Oak" });
    return {
      ...opened,
      panel,
      kind: (n: number) => within(panel).getByLabelText(`Kind, Interview ${n}`),
      at: (n: number) => within(panel).getByLabelText(`Date and time (optional), Interview ${n}`),
      /** Every status the panel shows, as screen readers hear them. */
      statuses: () =>
        within(panel)
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
    const { user, panel, kind, at } = await openOak();
    await user.selectOptions(kind(1), "leadership");

    expect(kind(1)).toBeDisabled();
    expect(kind(2)).toBeEnabled();
    expect(at(1)).toBeEnabled();
    expect(within(panel).getByRole("button", { name: "Add Interview" })).toBeEnabled();
    expect(within(panel).getByLabelText("Interview notes (optional), Interview 1")).not.toHaveAttribute("readonly");
    expect(within(panel).getByRole("button", { name: /^Delete .* Interview, Interview 1$/ })).toBeEnabled();
  });

  it("saves the date and time on leaving the field, and shows nothing when it didn't change", async () => {
    const { user, at, statuses } = await openOak();
    await user.click(at(1));
    await user.tab();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    expect(statuses()).toEqual([]);

    await user.type(at(1), "2026-12-01T10:30");
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("oak", "i1", { at: expect.any(String) });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(statuses()).toEqual(["Interview 1 date and time: Saved"]);
  });

  it("shows a failed save beside its field, keeps the pick, and Retry sends it again", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValueOnce({ ok: false, error: "Interview kind is invalid" });
    const { user, panel, kind } = await openOak();
    await user.selectOptions(kind(1), "leadership");

    expect(await within(panel).findByRole("alert")).toHaveTextContent("Interview 1 kind: Interview kind is invalid");
    expect(kind(1)).toHaveValue("leadership");

    await user.click(within(panel).getByRole("button", { name: "Retry, Interview 1 kind" }));
    expect(actions.updateInterviewAction).toHaveBeenCalledTimes(2);
    expect(actions.updateInterviewAction).toHaveBeenLastCalledWith("oak", "i1", { kind: "leadership" });
    expect(within(panel).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows Interview notes saving by their own Save button, read-only until they land", async () => {
    const save = inFlight();
    vi.mocked(actions.updateInterviewAction).mockReturnValue(save.promise);
    const { user, panel, statuses } = await openOak();
    const notes = within(panel).getByLabelText("Interview notes (optional), Interview 2");
    await user.type(notes, "Went well");
    await user.click(within(panel).getByRole("button", { name: "Save notes, Interview 2" }));

    expect(notes).toHaveAttribute("readonly");
    expect(statuses()).toEqual(["Interview 2 notes: Saving…"]);
    save.settle({ ok: true });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(statuses()).toEqual(["Interview 2 notes: Saved"]);
  });

  it("shows Status and details saving by their own buttons", async () => {
    const { user, panel, statuses } = await openOak();
    await user.selectOptions(within(panel).getByLabelText("Status"), "done");
    await user.selectOptions(within(panel).getByLabelText("Outcome"), "rejected");
    await user.click(within(panel).getByRole("button", { name: "Save status" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(statuses()).toEqual(["Status: Saved"]);

    await user.type(within(panel).getByLabelText("Location (optional)"), "Remote");
    await user.click(within(panel).getByRole("button", { name: "Save details" }));
    expect(statuses()).toContain("Details: Saved");
  });

  it("shows adding an Interview by its button, and why it failed", async () => {
    vi.mocked(actions.createInterviewAction).mockResolvedValueOnce({ ok: false, error: "Too many Interviews" });
    const { user, panel, statuses } = await openOak();
    await user.click(within(panel).getByRole("button", { name: "Add Interview" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent("New Interview: Too many Interviews");

    await user.click(within(panel).getByRole("button", { name: "Retry, New Interview" }));
    expect(statuses()).toEqual(["New Interview: Added"]);
  });

  it("shows deleting an Interview by its row, and why it failed", async () => {
    const save = inFlight();
    vi.mocked(actions.deleteInterviewAction).mockReturnValue(save.promise);
    const { user, panel, statuses } = await openOak();
    const remove = within(panel).getByRole("button", { name: "Delete Technical Interview, Interview 2" });
    await user.click(remove);

    expect(remove).toBeDisabled();
    expect(statuses()).toEqual(["Deleting Interview 2: Deleting…"]);
    save.settle({ ok: false, error: "Interview not found" });
    expect(await within(panel).findByRole("alert")).toHaveTextContent("Deleting Interview 2: Interview not found");
    expect(remove).toBeEnabled();
  });
});
