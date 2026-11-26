import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  changePasscodeAction,
  createShareLinkAction,
  renewShareLinkAction,
  stopSharingAction,
} from "@/app/account/actions";
import type { ShareLink } from "@/lib/api";
import { INJECTED_ELEMENTS, XSS_TEXT } from "@/test/xss";
import { ShareLinks } from "./share-links";

vi.mock("@/app/account/actions", () => ({
  createShareLinkAction: vi.fn(),
  renewShareLinkAction: vi.fn(),
  changePasscodeAction: vi.fn(),
  stopSharingAction: vi.fn(),
}));

const NOW = new Date("2026-11-25T14:00:00");
const DAY = 24 * 60 * 60 * 1000;
const at = (offset: number) => new Date(NOW.getTime() + offset).toISOString();

function link(overrides: Partial<ShareLink> = {}): ShareLink {
  return {
    id: "k7Qm2x9PaB",
    label: "Mom & Dad",
    created_at: at(-4 * DAY),
    passcode_set_at: at(-4 * DAY),
    expires_at: at(3 * DAY),
    last_opened_at: null,
    expired: false,
    ...overrides,
  };
}

const created = { ...link({ created_at: at(0), passcode_set_at: at(0), expires_at: at(7 * DAY) }), passcode: "maple-river-42" };

