import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor } from "storybook/test";
import { deleteAccountAction } from "@/app/account/actions";
import { DeleteAccountForm } from "./delete-account-form";

// The Account page's Delete account form. Server Actions are mocked
// (src/app/account/__mocks__/actions.ts) and succeed unless a story says otherwise.
const meta = {
  component: DeleteAccountForm,
} satisfies Meta<typeof DeleteAccountForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The button stays disabled until DELETE is typed. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  },
};

/** Typing DELETE enables the button, which deletes the account. */
export const Confirmed: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Type DELETE to confirm" }), "DELETE");
    const button = canvas.getByRole("button", { name: "Delete my account" });
    await expect(button).toBeEnabled();
    await userEvent.click(button);
    await waitFor(() => expect(deleteAccountAction).toHaveBeenCalled());
  },
};

/** The server refuses: the reason shows above the button. */
export const DeleteFails: Story = {
  beforeEach: () => {
    mocked(deleteAccountAction).mockResolvedValue({ error: "Couldn’t reach Bigfoot’s server. Nothing was deleted. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Type DELETE to confirm" }), "DELETE");
    await userEvent.click(canvas.getByRole("button", { name: "Delete my account" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Nothing was deleted");
  },
};
