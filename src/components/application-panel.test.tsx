import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/dashboard/actions";
import type { Application } from "@/lib/applications";
import { application } from "@/test/applications";
import { AddApplicationButton, ApplicationPanel, type PanelView } from "./application-panel";

// Server Actions are mocked at their module: what the panel sends, not how it reaches the API.
// Editing Status, details and Interviews in the panel is covered in dashboard-pipeline.test.tsx.
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

/** A caller that opens the panel on `view`, as the Pipeline does for a card. */
function Caller({ view, applications = [birch, cedar, maple] }: { view: PanelView; applications?: Application[] }) {
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
  const rendered = render(<Caller view={view} applications={applications} />);
  await user.click(screen.getByRole("button", { name: "Open panel" }));
  return { user, ...rendered };
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
