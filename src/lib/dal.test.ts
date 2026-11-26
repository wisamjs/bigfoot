import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { connection } = await import("next/server");
const { redirect } = await import("next/navigation");
const { auth } = await import("@/auth");
const { findCurrentUser, getCurrentUser } = await import("./dal");

const signedIn = { user: { id: "g-1", name: "Wisam Zaghal", email: "wisam@example.com" }, expires: "2026-12-25T00:00:00Z" };

afterEach(() => vi.clearAllMocks());

describe("findCurrentUser", () => {
  it("opts into request time before reading the session", async () => {
    vi.mocked(auth).mockImplementation((async () => {
      expect(connection).toHaveBeenCalledOnce();
      return signedIn;
    }) as never);
    expect(await findCurrentUser()).toMatchObject({ id: "g-1", firstName: "Wisam" });
  });

  it("is null when nobody is signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect(await findCurrentUser()).toBeNull();
  });
});

describe("getCurrentUser", () => {
  it("returns the signed-in job seeker", async () => {
    vi.mocked(auth).mockResolvedValue(signedIn as never);
    expect(await getCurrentUser()).toMatchObject({ id: "g-1", email: "wisam@example.com" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends anyone signed out to the landing page", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(getCurrentUser()).rejects.toThrow("NEXT_REDIRECT /");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
