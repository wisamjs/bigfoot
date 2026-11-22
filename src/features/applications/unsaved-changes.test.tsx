import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { ApplicationEditor } from "./application-editor";
import { NewApplicationForm } from "./new-application-form";
import { NewInterviewForm } from "./new-interview-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Server Actions are mocked at their module: what the page sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({
  createApplicationAction: vi.fn(),
  updateApplicationAction: vi.fn(),
  deleteApplicationAction: vi.fn(),
  createInterviewAction: vi.fn(),
  updateInterviewAction: vi.fn(),
  deleteInterviewAction: vi.fn(),
}));

let go: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  push.mockReset();
  for (const action of Object.values(actions)) {
    if (typeof action === "function") vi.mocked(action).mockReset().mockResolvedValue({ ok: true });
  }
  vi.mocked(actions.createApplicationAction).mockResolvedValue({ ok: true, id: "new-id" });
  go = vi.spyOn(window.history, "go").mockImplementation(() => {});
});

afterEach(() => {
  go.mockRestore();
});

const birch = application("birch", {
  company: "Birch",
  interviews: [interview("i1", { application_id: "birch", kind: "technical" })],
});

/** The page around a form: the links the guard has to catch. */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="/dashboard">
        Dashboard
      </a>
      <a href="https://example.com/post">
        Job posting
      </a>
      <a href="#top">
        Top
      </a>
      {children}
    </>
  );
}

function openEditor() {
  const user = userEvent.setup();
  render(
    <Page>
      <ApplicationEditor app={birch} />
    </Page>,
  );
  return user;
}

const PROMPT = /You have unsaved changes/;

/**
 * Whether a click on the link `name` went through: it reached the page's own handling, with
 * nothing having stopped it. The test cancels the navigation it would then start.
 */
function clickGoesThrough(name: string) {
  let reached = false;
  let stopped = true;
  const spy = (e: Event) => {
    reached = true;
    stopped = e.defaultPrevented;
    e.preventDefault();
  };
  // At the document, after the guard's capturing listener and anything it stopped.
  document.addEventListener("click", spy);
  fireEvent.click(screen.getByRole("link", { name }));
  document.removeEventListener("click", spy);
  return reached && !stopped;
}

describe("leaving the Application page with nothing unsaved", () => {
  it("goes straight through, and closing the tab isn't questioned", () => {
    openEditor();
    expect(clickGoesThrough("Dashboard")).toBe(true);
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });
});

describe("leaving the Application page with unsaved changes", () => {
  it("asks when a detail was typed in but not left, and the page stays", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    expect(clickGoesThrough("Dashboard")).toBe(false);
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("asks when Interview notes are still inside their typing pause", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText(/^Interview notes/), "Went well.");
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
  });

  it("asks when a save failed, since what was typed isn't stored", async () => {
    vi.mocked(actions.updateInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t save" });
    const user = openEditor();
    await user.type(screen.getByLabelText(/^Interview notes/), "Went well.");
    await user.tab();
    await screen.findByText("Couldn’t save");
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
  });

  it("asks before the browser closes or reloads the tab", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });

  it("leaves new tabs, other sites and the same page alone", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    expect(clickGoesThrough("Job posting")).toBe(true);
    expect(clickGoesThrough("Top")).toBe(true);
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });

  it("puts Keep editing in focus, keeps what was typed, and returns to the first unsaved field", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    await user.type(screen.getByLabelText(/^Interview notes/), "Went well.");
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Company")).toHaveFocus());
    expect(screen.getByLabelText("Company")).toHaveValue(`${birch.company}x`);
    expect(screen.getByLabelText(/^Interview notes/)).toHaveValue("Went well.");
    expect(push).not.toHaveBeenCalled();
  });

  it("treats Escape as Keep editing", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("goes where the link led when Discard is pressed", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/dashboard");
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });

  it("is keyboard-only: the prompt's buttons are reached and pressed without a mouse", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await user.tab();
    expect(screen.getByRole("button", { name: "Discard" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("goes on by itself once the save that the click started has landed", async () => {
    let finish: () => void = () => {};
    vi.mocked(actions.updateApplicationAction).mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ ok: true });
      }),
    );
    const { rerender } = render(
      <Page>
        <ApplicationEditor app={birch} />
      </Page>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Company"), "x");
    // Clicking the link blurs the field, which starts its save; the click then finds it unsaved.
    await user.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await act(async () => finish());
    rerender(
      <Page>
        <ApplicationEditor app={{ ...birch, company: `${birch.company}x` }} />
      </Page>,
    );
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/dashboard"));
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });
});

