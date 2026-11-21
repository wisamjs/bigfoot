import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthCard } from "./auth-card";

// The Google button posts to a Server Action, which needs Auth.js and a request.
vi.mock("@/app/actions", () => ({ signInWithGoogle: vi.fn(), signOutAction: vi.fn() }));

describe("AuthCard", () => {
  it("offers Continue with Google under the page's only h1", () => {
    render(<AuthCard />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("says continuing agrees to the Terms and acknowledges the Privacy Policy", () => {
    render(<AuthCard />);
    const note = screen.getByText(/By continuing, you agree to our/);
    expect(within(note).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(within(note).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });
});
