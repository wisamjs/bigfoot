import { refresh } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { findCurrentUser } from "@/lib/dal";
import { deleteInterviewAction, updateApplicationAction } from "./actions";

// The API client is mocked at its module, keeping ApiError real so actions can tell it apart.
vi.mock("@/lib/api", async () => {
  const { ApiError } = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ApiError, updateApplication: vi.fn(), deleteInterview: vi.fn() };
});
vi.mock("@/lib/dal", () => ({ findCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
// @/lib/api imports server-only, which throws outside a React Server Components build.
vi.mock("server-only", () => ({}));

const user = { id: "seeker-1", name: "Sam", firstName: "Sam", email: "sam@example.com", image: null };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findCurrentUser).mockResolvedValue(user);
});

describe("dashboard Server Actions", () => {
  it("make the change as the signed-in job seeker, then refresh the page", async () => {
    expect(await updateApplicationAction("app-1", { company: "Birch" })).toEqual({ ok: true });
    expect(api.updateApplication).toHaveBeenCalledWith("seeker-1", "app-1", { company: "Birch" });
    expect(refresh).toHaveBeenCalledOnce();

    await deleteInterviewAction("app-1", "int-1");
    expect(api.deleteInterview).toHaveBeenCalledWith("seeker-1", "app-1", "int-1");
  });

  it("ask a signed-out job seeker to sign in again, without calling the API", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    expect(await updateApplicationAction("app-1", {})).toEqual({
      ok: false,
      error: "Your session has ended. Sign in again.",
    });
    expect(api.updateApplication).not.toHaveBeenCalled();
  });

  it("pass on the API's own error message", async () => {
    vi.mocked(api.updateApplication).mockRejectedValue(new api.ApiError(422, "Outcome is required"));
    expect(await updateApplicationAction("app-1", { status: "done" })).toEqual({
      ok: false,
      error: "Outcome is required",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("say the server is unreachable for any other failure, and log it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.updateApplication).mockRejectedValue(new TypeError("fetch failed"));
    expect(await updateApplicationAction("app-1", {})).toEqual({
      ok: false,
      error: "Couldn’t reach Bigfoot’s server. Try again.",
    });
    expect(log).toHaveBeenCalled();
  });
});
