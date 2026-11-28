import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, userEvent, waitFor } from "storybook/test";
import { expectBigfootClear } from "@/test/art";
import { openJourneyAction } from "@/app/journey/[id]/actions";
import { PasscodeForm } from "./passcode-form";

// A Share link's Passcode page (BIG-197). The Server Action is mocked (src/app/journey/[id]/__mocks__/actions.ts):
// it answers "wrong" unless a story says otherwise. The right Passcode reloads the page on the server,
// which a story can't, so the Journey has its own stories.

const meta = {
  component: PasscodeForm,
  args: { id: "k7Qm2x9PaB", sharedBy: "Wisam Zaghal" },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PasscodeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Who shared it, by first name and initials, and the Passcode field. */
export const EnterPasscode: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Wisam shared a job search with you" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "See Wisam’s progress" })).toBeEnabled();
    await expect(canvas.getByText("Don’t have it? Ask Wisam for the Passcode.")).toBeVisible();
    await expect(canvas.getByText("Private, view-only link")).toBeVisible();
  },
};

/** Bigfoot leans out from behind the card's right edge (BIG-229), on a light page wide enough for him. */
export const BigfootLight: Story = {
  globals: { theme: "light", viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    const art = canvasElement.querySelector('img[src*="bigfoot-peek-right"]');
    await expect(art).toHaveAttribute("alt", "");
    await expect(art).toBeVisible();
  },
};

/** On a phone there is no room beside the card, so Bigfoot peeks in from the screen's edge, beside the initials (BIG-232). */
export const BigfootPhone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvasElement }) => {
    await expectBigfootClear(canvasElement, "bigfoot-peek-right");
  },
};

/** Show reveals what was typed. */
export const ShowPasscode: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText("Passcode");
    await userEvent.type(field, "maple-river-42");
    await expect(field).toHaveAttribute("type", "password");
    await userEvent.click(canvas.getByRole("button", { name: "Show passcode" }));
    await expect(field).toHaveAttribute("type", "text");
  },
};

/** A wrong Passcode says so under the field, and names the job seeker to check with. */
export const WrongPasscode: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Passcode"), "otter-lake-7");
    await userEvent.click(canvas.getByRole("button", { name: "See Wisam’s progress" }));
    const error = await canvas.findByText("That Passcode didn’t match. Check the message from Wisam and try again.");
    await expect(error).toBeVisible();
    await expect(canvas.getByLabelText("Passcode")).toHaveAttribute("aria-invalid", "true");
    await expect(openJourneyAction).toHaveBeenCalledWith("k7Qm2x9PaB", { status: "idle" }, expect.any(FormData));
  },
};

/** The 5th wrong try locks the link: the button is disabled for 15 minutes. */
export const LockedAfterATry: Story = {
  beforeEach: () => {
    mocked(openJourneyAction).mockResolvedValue({ status: "locked" });
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Passcode"), "otter-lake-7");
    await userEvent.click(canvas.getByRole("button", { name: "See Wisam’s progress" }));
    await expect(await canvas.findByText("Too many tries. Try again in 15 minutes.")).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("button", { name: "See Wisam’s progress" })).toBeDisabled());
  },
};

/** A link already locked when the page loads. */
export const Locked: Story = {
  args: { locked: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Too many tries. Try again in 15 minutes.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "See Wisam’s progress" })).toBeDisabled();
    await expect(canvas.getByLabelText("Passcode")).toBeDisabled();
  },
};

/** Bigfoot couldn't reach its server. */
export const ServerUnreachable: Story = {
  beforeEach: () => {
    mocked(openJourneyAction).mockResolvedValue({ status: "error" });
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Passcode"), "maple-river-42");
    await userEvent.click(canvas.getByRole("button", { name: "See Wisam’s progress" }));
    await expect(await canvas.findByText("Couldn’t reach Bigfoot’s server. Try again.")).toBeVisible();
  },
};

/** A link made before Bigfoot stored names: the same page, worded without one. */
export const NoName: Story = {
  args: { sharedBy: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "A job search was shared with you" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "See the progress" })).toBeVisible();
  },
};
