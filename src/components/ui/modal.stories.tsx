import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, screen } from "storybook/test";
import { Button } from "./button";
import { Modal } from "./modal";

const meta = {
  component: Modal,
  args: {
    open: true,
    onClose: fn(),
    title: "Delete Stripe?",
    children: (
      <p className="m-0 mt-4 text-sm">The Application and its Interviews are deleted for good.</p>
    ),
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

/** Opened from a button, as Bigfoot's dialogs are: Escape closes it and focus returns. */
export const FromButton: Story = {
  args: { open: false },
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Delete application
        </Button>
        <Modal {...args} open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const opener = canvas.getByRole("button", { name: "Delete application" });
    await userEvent.click(opener);
    const dialog = await screen.findByRole("dialog", { name: "Delete Stripe?" });
    // After the fade-in.
    await expect(dialog).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(opener).toHaveFocus();
  },
};

/** The Close button is focusable and asks to close. */
export const CloseFocused: Story = {
  play: async ({ args, userEvent }) => {
    const close = await screen.findByRole("button", { name: "Close" });
    close.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const LongText: Story = {
  args: {
    title: "Delete Northern Lights Software Engineering Co-operative of British Columbia?",
    children: (
      <p className="m-0 mt-4 text-sm">
        {"The Application, its Interviews and every Interview note are deleted for good. ".repeat(4)}
      </p>
    ),
  },
};
