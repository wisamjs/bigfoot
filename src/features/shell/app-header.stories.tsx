import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, within } from "storybook/test";
import { signOutAction } from "@/app/actions";
import type { CurrentUser } from "@/lib/current-user";
import { AppHeader } from "./app-header";

// The header of signed-in pages. Sign out is mocked (src/app/__mocks__/actions.ts).
const user: CurrentUser = {
  id: "u1",
  name: "Alex Morgan",
  firstName: "Alex",
  email: "alex.morgan@example.com",
  image: null,
};

const meta = {
  component: AppHeader,
  args: { user, current: "/dashboard" },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the dashboard, with initials where Google has no photo, and Bigfoot beside the name: decorative, so an empty alt. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('img[src*="bigfoot-welcome"]')).toHaveAttribute("alt", "");
    await expect(canvas.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("button", { name: "Account menu, Alex Morgan" })).toHaveTextContent("AM");
    // The dark mode toggle sits just before the avatar (BIG-251).
    await expect(canvas.getByRole("button", { name: "Dark mode" })).toBeVisible();
  },
};

/** On the Applications page (BIG-252): its pill is current. */
export const Applications: Story = {
  args: { current: "/applications" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Applications" })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  },
};

/**
 * On a 320 px phone: the wordmark, Applications, the dark mode toggle and the avatar all fit in the
 * bar. Dashboard gives way to Bigfoot, whose link leads there (BIG-252).
 */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    const doc = canvasElement.ownerDocument.documentElement;
    await expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth);
    await expect(canvas.getByRole("link", { name: "Applications" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Bigfoot dashboard" })).toHaveAttribute("href", "/dashboard");
    await expect(canvas.getByRole("button", { name: "Dark mode" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Account menu, Alex Morgan" })).toBeVisible();
  },
};

/** On the Account page, which isn't in the nav (it's in the avatar's menu): nothing is highlighted, and the wordmark leads back to the Dashboard. */
export const Account: Story = {
  args: { current: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Bigfoot dashboard" })).toHaveAttribute("href", "/dashboard");
    await expect(canvas.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    await expect(canvas.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  },
};

/** The avatar's menu, open: who is signed in, Account and Sign out. Sign out calls its action. */
export const MenuOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Account menu, Alex Morgan" }));
    const menu = screen.getByRole("menu");
    await expect(within(menu).getByText("alex.morgan@example.com")).toBeVisible();
    await expect(within(menu).getByRole("menuitem", { name: "Account" })).toHaveAttribute("href", "/account");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Sign out" }));
    await expect(signOutAction).toHaveBeenCalled();
  },
};

/** The menu opened from the keyboard: Enter opens it and focus moves into it. */
export const MenuByKeyboard: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole("button", { name: "Account menu, Alex Morgan" }).focus();
    await userEvent.keyboard("{Enter}");
    const menu = screen.getByRole("menu");
    await expect(within(menu).getAllByRole("menuitem")[0]).toHaveFocus();
  },
};

/** A page's loading state: a shape where the avatar goes. */
export const Loading: Story = { args: { user: undefined } };

/** A long name and email wrap inside the open menu. */
export const LongText: Story = {
  args: {
    user: {
      ...user,
      name: "Alexandra Morgan-Harrison Wellington",
      email: "alexandra.morgan-harrison.wellington@northern-lights-cooperative.example.com",
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Account menu/ }));
  },
};
