/* eslint-disable testing-library/no-node-access --
   Skeleton shapes are aria-hidden, with no role or text, so queries by role or text cannot
   reach them; this test counts them in the DOM. */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { signOutAction } from "@/app/actions";
import { AppHeader } from "./app-header";
import { initials } from "./avatar";

vi.mock("@/app/actions", () => ({ signInWithGoogle: vi.fn(), signOutAction: vi.fn() }));

const user = { id: "u1", name: "Wisam Zaghal", firstName: "Wisam", email: "w@example.test", image: null };

describe("AppHeader", () => {
  it("opens the avatar's menu: who is signed in, Account and Sign out", async () => {
    const pointer = userEvent.setup();
    render(<AppHeader user={user} current="/dashboard" />);
    const trigger = screen.getByRole("button", { name: "Account menu, Wisam Zaghal" });
    expect(trigger).toHaveTextContent("WZ");

    await pointer.click(trigger);
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("w@example.test")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Account" })).toHaveAttribute("href", "/account");
    await pointer.click(within(menu).getByRole("menuitem", { name: "Sign out" }));
    expect(signOutAction).toHaveBeenCalled();
  });

  it("opens the menu from the keyboard", async () => {
    const keyboard = userEvent.setup();
    render(<AppHeader user={user} />);
    screen.getByRole("button", { name: /^Account menu/ }).focus();
    await keyboard.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});

describe("AppHeader without a user", () => {
  it("keeps the real nav, without Account, with a shape where the avatar goes", () => {
    render(<AppHeader current="/dashboard" />);
    const nav = screen.getByRole("navigation", { name: "Signed in" });
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Account menu/ })).not.toBeInTheDocument();
    expect(screen.getByRole("banner").querySelectorAll(".skeleton")).toHaveLength(1);
  });
});

describe("AppHeader's nav (BIG-252)", () => {
  it("has Dashboard and Applications, Applications current on the Applications page", () => {
    render(<AppHeader user={user} current="/applications" />);
    const nav = screen.getByRole("navigation", { name: "Signed in" });
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual(["Dashboard", "Applications"]);
    expect(within(nav).getByRole("link", { name: "Applications" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Applications" })).toHaveAttribute("href", "/applications");
    expect(within(nav).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
});

describe("AppHeader on a page outside the nav", () => {
  it("links the wordmark to the Dashboard", () => {
    render(<AppHeader user={user} />);
    expect(screen.getByRole("link", { name: "Bigfoot dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("highlights nothing", () => {
    render(<AppHeader user={user} />);
    const nav = screen.getByRole("navigation", { name: "Signed in" });
    expect(within(nav).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
});

describe("initials", () => {
  it("takes the first and last words' first letters", () => {
    expect(initials("Wisam Zaghal")).toBe("WZ");
    expect(initials("ana de la cruz")).toBe("AC");
    expect(initials("Cher")).toBe("C");
    expect(initials("  ")).toBe("?");
  });
});
