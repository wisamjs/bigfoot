import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, spyOn, waitFor, within } from "storybook/test";
import {
  changePasscodeAction,
  createShareLinkAction,
  renewShareLinkAction,
  stopSharingAction,
} from "@/app/account/actions";
import type { ShareLink } from "@/lib/api";
import { ShareLinks } from "./share-links";

// The Account page's Share your progress card. Server Actions are mocked
// (src/app/account/__mocks__/actions.ts) and succeed unless a story says otherwise. Dates are
// relative to now, so "Expires in 3 days" and "Viewed today" read the same on any day.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (offset: number) => new Date(Date.now() + offset).toISOString();
/** A time later today: `share` of the way from now to midnight. */
const untilMidnight = (share: number) => {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return at((midnight.getTime() - Date.now()) * share);
};
/** Today at `hour`:`minute` in the viewer's time zone. */
function today(hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const momAndDad: ShareLink = {
  id: "k7Qm2x9PaB",
  label: "Mom & Dad",
  created_at: at(-4 * DAY),
  passcode_set_at: at(-4 * DAY),
  expires_at: at(3 * DAY),
  last_opened_at: today(0, 12),
  expired: false,
};
const uncleSami: ShareLink = {
  id: "Hw3tB8rLzQ",
  label: "Uncle Sami",
  created_at: at(-1 * DAY),
  passcode_set_at: at(-1 * DAY),
  expires_at: at(6 * DAY),
  last_opened_at: null,
  expired: false,
};

const meta = {
  component: ShareLinks,
  args: { links: [momAndDad, uncleSami], firstName: "Wisam" },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof ShareLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No links yet: what a Viewer sees and what stays private, then the first link's form. */
export const NoLinks: Story = { args: { links: [] } };

/** Two people can follow along: one has opened the link today, one hasn't yet. */
export const LinksActive: Story = {};

/** On its last day, the expiry is in the warning colour, with the time it stops. */
export const ExpiresToday: Story = {
  // Halfway between now and midnight, so it is still today however late the story runs.
  args: { links: [{ ...momAndDad, expires_at: untilMidnight(0.5) }] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Expires today, /)).toBeVisible();
  },
};

/** An expired link is muted and keeps Copy link, Renew and Stop sharing. */
export const Expired: Story = {
  args: { links: [{ ...uncleSami, expires_at: at(-2 * DAY), expired: true }, momAndDad] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Expired /)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Renew the link for Uncle Sami" })).toBeEnabled();
  },
};

/** Every link expired: no one can follow along until one is renewed. */
export const AllExpired: Story = {
  args: { links: [{ ...momAndDad, expires_at: at(-1 * DAY), expired: true }] },
};

/** At 10 links, "Share with someone else" gives way to the limit. */
export const AtTheLimit: Story = {
  args: {
    links: Array.from({ length: 10 }, (_, n) => ({ ...uncleSami, id: `link${String(n).padStart(6, "0")}`, label: `Cousin ${n + 1}` })),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("You can share with up to 10 people. Stop sharing one to add another.")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Share with someone else" })).not.toBeInTheDocument();
  },
};

/** Creating the first link opens the Link ready dialog, the one time its Passcode is shown. */
export const Create: Story = {
  args: { links: [] },
  beforeEach: () => {
    mocked(createShareLinkAction).mockResolvedValue({
      error: null,
      created: { ...momAndDad, created_at: at(0), passcode_set_at: at(0), expires_at: at(7 * DAY), last_opened_at: null, passcode: "maple-river-otter-42" },
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Who it’s for" }), "Mom & Dad");
    await userEvent.click(canvas.getByRole("button", { name: "Suggest" }));
    await expect((canvas.getByLabelText("Passcode") as HTMLInputElement).value).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d\d$/);
    await userEvent.click(canvas.getByRole("button", { name: "Create link" }));
    await waitFor(() => expect(createShareLinkAction).toHaveBeenCalled());
    const dialog = await screen.findByRole("dialog", { name: "Link ready for Mom & Dad" });
    await expect(within(dialog).getByRole("textbox", { name: "Passcode" })).toHaveValue("maple-river-otter-42");
    await expect(within(dialog).getByText("You’ll only see this passcode now.")).toBeVisible();
    await expect(within(dialog).getByRole("link", { name: "Preview Wisam’s Journey" })).toHaveAttribute(
      "href",
      "/account/journey-preview",
    );
  },
};

/** "+ Share with someone else" opens the same form under the links. */
export const ShareWithSomeoneElse: Story = {
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Share with someone else" });
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByRole("textbox", { name: "Who it’s for" })).toBeVisible();
  },
};

/** A blank label and a short Passcode show their errors beside the fields and send nothing. */
export const FieldsNeeded: Story = {
  args: { links: [] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Passcode"), "short");
    await userEvent.click(canvas.getByRole("button", { name: "Create link" }));
    await expect(canvas.getByRole("textbox", { name: "Who it’s for" })).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByText("Use at least 8 characters.")).toBeVisible();
    await expect(createShareLinkAction).not.toHaveBeenCalled();
  },
};

