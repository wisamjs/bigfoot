import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { ApplicationEditor } from "@/features/applications/application-editor";
import { ApplicationHeading } from "@/features/applications/application-heading";
import { InterviewEditor } from "@/features/applications/interview-editor";
import { NewApplicationForm } from "@/features/applications/new-application-form";
import { NewInterviewForm } from "@/features/applications/new-interview-form";
import { getUpcoming } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { INJECTED_ELEMENTS, XSS_TEXT, XSS_URLS } from "@/test/xss";
import { InterviewCalendar } from "./interview-calendar";
import { DashboardApplications } from "./dashboard-applications";
import { NextInterviewStat } from "./next-interview-stat";

// Everything a job seeker types is shown as text and never runs (BIG-89): each payload goes into
// every Application field and the Interview notes, then through each display and form.

vi.mock("next/navigation", () => import("@/test/navigation"));

vi.mock("@/app/applications/actions", () => ({
  createApplicationAction: vi.fn(),
  updateApplicationAction: vi.fn(),
  deleteApplicationAction: vi.fn(),
  createInterviewAction: vi.fn(),
  updateInterviewAction: vi.fn(),
  deleteInterviewAndLeaveAction: vi.fn(),
}));

declare global {
  interface Window {
    __xss?: boolean;
  }
}

