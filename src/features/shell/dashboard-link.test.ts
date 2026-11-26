import { afterEach, describe, expect, it, vi } from "vitest";
import { rememberDashboardView, rememberedView } from "./dashboard-link";

function storage(values: Record<string, string> = {}) {
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("the dashboard's remembered view", () => {
  it("gives back the view this tab remembered", () => {
    vi.stubGlobal("sessionStorage", storage());
    rememberDashboardView("?month=2026-12&day=2026-12-04");
    expect(rememberedView()).toBe("?month=2026-12&day=2026-12-04");
  });

  it("is the default view when nothing was remembered, or something other than a search string", () => {
    vi.stubGlobal("sessionStorage", storage());
    expect(rememberedView()).toBe("");
    vi.stubGlobal("sessionStorage", storage({ "bigfoot:dashboard-view": "https://evil.example" }));
    expect(rememberedView()).toBe("");
  });

  it("is the default view when storage is blocked, and remembering fails quietly", () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.stubGlobal("sessionStorage", { getItem: blocked, setItem: blocked });
    expect(() => rememberDashboardView("?month=2026-12")).not.toThrow();
    expect(rememberedView()).toBe("");
  });
});
