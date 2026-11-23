import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen } from "storybook/test";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";

// Bigfoot's dialogs build on Modal (modal.stories.tsx); these show the primitives it uses.
const meta = {
  component: Dialog,
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button variant="secondary">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Leave without saving?</DialogTitle>
        <DialogDescription className="mt-2">The notes you typed haven’t been saved yet.</DialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="secondary">Stay</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="danger">Leave</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

/** Open, with focus inside, and the page behind it inert. */
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog", { name: "Leave without saving?" });
    await expect(dialog).toContainElement(document.activeElement as HTMLElement);
  },
};

/** Escape closes it, and focus goes back to the button that opened it. */
export const ClosesOnEscape: Story = {
  play: async ({ canvas, userEvent }) => {
    const opener = canvas.getByRole("button", { name: "Open dialog" });
    await userEvent.click(opener);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await expect(opener).toHaveFocus();
  },
};
