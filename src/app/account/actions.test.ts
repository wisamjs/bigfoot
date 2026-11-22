import { refresh } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { findCurrentUser } from "@/lib/dal";
import { createAccessTokenAction, revokeAccessTokenAction } from "./actions";

// The API client is mocked at its module, keeping ApiError real so actions can tell it apart.
vi.mock("@/lib/api", async () => {
  const { ApiError } = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ApiError, createAccessToken: vi.fn(), revokeAccessToken: vi.fn() };
});
vi.mock("@/lib/dal", () => ({ findCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
// actions.ts imports Auth.js for signing out, which needs a Next.js server.
vi.mock("@/auth", () => ({ signOut: vi.fn() }));
// @/lib/api imports server-only, which throws outside a React Server Components build.
vi.mock("server-only", () => ({}));

const user = { id: "seeker-1", name: "Sam", firstName: "Sam", email: "sam@example.com", image: null };
const created = {
  id: "t1",
  name: "Calendar cron job",
  created_at: "2026-11-16T12:00:00Z",
  expires_at: "2027-11-16T12:00:00Z",
  expired: false,
  token: "bigfoot_secret",
};
const nothing = { error: null, created: null };

function form(name: string) {
  const data = new FormData();
  data.set("name", name);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findCurrentUser).mockResolvedValue(user);
});

describe("createAccessTokenAction", () => {
  it("creates the token as the signed-in job seeker, returns its secret and refreshes the list", async () => {
    vi.mocked(api.createAccessToken).mockResolvedValue(created);
    expect(await createAccessTokenAction(nothing, form("Calendar cron job"))).toEqual({ error: null, created });
    expect(api.createAccessToken).toHaveBeenCalledWith("seeker-1", "Calendar cron job");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("asks a signed-out job seeker to sign in again, without calling the API", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    expect(await createAccessTokenAction(nothing, form("x"))).toEqual({
      error: "Your session has ended. Sign in again.",
      created: null,
    });
    expect(api.createAccessToken).not.toHaveBeenCalled();
  });

  it("checks the name with the form's rules, without calling the API, because anyone can call it", async () => {
    expect(await createAccessTokenAction(nothing, form(" "))).toEqual({
      error: null,
      nameError: "Enter the name.",
      created: null,
    });
    expect(await createAccessTokenAction(nothing, form("\u202eevil"))).toMatchObject({
      nameError: "Use only characters you can see in the name.",
    });
    expect(await createAccessTokenAction(nothing, new FormData())).toMatchObject({ nameError: "Enter the name." });
    expect(api.createAccessToken).not.toHaveBeenCalled();
  });

  it("passes on the API's own error message", async () => {
    vi.mocked(api.createAccessToken).mockRejectedValue(new api.ApiError(422, "Name must not be blank"));
    expect(await createAccessTokenAction(nothing, form("x"))).toEqual({
      error: "Name must not be blank",
      created: null,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says no token was created for any other failure, and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.createAccessToken).mockRejectedValue(new TypeError("fetch failed"));
    const state = await createAccessTokenAction(nothing, form("x"));
    expect(state.error).toMatch(/No token was created/);
    expect(state.created).toBeNull();
    expect(log).toHaveBeenCalled();
  });
});

describe("revokeAccessTokenAction", () => {
  it("revokes the token as the signed-in job seeker, then refreshes the list", async () => {
    expect(await revokeAccessTokenAction("t1")).toEqual({ ok: true });
    expect(api.revokeAccessToken).toHaveBeenCalledWith("seeker-1", "t1");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("treats a token that is already gone as revoked", async () => {
    vi.mocked(api.revokeAccessToken).mockRejectedValue(new api.ApiError(404, "Access token not found"));
    expect(await revokeAccessTokenAction("t1")).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("asks a signed-out job seeker to sign in again, without calling the API", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    expect(await revokeAccessTokenAction("t1")).toEqual({ ok: false, error: "Your session has ended. Sign in again." });
    expect(api.revokeAccessToken).not.toHaveBeenCalled();
  });

  it("reports a failure without refreshing, so the token still shows", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.revokeAccessToken).mockRejectedValue(new TypeError("fetch failed"));
    const result = await revokeAccessTokenAction("t1");
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/was not revoked/) });
    expect(refresh).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();

    vi.mocked(api.revokeAccessToken).mockRejectedValue(new api.ApiError(500, "Request failed (500)"));
    expect(await revokeAccessTokenAction("t1")).toEqual({ ok: false, error: "Request failed (500)" });
  });
});