describe("Back with unsaved changes", () => {
  /** The browser's popstate, as a state update the page renders. */
  function pressBack() {
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  }

  /** Counts the popstate events that get past the guard, to where Next.js would act on them. */
  function watchPopState() {
    const reached = vi.fn();
    window.addEventListener("popstate", reached);
    return { reached, stop: () => window.removeEventListener("popstate", reached) };
  }

  it("lets Back through when nothing is unsaved", () => {
    openEditor();
    const { reached, stop } = watchPopState();
    pressBack();
    stop();
    expect(reached).toHaveBeenCalledOnce();
    expect(go).not.toHaveBeenCalled();
  });

  it("keeps Next.js from following it, returns to the page and asks", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    const { reached, stop } = watchPopState();
    pressBack();
    expect(reached).not.toHaveBeenCalled();
    expect(go).toHaveBeenCalledExactlyOnceWith(1);
    expect(screen.getByText(PROMPT)).toBeInTheDocument();

    // The browser's own move back to the page is stopped too.
    pressBack();
    stop();
    expect(reached).not.toHaveBeenCalled();
    expect(go).toHaveBeenCalledOnce();
  });

  it("Keep editing stays on the page, and Discard goes back for real", async () => {
    const user = openEditor();
    await user.type(screen.getByLabelText("Company"), "x");
    pressBack();
    pressBack();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(go).toHaveBeenCalledOnce();

    pressBack();
    pressBack();
    go.mockClear();
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(go).toHaveBeenCalledExactlyOnceWith(-1);

    const { reached, stop } = watchPopState();
    pressBack();
    stop();
    expect(reached).toHaveBeenCalledOnce();
  });
});

describe("Add Application", () => {
  it("asks once any field differs from where it started, and not before", async () => {
    const user = userEvent.setup();
    render(
      <Page>
        <NewApplicationForm />
      </Page>,
    );
    expect(clickGoesThrough("Dashboard")).toBe(true);
    await user.type(screen.getByLabelText("Company"), "Acme");
    expect(clickGoesThrough("Dashboard")).toBe(false);
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
  });

  it("brings Keep editing back to the first field that was filled in", async () => {
    const user = userEvent.setup();
    render(
      <Page>
        <NewApplicationForm />
      </Page>,
    );
    await user.type(screen.getByLabelText("Title"), "Engineer");
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
  });

  it("doesn't ask about what it has just added", async () => {
    const user = userEvent.setup();
    render(
      <Page>
        <NewApplicationForm />
      </Page>,
    );
    await user.type(screen.getByLabelText("Company"), "Acme");
    await user.type(screen.getByLabelText("Title"), "Engineer");
    await user.click(screen.getByRole("button", { name: "Add Application" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/applications/new-id?added=1"));
    expect(clickGoesThrough("Dashboard")).toBe(true);
  });
});

describe("Add Interview", () => {
  const apps = [birch];

  it("asks once anything is entered, but not for the Application already chosen", async () => {
    const user = userEvent.setup();
    render(
      <Page>
        <NewInterviewForm applications={apps} applicationId="birch" />
      </Page>,
    );
    expect(clickGoesThrough("Dashboard")).toBe(true);
    await user.type(screen.getByLabelText("Interview notes"), "Prep");
    expect(clickGoesThrough("Dashboard")).toBe(false);
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
  });

  it("asks when only the Application was chosen, if it wasn't chosen to begin with", async () => {
    const user = userEvent.setup();
    render(
      <Page>
        <NewInterviewForm applications={apps} />
      </Page>,
    );
    expect(clickGoesThrough("Dashboard")).toBe(true);
    await user.selectOptions(screen.getByLabelText(/^Application/), "Birch · Engineer");
    expect(clickGoesThrough("Dashboard")).toBe(false);
  });

  it("has nothing to lose when there are no Applications", () => {
    render(
      <Page>
        <NewInterviewForm applications={[]} />
      </Page>,
    );
    expect(clickGoesThrough("Dashboard")).toBe(true);
  });
});
