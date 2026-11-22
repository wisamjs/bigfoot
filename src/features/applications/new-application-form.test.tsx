import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/applications/actions";
import { AddApplicationLink } from "./add-links";
import { NewApplicationForm } from "./new-application-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Server Actions are mocked at their module: what the form sends, not how it reaches the API.
vi.mock("@/app/applications/actions", () => ({ createApplicationAction: vi.fn() }));

beforeEach(() => {
  push.mockReset();
  vi.mocked(actions.createApplicationAction).mockReset().mockResolvedValue({ ok: true, id: "new-id" });
});

function openAdd() {
  const user = userEvent.setup();
  render(<NewApplicationForm />);
  return { user, form: screen.getByRole("form", { name: "New Application" }) };
}

describe("Add Application", () => {
  it("is a link from the dashboard to its own page", () => {
    render(<AddApplicationLink />);
    expect(screen.getByRole("link", { name: "Add Application" })).toHaveAttribute("href", "/applications/new");
  });

  it("starts empty with Applied at today, and no Status, Interviews, Delete or Cancel", () => {
    const { form } = openAdd();
    expect(within(form).getByLabelText("Company")).toHaveValue("");
    expect(within(form).getByLabelText("Salary")).toHaveValue("");
    const today = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date());
    expect(within(form).getByRole("button", { name: `Applied, ${today}` })).toBeInTheDocument();
    expect(within(form).queryByLabelText("Status")).not.toBeInTheDocument();
    expect(within(form).queryByRole("button", { name: "Add Interview" })).not.toBeInTheDocument();
    expect(within(form).queryByRole("button", { name: "Delete application" })).not.toBeInTheDocument();
    expect(within(form).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("marks Company, Title and Applied required, once with “* Required”, and gives every typed field an example", () => {
    const { form } = openAdd();
    expect(form).toHaveTextContent("* Required");
    expect(within(form).getAllByText("*", { selector: "div > span" }).map((mark) => mark.previousElementSibling?.textContent)).toEqual([
      "Company",
      "Title",
      "Applied",
    ]);
    expect(within(form).getByLabelText("Company")).toBeRequired();
    expect(within(form).getByLabelText("Location")).not.toBeRequired();
    for (const [label, example] of [
      ["Company", "Northwind Labs"],
      ["Title", "Frontend Engineer"],
      ["Location", "Remote"],
      ["Salary", "$150k–$180k"],
      ["Job posting URL", "https://…"],
    ]) {
      expect(within(form).getByLabelText(label)).toHaveAttribute("placeholder", example);
    }
  });

  it("creates the Application from the details, trimmed, and opens its page", async () => {
    const { user, form } = openAdd();
    await user.type(within(form).getByLabelText("Company"), " Birch ");
    await user.type(within(form).getByLabelText("Title"), "Engineer");
    await user.type(within(form).getByLabelText("Salary"), "$150k");
    await user.click(within(form).getByRole("button", { name: "Add Application" }));

    expect(actions.createApplicationAction).toHaveBeenCalledWith({
      company: "Birch",
      title: "Engineer",
      applied_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      location: null,
      salary: "$150k",
      posting_url: null,
    });
    expect(push).toHaveBeenCalledWith("/applications/new-id?added=1");
  });

  it("sends the applied date picked from the calendar", async () => {
    const { user, form } = openAdd();
    await user.type(within(form).getByLabelText("Company"), "Birch");
    await user.type(within(form).getByLabelText("Title"), "Engineer");
    await user.click(within(form).getByRole("button", { name: /^Applied, / }));
    const now = new Date();
    const firstDay = new Intl.DateTimeFormat("en-CA", { dateStyle: "full" }).format(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    await user.click(within(screen.getByRole("grid")).getByRole("button", { name: new RegExp(firstDay) }));
    await user.click(within(form).getByRole("button", { name: "Add Application" }));

    const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    expect(actions.createApplicationAction).toHaveBeenCalledWith(expect.objectContaining({ applied_on: first }));
  });

  it("stays on the page and shows why adding failed", async () => {
    vi.mocked(actions.createApplicationAction).mockResolvedValue({ ok: false, error: "Company is required" });
    const { user, form } = openAdd();
    await user.type(within(form).getByLabelText("Company"), "Birch");
    await user.type(within(form).getByLabelText("Title"), "Engineer");
    await user.click(within(form).getByRole("button", { name: "Add Application" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Company is required");
    expect(push).not.toHaveBeenCalled();
  });
});