beforeEach(() => {
  delete window.__xss;
  for (const action of Object.values(actions)) {
    if (typeof action === "function") vi.mocked(action).mockReset().mockResolvedValue({ ok: true });
  }
  // A month ahead, so the Interview is upcoming and on the calendar.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 2, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/** An Application with `payload` in every text field, a `url` Posting link and an upcoming Interview. */
function poisoned(payload: string, url: string) {
  const upcoming = interview("i1", {
    application_id: "x",
    at: new Date(2026, 10, 20, 10, 0).toISOString(),
    completed: false,
    notes: payload,
  });
  return application("x", {
    company: payload,
    title: payload,
    location: payload,
    salary: payload,
    posting_url: url,
    is_waiting: false,
    interviews: [upcoming],
  });
}

function expectNothingInjected() {
  // eslint-disable-next-line testing-library/no-node-access -- injected tags have no role or text to query by.
  expect(document.body.querySelectorAll(INJECTED_ELEMENTS)).toHaveLength(0);
  expect(window.__xss).toBeUndefined();
}

describe.each(XSS_TEXT.map((payload, n) => [payload, XSS_URLS[n]] as const))("%j with Posting link %j", (payload, url) => {
  it("shows as text in the Applications list, with no Posting link", () => {
    render(<DashboardApplications applications={[poisoned(payload, url)]} />);
    expect(screen.getAllByText(payload, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /job posting/ })).not.toBeInTheDocument();
    expectNothingInjected();
  });

  it("shows as text on the Application page, with no Posting link", () => {
    render(
      <>
        <ApplicationHeading app={poisoned(payload, url)} />
        <ApplicationEditor app={poisoned(payload, url)} />
      </>,
    );
    expect(screen.getByRole("heading", { level: 1, name: payload.trim() })).toBeInTheDocument();
    expect(screen.getByLabelText("Location")).toHaveValue(payload);
    // Interview notes show as the first line of the Interview's row, which opens its Interview page.
    expect(screen.getByRole("link", { name: /^Open Interview: / })).toHaveTextContent(payload.trim().split("\n")[0]);
    expect(screen.queryByRole("link", { name: /job posting/ })).not.toBeInTheDocument();
    expectNothingInjected();
  });

  it("shows as text on the calendar and the Next Interview stat", () => {
    const apps = [poisoned(payload, url)];
    render(
      <>
        <InterviewCalendar interviews={getUpcoming(apps)} />
        {/* The stat is one of the dashboard's list of numbers. */}
        <ul>
          <NextInterviewStat next={getUpcoming(apps)[0] ?? null} />
        </ul>
      </>,
    );
    expect(screen.getAllByText(payload, { exact: false }).length).toBeGreaterThan(0);
    expectNothingInjected();
  });

  it("shows as text in the Add Interview page's Application picker", () => {
    render(<NewInterviewForm applications={[poisoned(payload, url)]} />);
    expect(screen.getByRole("option", { name: `${payload} · ${payload}` })).toBeInTheDocument();
    expectNothingInjected();
  });
});

describe("the Add Interview form", () => {
  it.each(XSS_TEXT)("sends Interview notes %j exactly as typed", async (payload) => {
    const user = userEvent.setup();
    render(<NewInterviewForm applications={[application("birch", { company: "Birch" })]} applicationId="birch" />);
    await user.click(screen.getByRole("button", { name: /^Date, / }));
    await user.click(within(screen.getByRole("grid")).getByText("20"));
    await user.type(screen.getByLabelText("Time"), "10:00");
    // Pastes rather than types: user-event reads braces and brackets as key names.
    await user.click(screen.getByLabelText("Interview notes"));
    await user.paste(payload);
    await user.click(screen.getByRole("button", { name: "Add Interview" }));

    expect(actions.createInterviewAction).toHaveBeenCalledWith(
      "birch",
      expect.objectContaining({ notes: payload.trim() }),
    );
    expectNothingInjected();
  });
});

describe("the edit forms on the Application page", () => {
  const birch = application("birch", {
    company: "Birch",
    is_waiting: false,
    interviews: [interview("i1", { application_id: "birch", at: new Date(2026, 10, 20, 10, 0).toISOString(), completed: false })],
  });

  async function openBirch() {
    const user = userEvent.setup();
    render(<ApplicationEditor app={birch} />);
    /** Pastes rather than types: user-event reads braces and brackets as key names. */
    async function fill(label: string | RegExp, value: string) {
      const input = screen.getByLabelText(label);
      await user.clear(input);
      await user.click(input);
      await user.paste(value);
    }
    return { user, fill };
  }

  it.each(XSS_TEXT)("send %j exactly as typed, from the details", async (payload) => {
    const { user, fill } = await openBirch();
    await fill("Location", payload);
    await user.tab();
    expect(actions.updateApplicationAction).toHaveBeenCalledWith("birch", { location: payload.trim() });
    expectNothingInjected();
  });

  it.each(XSS_URLS.filter((url) => url.trim() === url))(
    "refuse Posting link %j beside the field, and send nothing",
    async (url) => {
      const { user, fill } = await openBirch();
      await fill("Job posting URL", url);
      await user.tab();

      const field = screen.getByLabelText("Job posting URL");
      expect(field).toBeInvalid();
      expect(field).toHaveAccessibleDescription("Enter a link that starts with http:// or https://.");
      expect(screen.getByRole("alert")).toHaveTextContent("Enter a link that starts with http:// or https://.");
      expect(actions.updateApplicationAction).not.toHaveBeenCalled();
    },
  );
});

describe("the Interview notes on the Interview page", () => {
  it.each(XSS_TEXT)("send %j exactly as typed", async (payload) => {
    const user = userEvent.setup();
    const current = interview("i1", { application_id: "birch", at: new Date(2026, 10, 20, 10, 0).toISOString(), completed: false });
    render(<InterviewEditor app={application("birch", { company: "Birch", interviews: [current] })} interview={current} />);
    const notes = screen.getByLabelText("Interview notes");
    await user.click(notes);
    await user.paste(payload);
    await user.tab();
    expect(actions.updateInterviewAction).toHaveBeenCalledWith("birch", "i1", { notes: payload.trim() });
    expectNothingInjected();
  });
});

describe("the Add form", () => {
  async function openAdd() {
    const user = userEvent.setup();
    render(<NewApplicationForm />);
    const panel = screen.getByRole("form", { name: "New Application" });
    /** Pastes rather than types: user-event reads braces and brackets as key names. */
    async function fill(label: string, value: string) {
      const input = within(panel).getByLabelText(label);
      await user.clear(input);
      await user.click(input);
      await user.paste(value);
    }
    return { user, panel, fill };
  }

  it.each(XSS_URLS.filter((url) => url.trim() === url))(
    "refuses Posting link %j beside the field, announced, and sends nothing",
    async (url) => {
      const { user, panel, fill } = await openAdd();
      await fill("Company", "Birch");
      await fill("Title", "Engineer");
      await fill("Job posting URL", url);
      await user.click(within(panel).getByRole("button", { name: "Add Application" }));

      const field = within(panel).getByLabelText("Job posting URL");
      expect(field).toBeInvalid();
      expect(field).toHaveAccessibleDescription("Enter a link that starts with http:// or https://.");
      expect(field).toHaveFocus();
      expect(within(panel).getByRole("alert")).toHaveTextContent("Enter a link that starts with http:// or https://.");
      expect(actions.createApplicationAction).not.toHaveBeenCalled();
    },
  );

  it("names every missing or too-long field at once, and focuses the first", async () => {
    const { user, panel, fill } = await openAdd();
    await fill("Location", "x".repeat(201));
    await user.click(within(panel).getByRole("button", { name: "Add Application" }));

    expect(within(panel).getByLabelText("Company")).toHaveFocus();
    expect(within(panel).getByLabelText("Company")).toHaveAccessibleDescription("Enter the company.");
    expect(within(panel).getByLabelText("Title")).toHaveAccessibleDescription("Enter the title.");
    expect(within(panel).getByRole("alert")).toHaveTextContent("Enter the company. 1 more field needs fixing.");
    expect(actions.createApplicationAction).not.toHaveBeenCalled();

    // Fixing a field clears its error.
    await fill("Company", "Birch");
    expect(within(panel).getByLabelText("Company")).toBeValid();
  });

  it("shows field errors the Server Action finds beside their fields", async () => {
    vi.mocked(actions.createApplicationAction).mockResolvedValue({
      ok: false,
      error: "Title can be at most 200 characters.",
      fieldErrors: { title: "Title can be at most 200 characters." },
    });
    const { user, panel, fill } = await openAdd();
    await fill("Company", "Birch");
    await fill("Title", "Engineer");
    await user.click(within(panel).getByRole("button", { name: "Add Application" }));
    expect(within(panel).getByLabelText("Title")).toHaveAccessibleDescription("Title can be at most 200 characters.");
  });

  it.each(XSS_TEXT)("sends %j exactly as typed, for the API to store and the pages to escape", async (payload) => {
    const { user, panel, fill } = await openAdd();
    await fill("Company", payload);
    await fill("Title", payload);
    await user.click(within(panel).getByRole("button", { name: "Add Application" }));

    expect(actions.createApplicationAction).toHaveBeenCalledWith(
      expect.objectContaining({ company: payload.trim(), title: payload.trim() }),
    );
    expectNothingInjected();
  });
});
