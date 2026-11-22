import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { DashboardPipeline } from "./dashboard-pipeline";

// Server Actions are mocked at their module: what the panel sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({
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

function setUpDashboard() {
  const user = userEvent.setup();
  render(<DashboardPipeline applications={[birch, rejected]} subtitle="1 open" />);
  return user;
}

async function openBirch() {
  const user = setUpDashboard();
  await user.click(screen.getByRole("button", { name: /^Open Birch\b/ }));
  return { user, dialog: screen.getByRole("dialog", { name: "Birch" }) };
}

describe("Dashboard Pipeline", () => {
  it("shows Done Applications only after Show done", async () => {
    const user = setUpDashboard();
    expect(screen.queryByRole("region", { name: "Done" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Show done (1)" }));
    expect(within(screen.getByRole("region", { name: "Done" })).getByText("Umbrella")).toBeInTheDocument();
  });

  it("opens a card's Application in the side panel", async () => {
    const { dialog } = await openBirch();
    expect(dialog).toHaveTextContent("Engineer");
    expect(within(dialog).getByLabelText("Company")).toHaveValue("Birch");
  });
});

describe("editing an Application", () => {
  it("saves an Interview's kind as soon as it changes", async () => {
    const { user, dialog } = await openBirch();
    await user.selectOptions(within(dialog).getByLabelText(/^Kind/), "behavioural");
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { kind: "behavioural" });
  });

  it("saves an Interview's date and time once both are given, with no time assumed", async () => {
    const { user, dialog } = await openBirch();
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

  it("clears an Interview's date and time together", async () => {
    const dated = { ...birch, interviews: [{ ...technical, at: "2026-12-01T15:00:00.000Z" }] };
    const user = userEvent.setup();
    render(<DashboardPipeline subtitle="1 open" applications={[dated]} />);
    await user.click(screen.getByRole("button", { name: /^Open Birch\b/ }));
    const dialog = screen.getByRole("dialog", { name: "Birch" });
    await user.click(within(dialog).getByRole("button", { name: /^Date/ }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(actions.updateInterviewAction).toHaveBeenLastCalledWith("birch", "i1", { at: null });
  });

  it("saves only the details that changed, trimmed, with a cleared optional field as empty", async () => {
    const { user, dialog } = await openBirch();
    const save = within(dialog).getByRole("button", { name: "Save details" });
    expect(save).toBeDisabled();

    await user.clear(within(dialog).getByLabelText("Company"));
    await user.type(within(dialog).getByLabelText("Company"), "  Birch Trees ");
    await user.clear(within(dialog).getByLabelText("Location"));
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
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Interview kind is invalid" });
    const { user, dialog } = await openBirch();
    await user.selectOptions(within(dialog).getByLabelText(/^Kind/), "behavioural");
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
    expect(screen.queryByRole("dialog", { name: "Birch" })).not.toBeInTheDocument();

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
