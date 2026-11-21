/* eslint-disable testing-library/no-node-access --
   Skeleton shapes are aria-hidden, with no role or text, so queries by role or text cannot
   reach them; these tests check the DOM structure itself. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingRegion, Skeleton } from "./skeleton";

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
