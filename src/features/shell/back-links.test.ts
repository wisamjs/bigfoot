import { afterEach, describe, expect, it, vi } from "vitest";
import { rememberedView, rememberView } from "./back-links";

function storage(values: Record<string, string> = {}) {
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("a page's remembered view", () => {
  it("gives back the view this tab remembered", () => {
    vi.stubGlobal("sessionStorage", storage());
    rememberView("dashboard", "?month=2026-12&day=2026-12-04");
    expect(rememberedView("dashboard")).toBe("?month=2026-12&day=2026-12-04");
  });

  it("keeps each page's view apart (BIG-252)", () => {
    vi.stubGlobal("sessionStorage", storage());
    rememberView("dashboard", "?month=2026-12");
    rememberView("applications", "?progress=waiting&sort=next");
    expect(rememberedView("dashboard")).toBe("?month=2026-12");
    expect(rememberedView("applications")).toBe("?progress=waiting&sort=next");
  });

  it("is the default view when nothing was remembered, or something other than a search string", () => {
    vi.stubGlobal("sessionStorage", storage());
    expect(rememberedView("applications")).toBe("");
    vi.stubGlobal("sessionStorage", storage({ "bigfoot:dashboard-view": "https://evil.example" }));
    expect(rememberedView("dashboard")).toBe("");
  });

  it("is the default view when storage is blocked, and remembering fails quietly", () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.stubGlobal("sessionStorage", { getItem: blocked, setItem: blocked });
    expect(() => rememberView("dashboard", "?month=2026-12")).not.toThrow();
    expect(rememberedView("dashboard")).toBe("");
  });
});