async function fillAndCreate(label = "Mom & Dad", passcode = "maple-river-42") {
  await userEvent.type(screen.getByRole("textbox", { name: "Who it’s for" }), label);
  await userEvent.type(screen.getByLabelText("Passcode"), passcode);
  await userEvent.click(screen.getByRole("button", { name: "Create link" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  vi.mocked(createShareLinkAction).mockResolvedValue({ error: null, created });
  vi.mocked(renewShareLinkAction).mockImplementation(async (id) => ({ ok: true, link: link({ id }) }));
  vi.mocked(changePasscodeAction).mockImplementation(async (id, passcode) => ({ ok: true, link: { ...link({ id }), passcode } }));
  vi.mocked(stopSharingAction).mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ShareLinks", () => {
  it("with no links, says what a Viewer sees and what stays private, and offers the first link", () => {
    render(<ShareLinks links={[]} />);
    expect(screen.getByRole("heading", { name: "They’ll see" })).toBeVisible();
    expect(screen.getByText("Interview dates and times in their own time zone")).toBeVisible();
    expect(screen.getByText("Applications that ended without an Offer")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Create your first link" })).toBeVisible();
    expect(screen.getByText("Only you see this, so you can tell links apart.")).toBeVisible();
    expect(screen.getByLabelText("Passcode")).toHaveAttribute("type", "password");
  });

  it("lists each link with its dates, when it was opened and when it expires", () => {
    render(
      <ShareLinks
        links={[link({ last_opened_at: at(-6 * 60 * 60 * 1000) }), link({ id: "Hw3tB8rLzQ", label: "Uncle Sami" })]}
      />,
    );
    expect(screen.getByText(/^2 people can follow along\./)).toBeVisible();
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByRole("heading", { name: "Mom & Dad" })).toBeVisible();
    expect(within(first).getByText(/^Created .* · Passcode set /)).toBeVisible();
    expect(within(first).getByText(/^Viewed today, /)).toBeVisible();
    expect(within(first).getByText("Expires in 3 days")).toBeVisible();
    expect(within(second).getByText("Not opened yet")).toBeVisible();
    expect(within(second).getByRole("textbox", { name: "Link for Uncle Sami" })).toHaveValue(
      `${window.location.origin}/journey/Hw3tB8rLzQ`,
    );
    expect(screen.queryByRole("heading", { name: "They’ll see" })).not.toBeInTheDocument();
  });

  it("shows the time a link stops on its last day, in the warning colour", () => {
    render(<ShareLinks links={[link({ expires_at: at(2 * 60 * 60 * 1000) })]} />);
    expect(screen.getByText(/^Expires today, /)).toHaveClass("text-fg-warning");
  });

  it("mutes an expired link and keeps Copy link, Renew and Stop sharing", () => {
    render(<ShareLinks links={[link({ expires_at: at(-2 * DAY), expired: true })]} />);
    expect(screen.getByText(/^Expired /)).toBeVisible();
    expect(screen.getByRole("listitem")).toHaveClass("border-dashed");
    expect(screen.getByText(/no one can follow along right now/)).toBeVisible();
    for (const name of ["Copy link: Link for Mom & Dad", "Renew the link for Mom & Dad", "Stop sharing with Mom & Dad"]) {
      expect(screen.getByRole("button", { name })).toBeVisible();
    }
  });

  it("at 10 links, says so instead of offering another", () => {
    const links = Array.from({ length: 10 }, (_, n) => link({ id: `link${String(n).padStart(6, "0")}`, label: `Cousin ${n}` }));
    render(<ShareLinks links={links} />);
    expect(screen.getByText("You can share with up to 10 people. Stop sharing one to add another.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Share with someone else" })).not.toBeInTheDocument();
  });

  it("opens the form for someone else under the links", async () => {
    render(<ShareLinks links={[link()]} />);
    const add = screen.getByRole("button", { name: "Share with someone else" });
    expect(add).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("textbox", { name: "Who it’s for" })).not.toBeInTheDocument();
    await userEvent.click(add);
    expect(add).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: "Who it’s for" })).toBeVisible();
  });

  it("creates a link and shows it with its Passcode, once, until Done", async () => {
    render(<ShareLinks links={[]} />);
    await fillAndCreate();

    const form = vi.mocked(createShareLinkAction).mock.calls[0][1];
    expect(form.get("label")).toBe("Mom & Dad");
    expect(form.get("passcode")).toBe("maple-river-42");
    const dialog = await screen.findByRole("dialog", { name: "Link ready for Mom & Dad" });
    expect(within(dialog).getByRole("textbox", { name: "Link" })).toHaveValue(`${window.location.origin}/journey/k7Qm2x9PaB`);
    expect(within(dialog).getByRole("textbox", { name: "Passcode" })).toHaveValue("maple-river-42");
    expect(within(dialog).getByText("You’ll only see this passcode now.")).toBeVisible();

    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body).not.toHaveTextContent("maple-river-42");
  });

  it("copies the link and the Passcode from the Link ready dialog", async () => {
    const user = userEvent.setup();
    render(<ShareLinks links={[]} />);
    await user.type(screen.getByRole("textbox", { name: "Who it’s for" }), "Mom & Dad");
    await user.type(screen.getByLabelText("Passcode"), "maple-river-42");
    await user.click(screen.getByRole("button", { name: "Create link" }));
    const dialog = await screen.findByRole("dialog", { name: "Link ready for Mom & Dad" });

    await user.click(within(dialog).getByRole("button", { name: "Copy: Passcode" }));
    expect(await navigator.clipboard.readText()).toBe("maple-river-42");
    expect(within(dialog).getByRole("button", { name: "Copied: Passcode" })).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Copy link: Link" }));
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/journey/k7Qm2x9PaB`);
  });

  it("checks both fields before sending, and focuses the first problem", async () => {
    render(<ShareLinks links={[]} />);
    await userEvent.type(screen.getByLabelText("Passcode"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create link" }));

    const label = screen.getByRole("textbox", { name: "Who it’s for" });
    expect(label).toHaveAttribute("aria-invalid", "true");
    expect(label).toHaveFocus();
    expect(screen.getByText("Say who the link is for.")).toBeVisible();
    expect(screen.getByText("Use at least 8 characters.")).toBeVisible();
    expect(createShareLinkAction).not.toHaveBeenCalled();

    await userEvent.type(label, "Mom");
    expect(label).not.toHaveAttribute("aria-invalid");
  });

  it("shows the Server Action's field errors and other errors", async () => {
    vi.mocked(createShareLinkAction).mockResolvedValue({
      error: "You can share with up to 10 people. Stop sharing one to add another.",
      passcodeError: "Use only characters you can see.",
      created: null,
    });
    render(<ShareLinks links={[]} />);
    await fillAndCreate();
    expect(await screen.findByRole("alert")).toHaveTextContent("You can share with up to 10 people.");
    expect(screen.getByLabelText("Passcode")).toHaveAttribute("aria-invalid", "true");
  });

  it("suggests a Passcode and shows it", async () => {
    render(<ShareLinks links={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Suggest" }));
    const input = screen.getByLabelText("Passcode");
    expect((input as HTMLInputElement).value).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d\d$/);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveFocus();
  });

  it("renews a link and announces it", async () => {
    render(<ShareLinks links={[link({ expired: true, expires_at: at(-DAY) })]} />);
    await userEvent.click(screen.getByRole("button", { name: "Renew the link for Mom & Dad" }));
    expect(renewShareLinkAction).toHaveBeenCalledWith("k7Qm2x9PaB");
    expect(await screen.findByRole("status")).toHaveTextContent("Renewed the link for Mom & Dad.");
  });

  it("says why renewing failed", async () => {
    vi.mocked(renewShareLinkAction).mockResolvedValue({ ok: false, error: "The link was not renewed." });
    render(<ShareLinks links={[link()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Renew the link for Mom & Dad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The link was not renewed.");
  });

  it("changes the Passcode and shows the new one once", async () => {
    render(<ShareLinks links={[link()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Change passcode for Mom & Dad" }));
    const dialog = await screen.findByRole("dialog", { name: "Change passcode for Mom & Dad" });

    await userEvent.click(within(dialog).getByRole("button", { name: "Save passcode" }));
    expect(within(dialog).getByText("Choose a passcode, or press Suggest.")).toBeVisible();
    expect(changePasscodeAction).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText("New passcode"), "otter-lake-77");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save passcode" }));
    expect(changePasscodeAction).toHaveBeenCalledWith("k7Qm2x9PaB", "otter-lake-77");
    const shown = await screen.findByRole("dialog", { name: "New passcode for Mom & Dad" });
    expect(within(shown).getByRole("textbox", { name: "Passcode" })).toHaveValue("otter-lake-77");

    await userEvent.click(within(shown).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the Change passcode dialog open and says why when saving fails", async () => {
    vi.mocked(changePasscodeAction).mockResolvedValue({ ok: false, error: "The passcode was not changed." });
    render(<ShareLinks links={[link()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Change passcode for Mom & Dad" }));
    const dialog = await screen.findByRole("dialog", { name: "Change passcode for Mom & Dad" });
    await userEvent.type(within(dialog).getByLabelText("New passcode"), "otter-lake-77");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save passcode" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("The passcode was not changed.");

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("asks before stopping sharing, with Cancel focused, then stops it", async () => {
    render(<ShareLinks links={[link()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Stop sharing with Mom & Dad" }));
    const dialog = await screen.findByRole("dialog", { name: "Stop sharing with Mom & Dad?" });
    expect(within(dialog).getByText("The link stops working straight away. You can’t undo this.")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await userEvent.click(within(dialog).getByRole("button", { name: "Stop sharing" }));
    expect(stopSharingAction).toHaveBeenCalledWith("k7Qm2x9PaB");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Stopped sharing with Mom & Dad.");
  });

  it("keeps the Stop sharing dialog open and says why when stopping fails", async () => {
    vi.mocked(stopSharingAction).mockResolvedValue({ ok: false, error: "The link still works." });
    render(<ShareLinks links={[link()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Stop sharing with Mom & Dad" }));
    const dialog = await screen.findByRole("dialog", { name: "Stop sharing with Mom & Dad?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Stop sharing" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("The link still works.");
  });

  it.each(XSS_TEXT)("%j is sent as typed and shows as text on the card and in every dialog", async (payload) => {
    vi.mocked(createShareLinkAction).mockResolvedValue({ error: null, created: { ...created, label: payload } });
    render(<ShareLinks links={[link({ label: payload })]} />);
    await userEvent.click(screen.getByRole("button", { name: "Share with someone else" }));
    await userEvent.click(screen.getByRole("textbox", { name: "Who it’s for" }));
    await userEvent.paste(payload);
    await userEvent.type(screen.getByLabelText("Passcode"), "maple-river-42");
    await userEvent.click(screen.getByRole("button", { name: "Create link" }));

    expect(vi.mocked(createShareLinkAction).mock.calls[0][1].get("label")).toBe(payload);
    await screen.findByRole("dialog");
    // eslint-disable-next-line testing-library/no-node-access -- injected tags have no role or text to query by.
    expect(document.body.querySelectorAll(INJECTED_ELEMENTS)).toHaveLength(0);
  });
});
