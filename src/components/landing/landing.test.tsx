import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Features } from "./features";
import { Footer } from "./footer";
import { Hero } from "./hero";
import { Navbar } from "./navbar";
import { AppFooter } from "@/components/app-footer";

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

  it("Hero says signing in agrees to the Terms, with links to both legal pages", () => {
    render(<Hero />);
    expectSignInNote(document.body);
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

  it("Navbar's mobile menu shows the sign-in note with its buttons", async () => {
    render(<Navbar />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expectSignInNote(document.getElementById("mobile-menu")!);
  });

  it("Footer heads each link column", () => {
    render(<Footer />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Product", "Company"]);
  });

  it("Footer links to the Privacy Policy and the Terms", () => {
    render(<Footer />);
    const company = screen.getByRole("navigation", { name: "Company" });
    expect(within(company).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/privacy", "/terms"]);
  });
});

describe("AppFooter", () => {
  it("links signed-in pages to the Privacy Policy and the Terms", () => {
    render(<AppFooter />);
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
  });
});

function expectSignInNote(container: HTMLElement) {
  const note = within(container).getByText(/By continuing, you agree to our/);
  expect(note).toHaveTextContent("By continuing, you agree to our Terms and acknowledge our Privacy Policy.");
  expect(within(note).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  expect(within(note).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
}
