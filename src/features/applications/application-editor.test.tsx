import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { prepLookBack, type Application, type PrepLookBack } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { ApplicationEditor } from "./application-editor";
import { todayLocal } from "./local-datetime";
import { UnsavedChanges } from "./unsaved-changes";

// The page guards leaving it, which needs the router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Server Actions are mocked at their module: what the page sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({
  createApplicationAction: vi.fn(),
  updateApplicationAction: vi.fn(),
  deleteApplicationAction: vi.fn(),
  createInterviewAction: vi.fn(),
  updateInterviewAction: vi.fn(),
}));

/** Whether the window is as wide as a tablet or more, as matchMedia answers. */
let wide = true;

beforeEach(() => {
  for (const action of Object.values(actions)) {
    if (typeof action === "function") vi.mocked(action).mockReset().mockResolvedValue({ ok: true });
  }
  wide = true;
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({ matches: query.includes("min-width") && wide, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
  );
});

const DAY = 86_400_000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/** What the Application page puts around the editor. */
function Editor({ app, justAdded = false, lookBack }: { app: Application; justAdded?: boolean; lookBack?: PrepLookBack }) {
  return (
    <main>
      <UnsavedChanges>
        <ApplicationEditor app={app} justAdded={justAdded} lookBack={lookBack} />
      </UnsavedChanges>
    </main>
  );
}

function open(app: Application, { justAdded = false, lookBack }: { justAdded?: boolean; lookBack?: PrepLookBack } = {}) {
  const user = userEvent.setup();
  const utils = render(<Editor app={app} justAdded={justAdded} lookBack={lookBack} />);
  return { user, ...utils };
}

const birch = application("birch", {
  company: "Birch",
  title: "Engineer",
  location: "remote",
  salary: "$150k",
  posting_url: "https://www.birch.test/jobs/1",
  interviews: [interview("i1", { application_id: "birch", kind: "technical" })],
});

/** Opens Birch with its details as fields. */
async function editBirch(app = birch) {
  const opened = open(app);
  await opened.user.click(screen.getByRole("button", { name: "Edit details" }));
  return opened;
}

const details = () => screen.getByRole("region", { name: /details$/i });

describe("the heading", () => {
  it("shows the company, then the role and Location, and where the Application stands", () => {
    open({ ...birch, interviews: [interview("next", { completed: false, at: daysFromNow(3) })], is_waiting: false });
    expect(screen.getByRole("heading", { level: 1, name: "Birch" })).toBeInTheDocument();
    expect(screen.getByText("Engineer · Remote")).toBeInTheDocument();
    expect(screen.getByText("Interview scheduled")).toBeInTheDocument();
  });

  it("says how long a Waiting Application has waited", () => {
    open({ ...birch, waiting_since: new Date(Date.now() - 5 * DAY).toISOString() });
    expect(screen.getByText(/^Waiting · 5 days$/)).toBeInTheDocument();
  });

  it("shows a Done Application's Outcome", () => {
    open({ ...birch, status: "done", outcome: "rejected", is_waiting: false });
    expect(screen.getByText("Done · Rejected")).toBeInTheDocument();
  });
});

describe("Mark done…", () => {
  it("marks the Application Done with the Outcome picked and today as its Done date, in one save", async () => {
    const { user } = open(birch);
    await user.click(screen.getByRole("button", { name: "Mark done…" }));
    await user.click(screen.getByRole("menuitem", { name: "Mark Withdrawn" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", {
      status: "done",
      outcome: "withdrawn",
      done_on: todayLocal(),
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("reopens a Done Application, clearing its Outcome, Done date and Outcome note", async () => {
    const { user } = open({ ...birch, status: "done", outcome: "rejected", done_on: "2026-11-16", outcome_note: "Not now." });
    await user.click(screen.getByRole("button", { name: "Change Status…" }));
    expect(screen.queryByRole("menuitem", { name: "Mark Rejected" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Reopen" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", {
      status: "in_progress",
      outcome: null,
      done_on: null,
      outcome_note: null,
    });
  });

  it("moves into ⋯ on a phone", async () => {
    wide = false;
    const { user } = open(birch);
    await user.click(screen.getByRole("button", { name: "More actions, Birch" }));
    await user.click(screen.getByRole("menuitem", { name: "Mark Offer" }));
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", { status: "done", outcome: "offer", done_on: todayLocal() });
  });
});

describe("deleting an Application", () => {
  async function askToDelete() {
    const { user } = open(birch);
    await user.click(screen.getByRole("button", { name: "More actions, Birch" }));
    expect(screen.queryByRole("menuitem", { name: /^Mark/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete application" }));
    return { user, confirm: await screen.findByRole("dialog", { name: "Delete application?" }) };
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
  });
});

describe("the Interviews", () => {
  const oak = application("oak", {
    company: "Oak",
    is_waiting: false,
    interviews: [
      interview("screen", { application_id: "oak", kind: "recruiter_screen", at: daysFromNow(-10), how_it_went: "Friendly.\n\nLead with the decision next time." }),
      interview("manager", {
        application_id: "oak",
        kind: "hiring_manager",
        at: daysFromNow(-3),
        how_it_went: "Went long.\n\nAsk about on-call.",
        takeaway: "Lead with the decision.",
      }),
      interview("deep", { application_id: "oak", kind: "technical_deep_dive", at: daysFromNow(2), completed: false }),
      interview("lead", { application_id: "oak", kind: "leadership", at: daysFromNow(9), completed: false }),
    ],
  });
  const rows = () => screen.getAllByRole("link", { name: /^Open Interview: / }).map((row) => row.textContent);

  it("shows the next one first, on its own, with the takeaways that apply and They asked last time", () => {
    const elm = application("elm", {
      company: "Elm Health",
      interviews: [interview("elm-dive", { application_id: "elm", kind: "technical_deep_dive", at: daysFromNow(-20), takeaway: "Draw it first." })],
    });
    const asked = { ...oak, interviews: oak.interviews.map((i) => (i.id === "manager" ? { ...i, what_they_asked: "Why Oak?\nWhat would you not build?" } : i)) };
    open(asked, { lookBack: prepLookBack([asked, elm], asked, asked.interviews[2]) });
    const next = screen.getByRole("region", { name: "Technical Deep-Dive" });
    expect(next).toHaveTextContent(/Next up · in 2 days/);
    const takeaways = within(within(next).getByRole("list", { name: "Takeaways for this Interview" })).getAllByRole("listitem");
    expect(takeaways.map((t) => t.textContent)).toEqual([
      expect.stringMatching(/^Takeaway from Hiring Manager · .+Lead with the decision\.$/),
      "From your last Technical Deep-Dive · Elm HealthDraw it first.",
    ]);
    expect(within(within(next).getByRole("list", { name: "They asked last time" })).getAllByRole("listitem")).toHaveLength(2);
    expect(within(next).queryByText(/Carried forward/)).not.toBeInTheDocument();
    expect(within(next).getByRole("link", { name: "Add Interview notes" })).toHaveAttribute("href", "/applications/oak/interviews/deep");
  });

  it("looks back at nothing when there is nothing to look back at", () => {
    open(oak);
    const next = screen.getByRole("region", { name: "Technical Deep-Dive" });
    expect(within(next).queryByRole("list", { name: "Takeaways for this Interview" })).not.toBeInTheDocument();
    expect(within(next).queryByRole("list", { name: "They asked last time" })).not.toBeInTheDocument();
  });

  it("lists the rest under Later, then the completed ones under Completed, newest first", () => {
    open(oak);
    expect(within(screen.getByRole("list", { name: "Later" })).getAllByRole("listitem")).toHaveLength(1);
    expect(within(screen.getByRole("list", { name: "Completed" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("list", { name: "Done" })).not.toBeInTheDocument();
    expect(rows()).toEqual([
      "Open Interview: Leadership",
      "Open Interview: Hiring Manager",
      "Open Interview: Recruiter Screen",
    ]);
  });

  it("shows a completed Interview's notes in full", () => {
    open(oak);
    expect(screen.getByText("Went long.")).toBeInTheDocument();
    expect(screen.getByText("Ask about on-call.", { selector: "li p" })).toBeInTheDocument();
  });

  it("shows the next one's own notes instead of Add Interview notes once it has some", () => {
    open({ ...oak, interviews: oak.interviews.map((i) => (i.id === "deep" ? { ...i, how_it_went: "Bring the migration story." } : i)) });
    expect(screen.getByText("Bring the migration story.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Add Interview notes" })).not.toBeInTheDocument();
  });

  it("strips them by date, counting the completed ones", () => {
    open(oak);
    expect(within(screen.getByRole("list", { name: "Interviews by date" })).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("2 of 4 Interviews completed")).toBeInTheDocument();
  });

  it("opens each Interview's page from its segment", () => {
    open(oak);
    const segments = within(screen.getByRole("list", { name: "Interviews by date" })).getAllByRole("link");
    expect(segments).toHaveLength(4);
    expect(segments[0]).toHaveAttribute("href", "/applications/oak/interviews/screen");
    expect(segments.some((link) => link.hasAttribute("aria-current"))).toBe(false);
  });

  it("strips completed Interviews green while In Progress and grey once Done (BIG-177)", () => {
    const bars = () =>
      within(screen.getByRole("list", { name: "Interviews by date" }))
        .getAllByRole("listitem")
        // eslint-disable-next-line testing-library/no-node-access -- the bar is decoration (aria-hidden) inside the segment's link, with no role or text to query by.
        .map((segment) => segment.firstElementChild?.firstElementChild?.firstElementChild);
    const { unmount } = open(oak);
    expect(bars().filter((bar) => bar?.classList.contains("bg-fg-success-strong"))).toHaveLength(2);
    expect(bars().filter((bar) => bar?.classList.contains("bg-tone-gray-fg"))).toHaveLength(0);
    unmount();
    open({ ...oak, status: "done", outcome: "rejected" });
    expect(bars().filter((bar) => bar?.classList.contains("bg-tone-gray-fg"))).toHaveLength(2);
    expect(bars().filter((bar) => bar?.classList.contains("bg-fg-success-strong"))).toHaveLength(0);
  });

  it("opens the Add Interview page with this Application chosen", () => {
    open(oak);
    expect(screen.getByRole("link", { name: "Add Interview" })).toHaveAttribute("href", "/interviews/new?application=oak");
  });

  it("shows Bigfoot and a first Add Interview when there are none", () => {
    open({ ...oak, interviews: [], is_waiting: true });
    expect(screen.getByRole("heading", { name: "No Interviews yet" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Add Interview" })).toHaveLength(1);
    expect(screen.queryByRole("list", { name: "Interviews by date" })).not.toBeInTheDocument();
  });
});

describe("the details", () => {
  it("show as text, with the salary hidden behind Reveal and the posting's host as a link", async () => {
    const { user } = open(birch);
    expect(details()).not.toHaveTextContent("$150k");
    expect(within(details()).getByRole("link", { name: /birch\.test/ })).toHaveAttribute("target", "_blank");
    await user.click(within(details()).getByRole("button", { name: "Reveal salary" }));
    expect(details()).toHaveTextContent("$150k");
  });

  it("read Not added when empty", () => {
    open({ ...birch, salary: null, posting_url: null });
    expect(within(details()).getAllByText("Not added")).toHaveLength(2);
    expect(within(details()).queryByRole("button", { name: "Reveal salary" })).not.toBeInTheDocument();
  });

  it("become fields, company and title included, with the salary masked until Show", async () => {
    const { user } = await editBirch();
    expect(screen.getByRole("heading", { name: "Edit details" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Company/ })).toHaveValue("Birch");
    expect(screen.getByRole("textbox", { name: /^Title/ })).toHaveValue("Engineer");
    const salary = screen.getByLabelText("Salary");
    expect(salary).toHaveAttribute("type", "password");
    expect(salary).toHaveValue("$150k");
    await user.click(screen.getByRole("button", { name: "Show salary" }));
    expect(salary).toHaveAttribute("type", "text");
  });

  it("save each when it's left, trimmed, with a cleared optional one as empty", async () => {
    const { user } = await editBirch();
    const company = screen.getByRole("textbox", { name: /^Company/ });
    await user.clear(company);
    await user.type(company, "  Birch Labs ");
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
    await user.tab();
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", { company: "Birch Labs" });

    await user.clear(screen.getByLabelText("Salary"));
    await user.tab();
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", { salary: null });
  });

  it("refuse an empty Company beside it, keep what was typed, send nothing, and stay open on Done", async () => {
    const { user } = await editBirch();
    const company = screen.getByRole("textbox", { name: /^Company/ });
    await user.clear(company);
    await user.tab();
    expect(company).toBeInvalid();
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(company).toHaveFocus();
  });

  it("go back to text on Done, with focus on the edit button", async () => {
    const { user } = await editBirch();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("textbox", { name: /^Company/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit details" })).toHaveFocus();
  });

  it("save the Location as soon as it's picked, and clear it when the picked one is picked again", async () => {
    const { user } = await editBirch();
    const location = screen.getByRole("radiogroup", { name: "Location" });
    expect(within(location).getByRole("radio", { name: "Remote" })).toBeChecked();
    await user.click(within(location).getByRole("radio", { name: "In-Office" }));
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", { location: "in_office" });
    await user.click(within(location).getByRole("radio", { name: "In-Office" }));
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", { location: null });
  });

  it("ask for days in office only for Hybrid, and save them with it", async () => {
    const { user } = await editBirch();
    expect(screen.queryByRole("radiogroup", { name: "Days in office" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Hybrid" }));
    await user.click(screen.getByRole("radio", { name: "3 days a week" }));
    expect(actions.updateApplicationAction).toHaveBeenLastCalledWith("birch", { location: "hybrid", office_days: 3 });
  });

  it("send nothing for a detail left unchanged", async () => {
    const { user } = await editBirch();
    await user.click(screen.getByLabelText("Job posting URL"));
    await user.tab();
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  });

  it("save the applied date when it's picked", async () => {
    const { user } = await editBirch();
    await user.click(screen.getByRole("button", { name: /^Applied/ }));
    await user.click(within(screen.getByRole("grid")).getByText("15"));
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", { applied_on: day });
  });

  it("refuse a Job posting URL that isn't http or https, and send nothing", async () => {
    const { user } = await editBirch({ ...birch, posting_url: null });
    await user.type(screen.getByLabelText("Job posting URL"), "ftp://x.test");
    await user.tab();
    expect(screen.getByLabelText("Job posting URL")).toBeInvalid();
    expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  });

  it("keep a detail being typed in when another one's save lands", async () => {
    const { user, rerender } = await editBirch({ ...birch, posting_url: null });
    await user.type(screen.getByLabelText("Job posting URL"), "https://birch.test");
    rerender(<Editor app={{ ...birch, posting_url: null, location: "in_office" }} />);
    expect(screen.getByLabelText("Job posting URL")).toHaveValue("https://birch.test");
    expect(screen.getByRole("radio", { name: "In-Office" })).toBeChecked();
  });

  it("show why a save failed, with each detail's status beside it", async () => {
    vi.mocked(actions.updateApplicationAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server." });
    const { user } = await editBirch();
    await user.click(screen.getByRole("radio", { name: "In-Office" }));
    expect(await screen.findByRole("button", { name: "Retry, Location" })).toBeInTheDocument();
  });

  it("show Saved beside the detail that saved", async () => {
    const { user } = await editBirch();
    await user.click(screen.getByRole("radio", { name: "In-Office" }));
    await waitFor(() =>
      expect(within(details()).getAllByRole("status").map((s) => s.textContent)).toContain("Location: Saved"),
    );
  });
});

describe("just after adding the Application", () => {
  const fresh = application("fresh", { company: "Fresh", interviews: [] });

  it("focuses Add Interview, prompts for the first Interview and announces the add", async () => {
    open(fresh, { justAdded: true });
    await waitFor(() => expect(screen.getByRole("link", { name: "Add Interview" })).toHaveFocus());
    expect(screen.getByText("Added. Got an Interview lined up? Add it here.")).toBeInTheDocument();
    expect(screen.getByText("Fresh added")).toBeInTheDocument();
  });

  it("shows no prompt when the page is opened any other way", () => {
    open(fresh);
    expect(screen.queryByText(/Got an Interview lined up/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add Interview" })).not.toHaveFocus();
  });
});
