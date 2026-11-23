import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeletedNotice } from "./deleted-notice";

vi.mock("next/navigation", () => import("@/test/navigation"));

afterEach(() => window.history.replaceState(null, "", "/"));

describe("DeletedNotice", () => {
  it("says the Interview was deleted, then drops the search param so a refresh doesn't repeat it", async () => {
    window.history.replaceState(null, "", "/dashboard?deleted=interview&month=2026-12");
    render(<DeletedNotice />);
    expect(await screen.findByRole("status")).toHaveTextContent("Interview deleted");
    expect(window.location.search).toBe("?month=2026-12");
  });

  it("stays empty otherwise", () => {
    window.history.replaceState(null, "", "/dashboard");
    render(<DeletedNotice />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
