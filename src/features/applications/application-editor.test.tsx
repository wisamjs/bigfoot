import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import type { Application } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { ApplicationEditor } from "./application-editor";
import { ApplicationHeading } from "./application-heading";
import { UnsavedChanges } from "./unsaved-changes";

// The editor guards leaving the page, which needs the router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Server Actions are mocked at their module: what the page sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({
  createApplicationAction: vi.fn(),
  updateApplicationAction: vi.fn(),
  deleteApplicationAction: vi.fn(),
  createInterviewAction: vi.fn(),
  updateInterviewAction: vi.fn(),
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
      <UnsavedChanges>
        <ApplicationHeading app={app} />
        <ApplicationEditor app={app} />
      </UnsavedChanges>
    </section>
  );
}

function openEditor(app: Application) {
  const user = userEvent.setup();
  const utils = render(<Editor app={app} />);
  return { user, ...utils };
}

const technical = interview("i1", {
  application_id: "birch",
  kind: "technical",
  completed: true,
});
const birch = application("birch", {
  company: "Birch",
  location: "Remote",
  salary: "$150k",
  interviews: [technical],
});

function openBirch(app = birch) {
  const opened = openEditor(app);
  return { ...opened, dialog: screen.getByRole("region", { name: "Birch" }) };
}

