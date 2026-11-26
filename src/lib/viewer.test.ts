import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { sharedPage, VIEWER_COOKIE, viewerCookie } from "./viewer";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return { ApiError: actual.ApiError, getJourney: vi.fn(), getShareLinkStatus: vi.fn() };
});

const ID = "k7Qm2x9PaB";
const journey = { shared_by: "Wisam Zaghal", applications: [], other_completed_interviews: [] };
const open = { shared_by: "Wisam Zaghal", expired: false, locked: false };

beforeEach(() => vi.resetAllMocks());

describe("sharedPage", () => {
  it("shows the Journey while the Viewer's token opens it", async () => {
    vi.mocked(api.getJourney).mockResolvedValue(journey);
    expect(await sharedPage(ID, "token")).toEqual({ kind: "journey", journey });
    expect(api.getJourney).toHaveBeenCalledWith(ID, "token");
    expect(api.getShareLinkStatus).not.toHaveBeenCalled();
  });

  it("asks for the Passcode without a token, or once a new Passcode turns the token down", async () => {
    vi.mocked(api.getShareLinkStatus).mockResolvedValue(open);
    expect(await sharedPage(ID, undefined)).toEqual({ kind: "passcode", sharedBy: "Wisam Zaghal", locked: false });
    expect(api.getJourney).not.toHaveBeenCalled();

    vi.mocked(api.getJourney).mockRejectedValue(new api.ApiError(401, "The Passcode has changed"));
    expect(await sharedPage(ID, "token")).toEqual({ kind: "passcode", sharedBy: "Wisam Zaghal", locked: false });
  });

  it("says the link is locked", async () => {
    vi.mocked(api.getShareLinkStatus).mockResolvedValue({ ...open, locked: true });
    expect(await sharedPage(ID, undefined)).toMatchObject({ kind: "passcode", locked: true });
  });

  it("says an expired link has expired, naming who can renew it", async () => {
    vi.mocked(api.getJourney).mockRejectedValue(new api.ApiError(410, "This link has expired"));
    vi.mocked(api.getShareLinkStatus).mockResolvedValue({ ...open, expired: true });
    expect(await sharedPage(ID, "token")).toEqual({ kind: "expired", sharedBy: "Wisam Zaghal" });
  });

  it("says a stopped link isn't active, naming nobody", async () => {
    vi.mocked(api.getJourney).mockRejectedValue(new api.ApiError(404, "This link isn't active"));
    vi.mocked(api.getShareLinkStatus).mockResolvedValue(null);
    expect(await sharedPage(ID, "token")).toEqual({ kind: "not_active" });
  });

  it("says a malformed id isn't active without asking the API", async () => {
    expect(await sharedPage("not-an-id", "token")).toEqual({ kind: "not_active" });
    expect(api.getJourney).not.toHaveBeenCalled();
    expect(api.getShareLinkStatus).not.toHaveBeenCalled();
  });

  it("lets other failures through", async () => {
    vi.mocked(api.getJourney).mockRejectedValue(new TypeError("fetch failed"));
    await expect(sharedPage(ID, "token")).rejects.toThrow("fetch failed");
  });
});

describe("viewerCookie", () => {
  it("is HttpOnly, Secure and SameSite=Lax, for this link's path only, until the link expires", () => {
    expect(viewerCookie(ID, "token", "2026-12-02T15:00:00Z")).toEqual({
      name: VIEWER_COOKIE,
      value: "token",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: `/journey/${ID}`,
      expires: new Date("2026-12-02T15:00:00Z"),
    });
  });
});
