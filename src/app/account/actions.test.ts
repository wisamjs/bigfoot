import { refresh, updateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { signOut } from "@/auth";
import { findCurrentUser } from "@/lib/dal";
import {
  changePasscodeAction,
  createAccessTokenAction,
  createShareLinkAction,
  deleteAccountAction,
  renewShareLinkAction,
  revokeAccessTokenAction,
  stopSharingAction,
} from "./actions";

// The API client is mocked at its module, keeping ApiError real so actions can tell it apart.
vi.mock("@/lib/api", async () => {
  const { ApiError } = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ApiError,
    createAccessToken: vi.fn(),
    revokeAccessToken: vi.fn(),
    deleteAccount: vi.fn(),
    createShareLink: vi.fn(),
    renewShareLink: vi.fn(),
    changeShareLinkPasscode: vi.fn(),
    stopSharing: vi.fn(),
  };
});
vi.mock("@/lib/dal", () => ({ findCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn() }));
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
  last_used_at: null,
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

const shareLink = {
  id: "k7Qm2x9PaB",
  label: "Mom & Dad",
  created_at: "2026-11-20T12:00:00Z",
  passcode_set_at: "2026-11-20T12:00:00Z",
  expires_at: "2026-11-27T12:00:00Z",
  last_opened_at: null,
  expired: false,
};

function shareForm(label: string | null, passcode: string | null) {
  const data = new FormData();
  if (label !== null) data.set("label", label);
  if (passcode !== null) data.set("passcode", passcode);
  return data;
}

describe("createShareLinkAction", () => {
  const created = { ...shareLink, passcode: "maple-river-42" };

  it("creates the link as the signed-in job seeker, returns its Passcode and refreshes the list", async () => {
    vi.mocked(api.createShareLink).mockResolvedValue(created);
    expect(await createShareLinkAction(nothing, shareForm("Mom & Dad", "maple-river-42"))).toEqual({ error: null, created });
    expect(api.createShareLink).toHaveBeenCalledWith("seeker-1", "Mom & Dad", "maple-river-42");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("asks a signed-out job seeker to sign in again, without calling the API", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    expect(await createShareLinkAction(nothing, shareForm("Mom", "maple-river-42"))).toEqual({
      error: "Your session has ended. Sign in again.",
      created: null,
    });
    expect(api.createShareLink).not.toHaveBeenCalled();
  });

  it("checks both fields with the form's rules, without calling the API, because anyone can call it", async () => {
    expect(await createShareLinkAction(nothing, shareForm(null, "short"))).toEqual({
      error: null,
      labelError: "Say who the link is for.",
      passcodeError: "Use at least 8 characters.",
      created: null,
    });
    expect(await createShareLinkAction(nothing, shareForm("Mom", null))).toMatchObject({ labelError: null });
    expect(api.createShareLink).not.toHaveBeenCalled();
  });

  it("passes on the API's message, such as the 10-link limit, and says no link was created otherwise", async () => {
    vi.mocked(api.createShareLink).mockRejectedValue(new api.ApiError(409, "You can share with up to 10 people."));
    expect(await createShareLinkAction(nothing, shareForm("Mom", "maple-river-42"))).toEqual({
      error: "You can share with up to 10 people.",
      created: null,
    });

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.createShareLink).mockRejectedValue(new TypeError("fetch failed"));
    expect((await createShareLinkAction(nothing, shareForm("Mom", "maple-river-42"))).error).toMatch(/No link was created/);
    expect(log).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("renewShareLinkAction", () => {
  it("renews the link as the signed-in job seeker, then refreshes the list", async () => {
    vi.mocked(api.renewShareLink).mockResolvedValue(shareLink);
    expect(await renewShareLinkAction("k7Qm2x9PaB")).toEqual({ ok: true, link: shareLink });
    expect(api.renewShareLink).toHaveBeenCalledWith("seeker-1", "k7Qm2x9PaB");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("asks a signed-out job seeker to sign in again", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    expect(await renewShareLinkAction("k7Qm2x9PaB")).toEqual({ ok: false, error: "Your session has ended. Sign in again." });
    expect(api.renewShareLink).not.toHaveBeenCalled();
  });

  it("reports a failure without refreshing", async () => {
    vi.mocked(api.renewShareLink).mockRejectedValue(new api.ApiError(404, "Share link not found"));
    expect(await renewShareLinkAction("k7Qm2x9PaB")).toEqual({ ok: false, error: "Share link not found" });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("changePasscodeAction", () => {
  it("sets the new Passcode as the signed-in job seeker and returns it once", async () => {
    const changed = { ...shareLink, passcode: "otter-lake-77" };
    vi.mocked(api.changeShareLinkPasscode).mockResolvedValue(changed);
    expect(await changePasscodeAction("k7Qm2x9PaB", "otter-lake-77")).toEqual({ ok: true, link: changed });
    expect(api.changeShareLinkPasscode).toHaveBeenCalledWith("seeker-1", "k7Qm2x9PaB", "otter-lake-77");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("checks the Passcode first, and asks a signed-out job seeker to sign in again", async () => {
    expect(await changePasscodeAction("k7Qm2x9PaB", "short")).toEqual({ ok: false, error: "Use at least 8 characters." });
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    expect(await changePasscodeAction("k7Qm2x9PaB", "otter-lake-77")).toEqual({
      ok: false,
      error: "Your session has ended. Sign in again.",
    });
    expect(api.changeShareLinkPasscode).not.toHaveBeenCalled();
  });

  it("says the Passcode was not changed when the server can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.changeShareLinkPasscode).mockRejectedValue(new TypeError("fetch failed"));
    expect(await changePasscodeAction("k7Qm2x9PaB", "otter-lake-77")).toEqual({
      ok: false,
      error: expect.stringMatching(/The passcode was not changed/),
    });
  });
});

describe("stopSharingAction", () => {
  it("stops sharing as the signed-in job seeker, then refreshes the list", async () => {
    expect(await stopSharingAction("k7Qm2x9PaB")).toEqual({ ok: true });
    expect(api.stopSharing).toHaveBeenCalledWith("seeker-1", "k7Qm2x9PaB");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("treats a link that is already gone as stopped", async () => {
    vi.mocked(api.stopSharing).mockRejectedValue(new api.ApiError(404, "Share link not found"));
    expect(await stopSharingAction("k7Qm2x9PaB")).toEqual({ ok: true });
  });

  it("asks a signed-out job seeker to sign in again", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    expect(await stopSharingAction("k7Qm2x9PaB")).toEqual({ ok: false, error: "Your session has ended. Sign in again." });
    expect(api.stopSharing).not.toHaveBeenCalled();
  });

  it("reports a failure without refreshing, so the link still shows", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.stopSharing).mockRejectedValue(new TypeError("fetch failed"));
    expect(await stopSharingAction("k7Qm2x9PaB")).toEqual({ ok: false, error: expect.stringMatching(/The link still works/) });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("deleteAccountAction", () => {
  function confirmation(text: string) {
    const data = new FormData();
    data.set("confirmation", text);
    return data;
  }

  it("deletes the account, drops the job seeker's cached Applications and signs them out", async () => {
    await deleteAccountAction({ error: null }, confirmation("DELETE"));
    expect(api.deleteAccount).toHaveBeenCalledWith("seeker-1");
    expect(updateTag).toHaveBeenCalledExactlyOnceWith("applications:seeker-1");
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("keeps the cache when the account isn't deleted", async () => {
    await deleteAccountAction({ error: null }, confirmation("nope"));
    expect(api.deleteAccount).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
