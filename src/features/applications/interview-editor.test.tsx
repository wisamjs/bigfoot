import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { DATE_NEEDED } from "@/lib/validation";
import { InterviewEditor } from "./interview-editor";
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
