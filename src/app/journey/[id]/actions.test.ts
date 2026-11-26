import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { VIEWER_COOKIE } from "@/lib/viewer";
import { lockAction, openJourneyAction } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return { ApiError: actual.ApiError, openShareLink: vi.fn() };
});

const ID = "k7Qm2x9PaB";
const jar = { set: vi.fn(), delete: vi.fn() };
const idle = { status: "idle" as const };

function form(passcode?: string) {
  const data = new FormData();
  if (passcode !== undefined) data.set("passcode", passcode);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue(jar as unknown as Awaited<ReturnType<typeof cookies>>);
});

describe("openJourneyAction", () => {
  it("sets the Viewer's cookie for this link and reloads the page, which shows the Journey", async () => {
    vi.mocked(api.openShareLink).mockResolvedValue({ token: "viewer-token", expires_at: "2026-12-02T15:00:00Z" });
    await expect(openJourneyAction(ID, idle, form("maple-river-42"))).rejects.toThrow(`NEXT_REDIRECT /journey/${ID}`);
    expect(api.openShareLink).toHaveBeenCalledWith(ID, "maple-river-42");
    expect(jar.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: VIEWER_COOKIE, value: "viewer-token", httpOnly: true, path: `/journey/${ID}` }),
    );
  });

  it.each([
    [401, "wrong"],
    [422, "wrong"],
    [423, "locked"],
  ] as const)("answers %i with %s, setting no cookie", async (status, expected) => {
    vi.mocked(api.openShareLink).mockRejectedValue(new api.ApiError(status, "No"));
    expect(await openJourneyAction(ID, idle, form("otter-lake-7"))).toEqual({ status: expected });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it.each([404, 410])("reloads the page when the link stopped or expired meanwhile (%i)", async (status) => {
    vi.mocked(api.openShareLink).mockRejectedValue(new api.ApiError(status, "Gone"));
    await expect(openJourneyAction(ID, idle, form("maple-river-42"))).rejects.toThrow(`NEXT_REDIRECT /journey/${ID}`);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("says the server couldn't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.openShareLink).mockRejectedValue(new TypeError("fetch failed"));
    expect(await openJourneyAction(ID, idle, form("maple-river-42"))).toEqual({ status: "error" });
  });

  it("calls an empty Passcode wrong without asking the API", async () => {
    expect(await openJourneyAction(ID, idle, form())).toEqual({ status: "wrong" });
    expect(api.openShareLink).not.toHaveBeenCalled();
  });

  it("sends a malformed id home", async () => {
    await expect(openJourneyAction("../evil", idle, form("x"))).rejects.toThrow("NEXT_REDIRECT /");
    expect(api.openShareLink).not.toHaveBeenCalled();
  });
});

describe("lockAction", () => {
  it("forgets the Viewer's cookie for this link and goes back to its Passcode page", async () => {
    await expect(lockAction(ID)).rejects.toThrow(`NEXT_REDIRECT /journey/${ID}`);
    expect(jar.delete).toHaveBeenCalledWith({ name: VIEWER_COOKIE, path: `/journey/${ID}` });
  });

  it("sends a malformed id home", async () => {
    await expect(lockAction("../evil")).rejects.toThrow("NEXT_REDIRECT /");
    expect(jar.delete).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