/** The server refuses: the reason shows under the form. */
export const CreateFails: Story = {
  args: { links: [] },
  beforeEach: () => {
    mocked(createShareLinkAction).mockResolvedValue({
      error: "Couldn’t reach Bigfoot’s server. No link was created. Try again.",
      created: null,
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Who it’s for" }), "Mom & Dad");
    await userEvent.type(canvas.getByLabelText("Passcode"), "maple-river-42");
    await userEvent.click(canvas.getByRole("button", { name: "Create link" }));
    await expect(await canvas.findByText(/No link was created/)).toBeVisible();
  },
};

/** Copy link puts the full link on the clipboard and says so. */
export const CopyLink: Story = {
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    return () => writeText.mockRestore();
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Copy link: Link for Mom & Dad" }));
    await expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/journey/k7Qm2x9PaB`);
    await expect(await canvas.findByRole("button", { name: "Copied: Link for Mom & Dad" })).toBeVisible();
  },
};

/** Renew makes the link work for 7 days from now, and says so to screen readers. */
export const Renew: Story = {
  args: { links: [{ ...momAndDad, expires_at: at(-2 * DAY), expired: true }] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Renew the link for Mom & Dad" }));
    await waitFor(() => expect(renewShareLinkAction).toHaveBeenCalledWith("k7Qm2x9PaB"));
    await expect(await canvas.findByText("Renewed the link for Mom & Dad.")).toBeInTheDocument();
  },
};

/** Renewing fails: the card says why. */
export const RenewFails: Story = {
  beforeEach: () => {
    mocked(renewShareLinkAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. The link was not renewed. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Renew the link for Mom & Dad" }));
    await expect(await canvas.findByText(/The link was not renewed/)).toBeVisible();
  },
};

/** Change passcode asks for a new one, then shows it once, like the Link ready dialog. */
export const ChangePasscode: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Change passcode for Mom & Dad" }));
    const dialog = await screen.findByRole("dialog", { name: "Change passcode for Mom & Dad" });
    await expect(within(dialog).getByText(/Anyone viewing this link is signed out/)).toBeVisible();
    await userEvent.type(within(dialog).getByLabelText("New passcode"), "otter-lake-77");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save passcode" }));
    await waitFor(() => expect(changePasscodeAction).toHaveBeenCalledWith("k7Qm2x9PaB", "otter-lake-77"));
    const shown = await screen.findByRole("dialog", { name: "New passcode for Mom & Dad" });
    await expect(within(shown).getByRole("textbox", { name: "Passcode" })).toHaveValue("otter-lake-77");
  },
};

/** Stop sharing asks first, with Cancel focused, then deletes the link. */
export const StopSharing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Stop sharing with Mom & Dad" }));
    const dialog = await screen.findByRole("dialog", { name: "Stop sharing with Mom & Dad?" });
    await expect(within(dialog).getByText("The link stops working straight away. You can’t undo this.")).toBeVisible();
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: "Stop sharing" }));
    await waitFor(() => expect(stopSharingAction).toHaveBeenCalledWith("k7Qm2x9PaB"));
  },
};

/** Stopping fails: the dialog stays open and says why. */
export const StopSharingFails: Story = {
  beforeEach: () => {
    mocked(stopSharingAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. The link still works. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Stop sharing with Mom & Dad" }));
    const dialog = await screen.findByRole("dialog", { name: "Stop sharing with Mom & Dad?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Stop sharing" }));
    await expect(await within(dialog).findByText(/The link still works/)).toBeVisible();
  },
};

export const LongText: Story = {
  args: {
    links: [{ ...momAndDad, label: "Grandma Rosalind, Grandpa Theodore and everyone else at the Sunday dinner table" }],
  },
};

/**
 * A phone (BIG-240): each card has Copy link and ⋯, which holds Change passcode, Renew, and Stop
 * sharing; Stop sharing still asks first.
 */
export const OnAPhone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: "Copy link: Link for Mom & Dad" })).toBeVisible();
    // The wide-screen buttons are hidden, so out of the accessibility tree.
    await expect(canvas.queryByRole("button", { name: "Stop sharing with Mom & Dad" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "More actions, link for Mom & Dad" }));
    const items = await screen.findAllByRole("menuitem");
    await expect(items.map((item) => item.textContent)).toEqual(["Change passcode", "Renew", "Stop sharing"]);
    await userEvent.click(screen.getByRole("menuitem", { name: "Stop sharing" }));
    const dialog = await screen.findByRole("dialog", { name: "Stop sharing with Mom & Dad?" });
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await expect(canvas.getByRole("button", { name: "More actions, link for Mom & Dad" })).toHaveFocus();
    await expect(stopSharingAction).not.toHaveBeenCalled();
  },
};

/** Renew from ⋯ on a phone renews the link. */
export const RenewOnAPhone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "More actions, link for Mom & Dad" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Renew" }));
    await waitFor(() => expect(renewShareLinkAction).toHaveBeenCalledWith("k7Qm2x9PaB"));
  },
};
