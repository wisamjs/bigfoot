import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";
import { ComingUpCalendarSkeleton } from "./coming-up-calendar";
import { PipelineBoardSkeleton } from "./pipeline-board";
import { LoadingRegion, Skeleton } from "./ui";

vi.mock("@/app/actions", () => ({ signInWithGoogle: vi.fn(), signOutAction: vi.fn() }));

describe("Skeleton", () => {
  it("is hidden from assistive tech", () => {
    const { container } = render(<Skeleton className="h-4 w-12" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveClass("skeleton", "h-4", "w-12");
  });
});

describe("LoadingRegion", () => {
  it("is one busy region that says what is loading", () => {
    const { container } = render(
      <LoadingRegion label="Loading your dashboard…">
        <h2>Coming up</h2>
      </LoadingRegion>,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading your dashboard…");
    expect(screen.getByRole("heading", { name: "Coming up" })).toBeInTheDocument();
  });
});

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

describe("ComingUpCalendarSkeleton", () => {
  it("draws a five-week month and five agenda items, hidden from assistive tech", () => {
    const { container } = render(<ComingUpCalendarSkeleton />);
    const card = container.firstElementChild!;
    expect(card).toHaveAttribute("aria-hidden", "true");
    expect(card.querySelectorAll(".rounded-full.skeleton")).toHaveLength(35);
    expect(card.querySelectorAll("li")).toHaveLength(5);
  });
});

describe("PipelineBoardSkeleton", () => {
  it("shows the real title and hides its column shapes", () => {
    const { container } = render(<PipelineBoardSkeleton title="Pipeline" />);
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    const columns = container.querySelector("[aria-hidden='true'].grid")!;
    expect(columns.children).toHaveLength(3);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