describe("the salary", () => {
  it("isn't shown, nor can it be typed, even when the Application has one", () => {
    const { dialog } = openBirch();
    expect(within(dialog).queryByLabelText("Salary")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Reveal" })).not.toBeInTheDocument();
    expect(dialog).not.toHaveTextContent("$150k");
  });
});

describe("the company and title", () => {
  it("show as the heading, with an edit button, and aren't in the details", () => {
    const { dialog } = openBirch();
    expect(within(dialog).getByRole("heading", { level: 1, name: "Birch" })).toBeInTheDocument();
    expect(within(dialog).getByText(birch.title)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Edit company and title" })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Company")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("become fields with focus on the company when the edit button is pressed", async () => {
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Edit company and title" }));
    expect(within(dialog).getByLabelText(/^Company/)).toHaveFocus();
    expect(within(dialog).getByLabelText(/^Company/)).toHaveValue("Birch");
    expect(within(dialog).getByLabelText(/^Title/)).toHaveValue(birch.title);
  });

  it("save together, trimmed, when Enter is pressed, and show the new text", async () => {
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Edit company and title" }));
    await user.clear(within(dialog).getByLabelText(/^Company/));
    await user.type(within(dialog).getByLabelText(/^Company/), "  Birch Trees {Enter}");
    expect(actions.updateApplicationAction).toHaveBeenCalledExactlyOnceWith("birch", {
      company: "Birch Trees",
      title: birch.title,
    });
    expect(
      await within(dialog).findByRole("heading", {
        level: 1,
        name: "Birch Trees",
      }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/^Company/)).not.toBeInTheDocument();
  });

  it("save when focus leaves the pair, but not when it moves between them", async () => {
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Edit company and title" }));
    await user.type(within(dialog).getByLabelText(/^Company/), "s");
    await user.tab();
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
    await user.tab({ shift: false });
    await user.tab();
    await user.tab();
    expect(actions.updateApplicationAction).toHaveBeenCalledOnce();
  });

  it("put back what was saved on Escape and on Cancel, sending nothing", async () => {
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Edit company and title" }));
    await user.type(within(dialog).getByLabelText(/^Company/), "xyz{Escape}");
    expect(within(dialog).getByRole("heading", { level: 1, name: "Birch" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Edit company and title" })).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "Edit company and title" }));
    await user.type(within(dialog).getByLabelText(/^Company/), "xyz");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(within(dialog).getByRole("heading", { level: 1, name: "Birch" })).toBeInTheDocument();
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  });

  it("refuse an empty Company beside it, keep what was typed, and send nothing", async () => {
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Edit company and title" }));
    await user.clear(within(dialog).getByLabelText(/^Company/));
    await user.keyboard("{Enter}");
    expect(within(dialog).getByLabelText(/^Company/)).toHaveValue("");
    expect(within(dialog).getByLabelText(/^Company/)).toBeInvalid();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/company/i);
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  });

  it("send nothing, and close, when neither changed", async () => {
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Edit company and title" }));
    await user.keyboard("{Enter}");
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
    expect(within(dialog).queryByLabelText(/^Company/)).not.toBeInTheDocument();
  });

  it("stay open with the API's error when the save fails", async () => {
    vi.mocked(actions.updateApplicationAction).mockResolvedValue({
      ok: false,
      error: "Company is too long",
      fieldErrors: { company: "Company is too long" },
    });
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Edit company and title" }));
    await user.type(within(dialog).getByLabelText(/^Company/), "!{Enter}");
    expect(await within(dialog).findAllByText("Company is too long")).not.toHaveLength(0);
    expect(within(dialog).getByLabelText(/^Company/)).toHaveValue("Birch!");
  });
});

describe("the Interviews", () => {
  const done = interview("i1", { application_id: "oak", kind: "recruiter_screen", completed: true, notes: "\n  Friendly.\nAsked about salary." });
  const soon = interview("i2", { application_id: "oak", kind: "technical", at: "2026-12-04T15:00:00Z", completed: false });
  const later = interview("i3", { application_id: "oak", kind: "leadership", at: "2026-12-11T15:00:00Z", completed: false });
  const oak = application("oak", { company: "Oak", interviews: [done, soon, later] });

  function rows(app = oak) {
    render(<ApplicationEditor app={app} />);
    const list = screen.getByRole("list", { name: "Interviews" });
    return within(list).getAllByRole("link");
  }

  it("lists each one in order as a link to its Interview page, with no fields or delete buttons", () => {
    const links = rows();
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/applications/oak/interviews/i1",
      "/applications/oak/interviews/i2",
      "/applications/oak/interviews/i3",
    ]);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Interview notes/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete .*Interview/ })).not.toBeInTheDocument();
  });

  it("shows each one's kind, date and the first line of its Interview notes", () => {
    const [first, second] = rows();
    expect(first).toHaveTextContent("Recruiter Screen");
    expect(first).toHaveTextContent("Friendly.");
    expect(first).not.toHaveTextContent("Asked about salary.");
    expect(within(first).getByText(/\w{3} \d+/, { selector: "time" })).toHaveAttribute("datetime", done.at);
    expect(second).toHaveTextContent("Technical");
    expect(second).not.toHaveTextContent("Notes:");
  });

  it("marks only the next one Next, so screen readers hear it too", () => {
    const [first, second, third] = rows();
    expect(second).toHaveAccessibleName(/^Open Interview: Technical, next Interview, /);
    expect(within(second).getByText("Next")).toBeInTheDocument();
    expect(within(first).queryByText("Next")).not.toBeInTheDocument();
    expect(within(third).queryByText("Next")).not.toBeInTheDocument();
    expect(first).toHaveAccessibleName(/^Open Interview: Recruiter Screen, .+\. Notes: Friendly\.$/);
  });

  it("mutes a past one", () => {
    const [first, second] = rows();
    expect(within(first).getByText("Recruiter Screen")).toHaveClass("bg-tone-gray");
    expect(within(second).getByText("Technical")).not.toHaveClass("bg-tone-gray");
  });

  it("shortens a long first line of notes at a word, so it wraps to a line or two", () => {
    const long = `${"word ".repeat(30)}end`;
    const [first] = rows({ ...oak, interviews: [{ ...soon, notes: long }] });
    const shown = within(first).getByText(/^word .*…$/);
    expect(shown.textContent!.length).toBeLessThanOrEqual(101);
    expect(shown).not.toHaveClass("truncate");
    expect(first).not.toHaveTextContent("end");
  });

  it("says Date needed for one with no date (ADR 0005)", () => {
    const [first] = rows({ ...oak, interviews: [{ ...soon, at: null, completed: true }] });
    expect(first).toHaveTextContent("Date needed");
    expect(first).toHaveAccessibleName("Open Interview: Technical, Date needed.");
  });

  it("says there are none yet when there are none", () => {
    render(<ApplicationEditor app={{ ...oak, interviews: [] }} />);
    expect(screen.getByText(/No Interviews yet/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Interviews" })).not.toBeInTheDocument();
  });
});

describe("editing an Application", () => {
  it("saves each detail when it's left, trimmed, with a cleared optional field as empty", async () => {
    const { user, dialog } = await openBirch();
    await user.clear(within(dialog).getByLabelText("Location"));
    await user.type(within(dialog).getByLabelText("Location"), "  Toronto ");
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
    await user.tab();
    expect(actions.updateApplicationAction).toHaveBeenCalledTimes(1);
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", {
      location: "Toronto",
    });

    await user.clear(within(dialog).getByLabelText("Location"));
    await user.tab();
    expect(actions.updateApplicationAction).toHaveBeenCalledTimes(2);
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", {
      location: null,
    });
  });

  it("sends nothing for a detail that was left unchanged", async () => {
    const { user, dialog } = await openBirch();
    await user.click(within(dialog).getByLabelText("Job posting URL"));
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
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", {
      applied_on: day,
    });
  });

  it("refuses a Job posting URL that isn't http or https beside it, and sends nothing", async () => {
    const { user, dialog } = await openBirch();
    await user.type(within(dialog).getByLabelText("Job posting URL"), "ftp://x.test");
    await user.tab();
    expect(within(dialog).getByLabelText("Job posting URL")).toBeInvalid();
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  });

  it("keeps a detail being typed in when another one's save lands", async () => {
    const { user, dialog, rerender } = await openBirch();
    await user.type(within(dialog).getByLabelText("Location"), " II");
    rerender(<Editor app={{ ...birch, posting_url: "https://toronto.test" }} />);
    expect(within(dialog).getByLabelText("Location")).toHaveValue("Remote II");
    expect(within(dialog).getByLabelText("Job posting URL")).toHaveValue("https://toronto.test");
  });

  it("has no Save details button", async () => {
    const { dialog } = await openBirch();
    expect(within(dialog).queryByRole("button", { name: /^Save (details|notes)/ })).not.toBeInTheDocument();
  });

  it("marks Done with an Outcome in two clicks, with no Save button, and never without one", async () => {
    const { user, dialog } = await openBirch();
    expect(within(dialog).queryByRole("radio", { name: "Withdrawn" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Save status" })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("radio", { name: "Done" }));
    expect(within(dialog).getByText("Choose an Outcome to finish")).toBeInTheDocument();
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("radio", { name: "Withdrawn" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledTimes(1);
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", {
      status: "done",
      outcome: "withdrawn",
    });
  });

  it("reopens a Done Application in one click, clearing its Outcome", async () => {
    const { user, dialog } = await openBirch({
      ...birch,
      status: "done",
      outcome: "rejected",
    });
    expect(within(dialog).getByRole("radio", { name: "Rejected" })).toBeChecked();
    await user.click(within(dialog).getByRole("radio", { name: "In Progress" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", {
      status: "in_progress",
      outcome: null,
    });
  });

  it("changes a Done Application's Outcome in one click", async () => {
    const { user, dialog } = await openBirch({
      ...birch,
      status: "done",
      outcome: "rejected",
    });
    await user.click(within(dialog).getByRole("radio", { name: "Offer" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", {
      status: "done",
      outcome: "offer",
    });
  });

  it("shows why a save failed", async () => {
    vi.mocked(actions.updateApplicationAction).mockResolvedValue({
      ok: false,
      error: "Location is too long",
    });
    const { user, dialog } = await openBirch();
    await user.type(within(dialog).getByLabelText("Location"), "x");
    await user.tab();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Location is too long");
  });
});

describe("deleting an Application", () => {
  async function askToDelete() {
    const { user, dialog } = openBirch();
    await user.click(within(dialog).getByRole("button", { name: "Delete application" }));
    return {
      user,
      confirm: screen.getByRole("dialog", { name: "Delete application?" }),
    };
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
    vi.mocked(actions.deleteApplicationAction).mockResolvedValue({
      ok: false,
      error: "Application not found",
    });
    const { user, confirm } = await askToDelete();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(await within(confirm).findByRole("alert")).toHaveTextContent("Application not found");
    expect(within(confirm).getByRole("button", { name: "Delete" })).toBeEnabled();
  });
});

describe("save status beside each field (BIG-118)", () => {
  const oak = application("oak", {
    company: "Oak",
    interviews: [interview("i1", { application_id: "oak", kind: "recruiter_screen" })],
  });

  async function openOak() {
    const opened = await openEditor(oak);
    const page = screen.getByRole("region", { name: "Oak" });
    return {
      ...opened,
      page,
      /** Every status the page shows, as screen readers hear them. */
      statuses: () =>
        within(page)
          .getAllByRole("status")
          .map((s) => s.textContent)
          .filter(Boolean),
    };
  }

  it("shows Status saving by its controls, and each detail saving beside itself", async () => {
    const { user, page, statuses } = await openOak();
    await user.click(within(page).getByRole("radio", { name: "Done" }));
    await user.click(within(page).getByRole("radio", { name: "Rejected" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(statuses()).toEqual(["Status: Saved"]);

    await user.type(within(page).getByLabelText("Location"), "Remote");
    await user.tab();
    expect(statuses()).toContain("Location: Saved");
  });

  it("opens the Add Interview page with this Application chosen, and creates nothing itself", async () => {
    const { page } = await openOak();
    expect(within(page).getByRole("link", { name: "Add Interview" })).toHaveAttribute("href", "/interviews/new?application=oak");
    expect(within(page).queryByRole("button", { name: "Add Interview" })).not.toBeInTheDocument();
    expect(actions.createInterviewAction).not.toHaveBeenCalled();
  });
});

describe("just after adding the Application", () => {
  const fresh = application("fresh", { company: "Fresh", interviews: [] });

  it("focuses Add Interview, prompts for the first Interview and announces the add", async () => {
    render(<ApplicationEditor app={fresh} justAdded />);
    await waitFor(() => expect(screen.getByRole("link", { name: "Add Interview" })).toHaveFocus());
    expect(screen.getByText("Added. Got an Interview lined up? Add it here.")).toBeInTheDocument();
    expect(screen.getByText("Fresh added")).toBeInTheDocument();
  });

  it("shows no prompt when the page is opened any other way", () => {
    render(<ApplicationEditor app={fresh} />);
    expect(screen.queryByText(/Got an Interview lined up/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add Interview" })).not.toHaveFocus();
  });
});
