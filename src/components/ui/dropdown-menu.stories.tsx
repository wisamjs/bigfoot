import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { expect, screen } from "storybook/test";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
  component: DropdownMenu,
  // Not modal, as Bigfoot uses it (account-menu.tsx): a modal menu hides the page with
  // aria-hidden while its trigger, inside the page, still holds focus (axe's aria-hidden-focus).
  args: { modal: false },
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
          Actions
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Application</DropdownMenuLabel>
        <DropdownMenuItem>
          <Pencil aria-hidden />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Archive (coming soon)</DropdownMenuItem>
        <DropdownMenuItem>Move the Application to another stage of the search</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value="in_progress">
          <DropdownMenuRadioItem value="in_progress">In progress</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="done">Done</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

/**
 * Open from the keyboard: the first item is focused (surface fill), a disabled item fades, a
 * long item wraps, and the destructive item is red.
 */
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    canvas.getByRole("button", { name: "Actions" }).focus();
    await userEvent.keyboard("{Enter}");
    await expect(await screen.findByRole("menuitem", { name: "Edit details" })).toHaveFocus();
    await expect(screen.getByRole("menuitem", { name: /Archive/ })).toHaveAttribute("aria-disabled", "true");
  },
};
