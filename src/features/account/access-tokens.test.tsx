import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAccessTokenAction, revokeAccessTokenAction } from "@/app/account/actions";
import type { AccessToken } from "@/lib/api";
import { INJECTED_ELEMENTS, XSS_TEXT } from "@/test/xss";
import { AccessTokens } from "./access-tokens";

vi.mock("@/app/account/actions", () => ({ createAccessTokenAction: vi.fn(), revokeAccessTokenAction: vi.fn() }));

const SECRET = "bigfoot_3q2-7wQx0yJm5kV9nRb8sT1uZc4dEfGhIjKlMnOpQr";
const API = "https://api.example.com";

function token(overrides: Partial<AccessToken> = {}): AccessToken {
  return {
    id: "t1",
    name: "Calendar cron job",
    created_at: "2026-11-16T12:00:00Z",
    last_used_at: null,
    expires_at: "2027-11-16T12:00:00Z",
    expired: false,
    ...overrides,
  };
}

async function createToken(name = "Laptop script") {
  await userEvent.type(screen.getByLabelText("Name of a new Access token"), name);
  await userEvent.click(screen.getByRole("button", { name: "Create Access token" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createAccessTokenAction).mockResolvedValue({
    error: null,
    created: { ...token({ id: "t2", name: "Laptop script" }), token: SECRET },
  });
  vi.mocked(revokeAccessTokenAction).mockResolvedValue({ ok: true });
});

describe("AccessTokens", () => {
  it("says so when the job seeker has none", () => {
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    expect(screen.getByText("You have no Access tokens.")).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  /** The value a token's list item gives for `label` (its <dd> beside that <dt>). */
  function fact(item: HTMLElement, label: string) {
    const terms = within(item).getAllByRole("term");
    return within(item).getAllByRole("definition")[terms.findIndex((term) => term.textContent === label)];
  }

  it("lists each token's name, created date, last use and expiry, and never a secret", () => {
    render(
      <AccessTokens
        tokens={[token(), token({ id: "t3", name: "Old laptop", last_used_at: "2026-11-17T09:30:00Z" })]}
        apiUrl={API}
      />,
    );
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByText("Calendar cron job")).toBeVisible();
    expect(fact(first, "Created")).toHaveTextContent("2026");
    expect(fact(first, "Last used")).toHaveTextContent("Never");
    expect(fact(first, "Expires")).toHaveTextContent("2027");
    expect(fact(second, "Last used")).toHaveTextContent("2026");
    expect(document.body).not.toHaveTextContent("bigfoot_");
  });

  it("marks an expired token", () => {
    render(<AccessTokens tokens={[token({ expired: true, expires_at: "2025-11-16T12:00:00Z" })]} apiUrl={API} />);
    const item = screen.getByRole("listitem");
    expect(within(item).getAllByText("Expired")).toHaveLength(2); // the badge and the date's label
    expect(within(item).queryByText("Expires")).not.toBeInTheDocument();
  });

  it("creates a token from its name and shows the secret, with how to use it", async () => {
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    await createToken();

    const form = vi.mocked(createAccessTokenAction).mock.calls[0][1];
    expect(form.get("name")).toBe("Laptop script");
    const announcement = screen.getByRole("status");
    // The Server Action's result commits in a transition, after the click has resolved.
    expect(await within(announcement).findByRole("heading", { name: "Copy your Access token now" })).toBeVisible();
    expect(within(announcement).getByText(SECRET)).toBeVisible();
    expect(announcement).toHaveTextContent(`curl -H "Authorization: Bearer $BIGFOOT_TOKEN" ${API}/applications`);
  });

  it("requires a name of at most 100 characters", () => {
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    const input = screen.getByLabelText("Name of a new Access token");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("maxlength", "100");
  });

  it("copies the secret to the clipboard", async () => {
    const user = userEvent.setup();
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    await user.type(screen.getByLabelText("Name of a new Access token"), "Laptop script");
    await user.click(screen.getByRole("button", { name: "Create Access token" }));

    await user.click(await screen.findByRole("button", { name: "Copy" }));

    expect(await navigator.clipboard.readText()).toBe(SECRET);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeVisible();
  });

  it("stops showing the secret once the job seeker has copied it", async () => {
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    await createToken();
    await userEvent.click(await screen.findByRole("button", { name: "I’ve copied it" }));
    await waitFor(() => expect(screen.queryByText(SECRET)).not.toBeInTheDocument());
  });

  it("shows why a token couldn't be created", async () => {
    vi.mocked(createAccessTokenAction).mockResolvedValue({ error: "Name must not be blank", created: null });
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    await createToken();
    expect(await screen.findByRole("alert")).toHaveTextContent("Name must not be blank");
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
  });

  it("revokes a token only after confirming", async () => {
    render(<AccessTokens tokens={[token()]} apiUrl={API} />);
    await userEvent.click(screen.getByRole("button", { name: "Revoke Calendar cron job" }));

    const dialog = await screen.findByRole("dialog", { name: "Revoke Access token" });
    expect(dialog).toHaveTextContent("Calendar cron job will stop working straight away");
    expect(revokeAccessTokenAction).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));
    expect(revokeAccessTokenAction).toHaveBeenCalledWith("t1");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the token when the job seeker cancels", async () => {
    render(<AccessTokens tokens={[token()]} apiUrl={API} />);
    await userEvent.click(screen.getByRole("button", { name: "Revoke Calendar cron job" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(revokeAccessTokenAction).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the dialog open and says why when revoking fails", async () => {
    vi.mocked(revokeAccessTokenAction).mockResolvedValue({ ok: false, error: "The token was not revoked." });
    render(<AccessTokens tokens={[token()]} apiUrl={API} />);
    await userEvent.click(screen.getByRole("button", { name: "Revoke Calendar cron job" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Revoke" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("The token was not revoked.");
  });

  it("stops showing a new token's secret when that token is revoked", async () => {
    render(<AccessTokens tokens={[token({ id: "t2", name: "Laptop script" })]} apiUrl={API} />);
    await createToken();
    expect(await screen.findByText(SECRET)).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Revoke Laptop script" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Revoke" }));

    await waitFor(() => expect(screen.queryByText(SECRET)).not.toBeInTheDocument());
  });
});

describe("the new token's name", () => {
  const field = () => screen.getByLabelText("Name of a new Access token");
  const submit = () => userEvent.click(screen.getByRole("button", { name: "Create Access token" }));

  it("is needed: a blank name shows its error beside the field, announced, and sends nothing", async () => {
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    await userEvent.type(field(), "   ");
    await submit();

    expect(field()).toBeInvalid();
    expect(field()).toHaveFocus();
    expect(field()).toHaveAccessibleDescription(expect.stringContaining("Enter the name."));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter the name.");
    expect(createAccessTokenAction).not.toHaveBeenCalled();

    await userEvent.type(field(), "Laptop script");
    expect(field()).toBeValid();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("can't hide its text behind characters that reorder it", async () => {
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    await userEvent.click(field());
    await userEvent.paste("invoice\u202efdp.exe");
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Use only characters you can see in the name.");
    expect(createAccessTokenAction).not.toHaveBeenCalled();
  });

  it("shows the Server Action's own check beside the field, until the name changes", async () => {
    vi.mocked(createAccessTokenAction).mockResolvedValue({ error: null, nameError: "Enter the name.", created: null });
    render(<AccessTokens tokens={[]} apiUrl={API} />);
    await createToken();
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter the name.");
    expect(field()).toBeInvalid();

    await userEvent.type(field(), "!");
    expect(field()).toBeValid();
  });

  it.each(XSS_TEXT)("%j is sent as typed and shows as text in the list, the new token and Revoke", async (payload) => {
    vi.mocked(createAccessTokenAction).mockResolvedValue({
      error: null,
      created: { ...token({ id: "t2", name: payload }), token: SECRET },
    });
    render(<AccessTokens tokens={[token({ name: payload })]} apiUrl={API} />);
    await userEvent.click(field());
    await userEvent.paste(payload);
    await submit();

    const sent = vi.mocked(createAccessTokenAction).mock.calls[0][1];
    expect(sent.get("name")).toBe(payload);
    await waitFor(() => expect(screen.getAllByText(payload, { exact: false }).length).toBeGreaterThan(1));
    await userEvent.click(screen.getByRole("button", { name: `Revoke ${payload}` }));
    expect(within(await screen.findByRole("dialog")).getByText(payload)).toBeVisible();
    // eslint-disable-next-line testing-library/no-node-access -- injected tags have no role or text to query by.
    expect(document.body.querySelectorAll(INJECTED_ELEMENTS)).toHaveLength(0);
  });
});
