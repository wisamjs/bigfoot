/* eslint-disable testing-library/no-node-access --
   Skeleton shapes are aria-hidden, with no role or text, so queries by role or text cannot
   reach them; this test counts them in the DOM. */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";

vi.mock("@/app/actions", () => ({ signInWithGoogle: vi.fn(), signOutAction: vi.fn() }));

describe("AppHeader without a user", () => {
  it("keeps the real nav and Sign out, with shapes where the job seeker goes", () => {
    render(<AppHeader current="/dashboard" />);
    const nav = screen.getByRole("navigation", { name: "Signed in" });
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("banner").querySelectorAll(".skeleton")).toHaveLength(3);
  });
});
