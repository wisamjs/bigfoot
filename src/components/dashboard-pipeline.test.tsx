import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/dashboard/actions";
import { application, interview } from "@/test/applications";
import { DashboardPipeline } from "./dashboard-pipeline";

// Server Actions are mocked at their module: what the dialogs send, not how it reaches the API.
vi.mock("@/app/dashboard/actions", () => ({
  createApplicationAction: vi.fn(),
  updateApplicationAction: vi.fn(),
  deleteApplicationAction: vi.fn(),
  createInterviewAction: vi.fn(),
  updateInterviewAction: vi.fn(),
  deleteInterviewAction: vi.fn(),
}));

const ok = { ok: true } as const;

beforeEach(() => {
  for (const action of Object.values(actions)) {
    if (typeof action === "function") vi.mocked(action).mockReset().mockResolvedValue(ok);
  }
});

const technical = interview("i1", { application_id: "birch", kind: "technical", at: null, completed: true });
const birch = application("birch", { company: "Birch", location: "Remote", interviews: [technical] });
const rejected = application("umbrella", { company: "Umbrella", status: "done", outcome: "rejected", is_waiting: false });

function renderDashboard() {
  const user = userEvent.setup();
  render(<DashboardPipeline applications={[birch, rejected]} subtitle="1 open" />);
  return user;
}

async function openBirch() {
  const user = renderDashboard();
  await user.click(screen.getByRole("button", { name: /^Edit Birch\b/ }));
  return { user, dialog: screen.getByRole("dialog", { name: "Edit application" }) };
}

describe("Dashboard Pipeline", () => {
  it("shows Done Applications only after Show done", async () => {
    const user = renderDashboard();
    expect(screen.queryByRole("region", { name: "Done" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Show done (1)" }));
    expect(within(screen.getByRole("region", { name: "Done" })).getByText("Umbrella")).toBeInTheDocument();
  });

  it("opens a card's Application for editing", async () => {
    const { dialog } = await openBirch();
    expect(within(dialog).getByLabelText("Company")).toHaveValue("Birch");
  });
});

describe("editing an Application", () => {
  it("saves an Interview's kind as soon as it changes", async () => {
    const { user, dialog } = await openBirch();
    await user.selectOptions(within(dialog).getByLabelText(/^Kind/), "behavioural");
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { kind: "behavioural" });
  });

  it("saves an Interview's date when the field loses focus, and only if it changed", async () => {
    const { user, dialog } = await openBirch();
    const date = within(dialog).getByLabelText(/^Date and time/);
    await user.click(date);
    await user.tab();
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();

    await user.type(date, "2027-01-05T10:30");
    expect(actions.updateInterviewAction).not.toHaveBeenCalled();
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", {
      at: new Date("2027-01-05T10:30").toISOString(),
    });
  });

  it("saves only the details that changed, trimmed, with a cleared optional field as empty", async () => {
    const { user, dialog } = await openBirch();
    const save = within(dialog).getByRole("button", { name: "Save details" });
    expect(save).toBeDisabled();

    await user.clear(within(dialog).getByLabelText("Company"));
    await user.type(within(dialog).getByLabelText("Company"), "  Birch Trees ");
    await user.clear(within(dialog).getByLabelText("Location (optional)"));
    await user.click(save);
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", { company: "Birch Trees", location: null });
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
    vi.mocked(actions.createInterviewAction).mockResolvedValue({ ok: false, error: "Interview kind is invalid" });
    const { user, dialog } = await openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Add Interview" }));
    expect(actions.createInterviewAction).toHaveBeenCalledWith("birch", { kind: "informal_chat" });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Interview kind is invalid");
  });
});

describe("deleting an Application", () => {
  async function askToDelete() {
    const { user, dialog } = await openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Delete application" }));
    return { user, confirm: screen.getByRole("dialog", { name: "Delete application?" }) };
  }

  it("asks for confirmation first, and Cancel keeps the Application", async () => {
    const { user, confirm } = await askToDelete();
    expect(confirm).toHaveTextContent("Birch, Engineer will be deleted");
    expect(screen.queryByRole("dialog", { name: "Edit application" })).not.toBeInTheDocument();

    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(actions.deleteApplicationAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes once confirmed", async () => {
    const { user, confirm } = await askToDelete();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(actions.deleteApplicationAction).toHaveBeenCalledWith("birch");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
