import { updateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signOut } from "@/auth";
import { findCurrentUser } from "@/lib/dal";
import { signInWithGoogle, signOutAction } from "./actions";

vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/dal", () => ({ findCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

const user = { id: "seeker-1", name: "Sam", firstName: "Sam", email: "sam@example.com", image: null };

beforeEach(() => vi.resetAllMocks());

describe("signInWithGoogle", () => {
  function form(next?: string) {
    const data = new FormData();
    if (next !== undefined) data.set("next", next);
    return data;
  }

  it("returns to next when it is a path on Bigfoot", async () => {
    await signInWithGoogle(form("/applications/a1/interviews/i1"));
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/applications/a1/interviews/i1" });
  });

  it.each([["no next", undefined], ["another site", "https://evil.example"], ["a protocol-relative URL", "//evil.example"]])(
    "goes to the dashboard for %s",
    async (_, next) => {
      await signInWithGoogle(form(next));
      expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/dashboard" });
    },
  );
});

describe("signOutAction", () => {
  it("drops the job seeker's cached Applications, then signs them out", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(user);
    await signOutAction();
    expect(updateTag).toHaveBeenCalledExactlyOnceWith("applications:seeker-1");
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("still signs out a session that has already ended", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    await signOutAction();
    expect(updateTag).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledOnce();
  });
});
