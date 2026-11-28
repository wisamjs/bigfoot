import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import type { Application } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { typeRich } from "@/test/rich-text";
import { AddInterviewLink } from "./add-links";
import { NewInterviewForm } from "./new-interview-form";

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

/** Fills in the first Participant row: a role, and a name when one is given. */
async function meet(user: ReturnType<typeof userEvent.setup>, form: HTMLElement, role = "Recruiter", name?: string) {
  await user.type(within(form).getAllByLabelText("Role")[0], role);
  if (name) await user.type(within(form).getAllByLabelText(/^Name/)[0], name);
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

  it("marks Application, Category, Title and Date and time required, and starts with no time", async () => {
    const { form } = openAdd();
    expect(form).toHaveTextContent("* Required");
    expect(within(form!).getByLabelText("Application")).toBeRequired();
    expect(within(form!).getByLabelText("Category")).toBeRequired();
    expect(within(form!).getByLabelText("Category")).toHaveValue("recruiter");
    expect(within(form!).getByLabelText("Title")).toBeRequired();
    expect(within(form!).getByLabelText("Title")).toHaveValue("Recruiter");
    expect(within(form!).getByRole("group", { name: "Date and time" })).toBeInTheDocument();
    expect(within(form!).getByLabelText("Time")).toHaveValue("");
    const howItWent = within(form!).getByRole("textbox", { name: "How it went" });
    expect(howItWent).not.toBeRequired();
    // The editor's placeholder sits on its empty first paragraph.
    await waitFor(() => expect(within(howItWent).getByText("", { selector: "p" })).toHaveAttribute("data-placeholder", expect.stringMatching(/\w/)));
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

  it("opened from an Application page, adds the Interview and goes back to that Application page", async () => {
    const { user, form } = openAdd(undefined, "oak");
    await pickDate(user, form!, "09:00");
    await meet(user, form!);
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    expect(actions.createInterviewAction).toHaveBeenCalledWith("oak", expect.objectContaining({ category: "recruiter", title: "Recruiter" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/applications/oak");
  });

  it("opened from the dashboard, adds the Interview to the chosen Application, then goes back to the dashboard", async () => {
    const { user, form } = openAdd();
    await user.selectOptions(within(form!).getByLabelText("Application"), "cedar");
    await user.selectOptions(within(form!).getByLabelText("Category"), "technical");
    // The title follows the category until it's edited.
    expect(within(form!).getByLabelText("Title")).toHaveValue("Technical");
    await pickDate(user, form!, "14:30");
    await typeRich(within(form!).getByRole("textbox", { name: "How it went" }), "  Went well  ");
    await meet(user, form!, " Staff Engineer ", " Sam ");
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));

    const now = new Date();
    expect(actions.createInterviewAction).toHaveBeenCalledWith("cedar", {
      category: "technical",
      title: "Technical",
      at: new Date(now.getFullYear(), now.getMonth(), 15, 14, 30).toISOString(),
      how_it_went: "Went well",
      participants: [{ role: "Staff Engineer", name: "Sam" }],
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps a title the job seeker wrote when the category changes, and sends it trimmed", async () => {
    const { user, form } = openAdd(undefined, "oak");
    const title = within(form!).getByLabelText("Title");
    await user.clear(title);
    await user.type(title, " Retrospective System Design ");
    await user.selectOptions(within(form!).getByLabelText("Category"), "system_design");
    expect(title).toHaveValue(" Retrospective System Design ");
    await pickDate(user, form!, "09:00");
    await meet(user, form!);
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    expect(actions.createInterviewAction).toHaveBeenCalledWith(
      "oak",
      expect.objectContaining({ category: "system_design", title: "Retrospective System Design" }),
    );
  });

  it("refuses an empty title, beside the field, and saves nothing", async () => {
    const { user, form } = openAdd(undefined, "oak");
    await user.clear(within(form!).getByLabelText("Title"));
    await pickDate(user, form!, "09:00");
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    const title = within(form!).getByLabelText("Title");
    expect(title).toBeInvalid();
    expect(title).toHaveAccessibleDescription("Enter the title.");
    expect(title).toHaveFocus();
    expect(actions.createInterviewAction).not.toHaveBeenCalled();
  });

  it("stays on the page and shows why adding failed", async () => {
    vi.mocked(actions.createInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server." });
    const { user, form } = openAdd(undefined, "oak");
    await pickDate(user, form!, "09:00");
    await meet(user, form!);
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t reach Bigfoot’s server.");
    expect(push).not.toHaveBeenCalled();
  });

  it("needs someone the job seeker is meeting, and marks the row missing a role", async () => {
    const { user, form } = openAdd(undefined, "oak");
    await pickDate(user, form!, "09:00");
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    const add = within(form!).getByRole("group", { name: "Who you’re meeting" });
    expect(add).toHaveAccessibleDescription("Add at least one person you’re meeting.");
    expect(within(form!).getByLabelText("Role")).toHaveFocus();

    await user.type(within(form!).getAllByLabelText(/^Name/)[0], "Dana");
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    const role = within(form!).getByLabelText("Role");
    expect(role).toBeInvalid();
    expect(role).toHaveAccessibleDescription("Enter each person’s role.");
    expect(role).toHaveFocus();
    expect(actions.createInterviewAction).not.toHaveBeenCalled();
  });

  it("offers the Application's people already met, and adds someone new beside them", async () => {
    const dana = { id: "p1", role: "Recruiter", name: "Dana Lee" };
    const met = application("oak", { company: "Oak", interviews: [interview("i1", { application_id: "oak", participants: [dana] })] });
    const { user, form } = openAdd([met, birch], "oak");
    await user.click(within(form!).getByRole("button", { name: "Remove person 1" }));
    await user.selectOptions(within(form!).getByLabelText("Add someone you’ve met"), "p1");
    expect(within(form!).getByLabelText("Role")).toHaveValue("Recruiter");
    expect(form).toHaveTextContent("Changing someone you’ve met before changes them on every Interview they’re in.");
    // Everyone met is in, so nobody else is offered.
    expect(within(form!).queryByLabelText("Add someone you’ve met")).not.toBeInTheDocument();
    await user.click(within(form!).getByRole("button", { name: "Add someone" }));
    expect(within(form!).getAllByLabelText("Role")[1]).toHaveFocus();
    await user.keyboard("EM");
    await pickDate(user, form!, "09:00");
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    expect(actions.createInterviewAction).toHaveBeenCalledWith(
      "oak",
      expect.objectContaining({ participants: [dana, { role: "EM", name: null }] }),
    );
  });

  it("keeps the people typed when the Application changes, as someone new", async () => {
    const dana = { id: "p1", role: "Recruiter", name: "Dana Lee" };
    const met = application("oak", { company: "Oak", interviews: [interview("i1", { application_id: "oak", participants: [dana] })] });
    const { user, form } = openAdd([met, birch], "oak");
    await user.click(within(form!).getByRole("button", { name: "Remove person 1" }));
    await user.selectOptions(within(form!).getByLabelText("Add someone you’ve met"), "p1");
    await user.selectOptions(within(form!).getByLabelText("Application"), "birch");
    await pickDate(user, form!, "09:00");
    await user.click(within(form!).getByRole("button", { name: "Add Interview" }));
    expect(actions.createInterviewAction).toHaveBeenCalledWith(
      "birch",
      expect.objectContaining({ participants: [{ role: "Recruiter", name: "Dana Lee" }] }),
    );
  });

  it("explains that an Interview needs an Application, and links to Add Application, when there are none", () => {
    const { form } = openAdd([]);
    expect(form).toBeNull();
    expect(screen.getByText(/An Interview belongs to an Application/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add Application" })).toHaveAttribute("href", "/applications/new");
  });
});
