import { updateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOut } from "@/auth";
import { findCurrentUser } from "@/lib/dal";
import { signOutAction } from "./actions";

vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/dal", () => ({ findCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

const user = { id: "seeker-1", name: "Sam", firstName: "Sam", email: "sam@example.com", image: null };

beforeEach(() => vi.resetAllMocks());

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
