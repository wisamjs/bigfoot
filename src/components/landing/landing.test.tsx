import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Features } from "./features";
import { Footer } from "./footer";
import { Hero } from "./hero";
import { Navbar } from "./navbar";

// The sign-in buttons post to Server Actions, which need Auth.js and a request.
vi.mock("@/app/actions", () => ({ signInWithGoogle: vi.fn(), signOutAction: vi.fn() }));

/** The section a heading names, checking the heading labels it. */
function sectionNamedBy(level: number) {
  const heading = screen.getByRole("heading", { level });
  expect(heading.textContent).not.toBe("");
  return screen.getByRole("region", { name: heading.textContent! });
}

describe("landing sections", () => {
  it("Hero leads with the page's only h1 and both sign-in buttons", () => {
    render(<Hero />);
    sectionNamedBy(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Sign up with Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("Features is a section named by its h2, with an h3 per feature", () => {
    render(<Features />);
    const section = sectionNamedBy(2);
    expect(within(section).getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("Navbar links to the sections on the page", () => {
    render(<Navbar />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#features"]);
  });

  it("Footer heads each link column", () => {
    render(<Footer />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Product", "Company"]);
  });
});
