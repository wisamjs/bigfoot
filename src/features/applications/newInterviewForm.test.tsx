import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import type { Application } from "@/lib/applications";
import { application } from "@/test/applications";
import { AddInterviewLink } from "./addLinks";
import { NewInterviewForm } from "./newInterviewForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Server Actions are mocked at their module: what the form sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({ createInterviewAction: vi.fn() }));

beforeEach(() => {
  push.mockReset();
  vi.mocked(actions.createInterviewAction).mockReset().mockResolvedValue({ ok: true });
});

const oak = application("oak", { company: "Oak", title: "Engineer" });
const birch = application("birch", { company: "Birch", title: "Designer" });
const cedar = application("cedar", { company: "Cedar", title: "Manager", status: "done", outcome: "rejected" });

function openAdd(applications: Application[] = [oak, birch, cedar], applicationId?: string) {
  const user = userEvent.setup();
  render(<NewInterviewForm applications={applications} applicationId={applicationId} />);
  return { user, form: screen.queryByRole("form", { name: "New Interview" }) };
}

/** Picks the 15th of the shown month, and types a time when one is given. */
async function pickDate(user: ReturnType<typeof userEvent.setup>, form: HTMLElement, time?: string) {
  await user.click(within(form).getByRole("button", { name: /^Date, / }));
  await user.click(within(screen.getByRole("grid")).getByText("15"));
  if (time) await user.type(within(form).getByLabelText("Time"), time);
}

describe("Add Interview", () => {
  it("is a link from the dashboard to its own page", () => {
    render(<AddInterviewLink />);
    expect(screen.getByRole("link", { name: "Add Interview" })).toHaveAttribute("href", "/interviews/new");
  });

  it("offers each Application as “company · role”, In Progress ones first, then Done ones under their own heading", () => {
    const { form } = openAdd();
    const picker = within(form!).getByLabelText("Application");
    const groups = within(picker).getAllByRole("group");
    expect(groups.map((group) => group.getAttribute("label"))).toEqual(["In Progress", "Done"]);
    expect(within(groups[0]).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Birch · Designer",
      "Oak · Engineer",
    ]);
    expect(within(groups[1]).getAllByRole("option").map((option) => option.textContent)).toEqual(["Cedar · Manager"]);
    expect(picker).toHaveValue("");
  });

  it("starts with the Application it was opened for chosen", () => {
    const { form } = openAdd(undefined, "oak");
    expect(within(form!).getByLabelText("Application")).toHaveValue("oak");
  });

  it("marks Application, Kind and Date and time required, and starts with no time", () => {
    const { form } = openAdd();
    expect(form).toHaveTextContent("* Required");
    expect(within(form!).getByLabelText("Application")).toBeRequired();
    expect(within(form!).getByRole("group", { name: "Date and time" })).toBeInTheDocument();
    expect(within(form!).getByLabelText("Time")).toHaveValue("");
    expect(within(form!).getByLabelText("Interview notes")).not.toBeRequired();
    expect(within(form!).getByLabelText("Interview notes")).toHaveAttribute("placeholder", expect.stringMatching(/\w/));
  });

  it("shows each missing field's error beside it, focuses the first, and saves nothing", async () => {
    const { user, form } = openAdd();
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));

    const picker = within(form!).getByLabelText("Application");
    expect(picker).toBeInvalid();
    expect(picker).toHaveAccessibleDescription("Choose the Application this Interview belongs to.");
    expect(picker).toHaveFocus();
    const date = within(form!).getByRole("button", { name: /^Date, / });
    expect(date).toHaveAttribute("aria-invalid", "true");
    expect(date).toHaveAccessibleDescription("Pick the date and enter the time.");
    expect(within(form!).getByRole("alert")).toHaveTextContent("Choose the Application");
    expect(actions.createInterviewAction).not.toHaveBeenCalled();
  });

  it("asks for the time when only a date is picked", async () => {
    const { user, form } = openAdd(undefined, "oak");
    await pickDate(user, form!);
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));

    const time = within(form!).getByLabelText("Time");
    expect(time).toBeInvalid();
    expect(time).toHaveAccessibleDescription("Enter the time.");
    expect(time).toHaveFocus();
    expect(within(form!).getByRole("button", { name: /^Date, / })).not.toHaveAttribute("aria-invalid");
    expect(actions.createInterviewAction).not.toHaveBeenCalled();
  });

  it("adds the Interview to the chosen Application, then goes back to the dashboard", async () => {
    const { user, form } = openAdd();
    await user.selectOptions(within(form!).getByLabelText("Application"), "cedar");
    await user.selectOptions(within(form!).getByLabelText("Kind"), "technical");
    await pickDate(user, form!, "14:30");
    await user.type(within(form!).getByLabelText("Interview notes"), "  Went well  ");
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));

    const now = new Date();
    expect(actions.createInterviewAction).toHaveBeenCalledWith("cedar", {
      kind: "technical",
      at: new Date(now.getFullYear(), now.getMonth(), 15, 14, 30).toISOString(),
      notes: "Went well",
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("stays on the page and shows why adding failed", async () => {
    vi.mocked(actions.createInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server." });
    const { user, form } = openAdd(undefined, "oak");
    await pickDate(user, form!, "09:00");
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t reach Bigfoot’s server.");
    expect(push).not.toHaveBeenCalled();
  });

  it("explains that an Interview needs an Application, and links to Add Application, when there are none", () => {
    const { form } = openAdd([]);
    expect(form).toBeNull();
    expect(screen.getByText(/An Interview belongs to an Application/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add Application" })).toHaveAttribute("href", "/applications/new");
  });
});
