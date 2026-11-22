import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { DATE_NEEDED } from "@/lib/validation";
import { application, interview } from "@/test/applications";
import { DashboardApplications } from "./dashboard-applications";

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

const technical = interview("i1", { application_id: "birch", kind: "technical", completed: true });
const birch = application("birch", { company: "Birch", location: "Remote", interviews: [technical] });
// Saved before an Interview's date was required (docs/adr/0005).
const undated = { ...birch, interviews: [{ ...technical, at: null }] };
const rejected = application("umbrella", { company: "Umbrella", status: "done", outcome: "rejected", is_waiting: false });

function setUpDashboard(app = birch) {
  const user = userEvent.setup();
  render(<DashboardApplications applications={[app, rejected]} />);
  return user;
}

async function openBirch(app = birch) {
  const user = setUpDashboard(app);
  await user.click(screen.getByRole("button", { name: /^Open Birch\b/ }));
  return { user, dialog: screen.getByRole("dialog", { name: "Birch" }) };
}

describe("Dashboard Applications", () => {
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

  it("shows Date needed for an Interview with no date, on its card and beside its date (ADR 0005)", async () => {
    const user = setUpDashboard(undated);
    // It counts as completed, so its Application is Waiting, but the card doesn't count it twice.
    const column = screen.getByRole("region", { name: "Waiting" });
    expect(within(column).getByText("Date needed")).toBeInTheDocument();
    expect(column).not.toHaveTextContent("completed");

    await user.click(screen.getByRole("button", { name: /^Open Birch\b/ }));
    const dialog = screen.getByRole("dialog", { name: "Birch" });
    expect(within(dialog).getByText(DATE_NEEDED)).toBeInTheDocument();
  });

  it("saves no other change to an Interview with no date until it has one", async () => {
    const { user, dialog } = await openBirch(undated);
    await user.selectOptions(within(dialog).getByLabelText(/^Kind/), "behavioural");
    await user.type(within(dialog).getByLabelText(/^Interview notes/), "Went well.");
    await user.click(within(dialog).getByRole("button", { name: /^Save notes/ }));
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
