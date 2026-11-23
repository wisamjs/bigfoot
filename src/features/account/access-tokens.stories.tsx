import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor } from "storybook/test";
import { createAccessTokenAction, revokeAccessTokenAction } from "@/app/account/actions";
import type { AccessToken } from "@/lib/api";
import { AccessTokens } from "./access-tokens";

// The Account page's Access tokens. Server Actions are mocked (src/app/account/__mocks__/actions.ts)
// and succeed unless a story says otherwise.

const calendar: AccessToken = {
  id: "t1",
  name: "Calendar cron job",
  created_at: "2026-09-02T15:00:00Z",
  last_used_at: "2026-11-22T13:05:00Z",
  expires_at: "2027-09-02T15:00:00Z",
  expired: false,
};
const laptop: AccessToken = {
  id: "t2",
  name: "Laptop script",
  created_at: "2025-10-01T15:00:00Z",
  last_used_at: null,
  expires_at: "2026-10-01T15:00:00Z",
  expired: true,
};

const meta = {
  component: AccessTokens,
  args: { tokens: [calendar, laptop], apiUrl: "https://api.bigfoot.example" },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof AccessTokens>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One in use, one expired. */
export const Default: Story = {};

export const None: Story = { args: { tokens: [] } };

/** Creating one shows its secret, the one time it's shown. */
export const Create: Story = {
  beforeEach: () => {
    mocked(createAccessTokenAction).mockResolvedValue({
      error: null,
      created: { ...calendar, id: "t3", name: "Morning brief", last_used_at: null, token: "bf_live_3kT9xQ2mZ7vR1pL8wN4cY6hJ0sD5aF" },
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Name of a new Access token" }), "Morning brief");
    await userEvent.click(canvas.getByRole("button", { name: "Create Access token" }));
    await expect(await canvas.findByRole("heading", { name: "Copy your Access token now" })).toBeVisible();
  },
};

/** A blank name shows its error beside the field and sends nothing. */
export const NameNeeded: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Create Access token" }));
    await expect(canvas.getByRole("textbox", { name: "Name of a new Access token" })).toHaveAttribute("aria-invalid", "true");
    await expect(createAccessTokenAction).not.toHaveBeenCalled();
  },
};

/** The server refuses: the reason shows under the form. */
export const CreateFails: Story = {
  beforeEach: () => {
    mocked(createAccessTokenAction).mockResolvedValue({
      error: "Couldn’t reach Bigfoot’s server. No token was created. Try again.",
      created: null,
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Name of a new Access token" }), "Morning brief");
    await userEvent.click(canvas.getByRole("button", { name: "Create Access token" }));
    await expect(await canvas.findByText(/No token was created/)).toBeVisible();
  },
};

/** Revoking asks first, with Cancel focused. */
export const Revoke: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Revoke Calendar cron job" }));
    const dialog = await screen.findByRole("dialog", { name: "Revoke Access token" });
    await expect(dialog).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(revokeAccessTokenAction).toHaveBeenCalledWith("t1"));
  },
};

/** Revoking fails: the dialog stays open and says why. */
export const RevokeFails: Story = {
  beforeEach: () => {
    mocked(revokeAccessTokenAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Revoke Calendar cron job" }));
    await screen.findByRole("dialog", { name: "Revoke Access token" });
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await expect(await screen.findByText(/Couldn’t reach Bigfoot’s server/)).toBeVisible();
  },
};

export const LongText: Story = {
  args: {
    tokens: [{ ...calendar, name: "Nightly sync of every Application and Interview into my personal planning spreadsheet" }],
  },
};
