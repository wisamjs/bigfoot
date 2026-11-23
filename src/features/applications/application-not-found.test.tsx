import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApplicationNotFound } from "./application-not-found";
import { RememberViewed } from "./recently-viewed";

const KEY = "bigfoot:recent-applications";
const applications = [
  { id: "lumen", company: "Lumen Bio", title: "Engineering Manager" },
  { id: "quillon", company: "Quillon Learning", title: "Senior Engineering Manager" },
];

afterEach(() => localStorage.removeItem(KEY));

describe("Application not found (BIG-174)", () => {
  it("says why, and links back to the dashboard", () => {
    render(<ApplicationNotFound applications={applications} />);
    expect(screen.getByRole("heading", { level: 1, name: "Application not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("lists the Applications viewed last that still exist, newest first", () => {
    render(<RememberViewed id="quillon" />);
    render(<RememberViewed id="gone" />);
    render(<RememberViewed id="lumen" />);
    render(<ApplicationNotFound applications={applications} />);
    const list = screen.getByRole("list", { name: "Recently viewed" });
    expect(list).toHaveTextContent("Lumen Bio · Engineering Manager");
    expect(screen.getAllByRole("link", { name: /Lumen Bio|Quillon Learning/ }).map((link) => link.getAttribute("href"))).toEqual([
      "/applications/lumen",
      "/applications/quillon",
    ]);
  });

  it("remembers only the last five, each once", () => {
    for (const id of ["a", "b", "c", "a", "d", "e", "f"]) render(<RememberViewed id={id} />);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["f", "e", "d", "a", "c"]);
  });

  it("lists nothing when nothing was viewed, or what was stored isn't a list of ids", () => {
    localStorage.setItem(KEY, "{oops");
    render(<ApplicationNotFound applications={applications} />);
    expect(screen.queryByRole("heading", { name: "Recently viewed" })).not.toBeInTheDocument();
  });
});
