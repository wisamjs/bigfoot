import type { NextAuthConfig } from "next-auth";
import { describe, expect, it, vi } from "vitest";
import { SESSION_MAX_AGE_DAYS } from "@/lib/session";

// Auth.js itself is a library: these tests check the configuration Bigfoot hands it.
vi.mock("next-auth", () => ({ default: vi.fn(() => ({})) }));
vi.mock("next-auth/providers/google", () => ({ default: "google" }));
vi.mock("@/lib/api", () => ({ onboard: vi.fn(async () => ({ samples_seeded: true })) }));

const NextAuth = (await import("next-auth")).default;
await import("./auth");
const { onboard } = await import("@/lib/api");
const config = vi.mocked(NextAuth).mock.calls[0][0] as NextAuthConfig;
const callbacks = config.callbacks!;

describe("the Auth.js configuration", () => {
  it("keeps a sign-in for the stated number of days", () => {
    expect(config.session?.maxAge).toBe(SESSION_MAX_AGE_DAYS * 24 * 60 * 60);
    expect(config.pages).toEqual({ signIn: "/sign-in", error: "/" });
  });

  it("onboards the Google account on sign-in, and refuses a sign-in with none", async () => {
    const signIn = callbacks.signIn as (params: { account: { providerAccountId?: string } | null }) => Promise<boolean>;
    expect(await signIn({ account: { providerAccountId: "g-1" } })).toBe(true);
    expect(onboard).toHaveBeenCalledWith("g-1");
    vi.mocked(onboard).mockClear();
    expect(await signIn({ account: null })).toBe(false);
    expect(onboard).not.toHaveBeenCalled();
  });

  it("pins the token's subject to the Google account id, and the session's user id to it", () => {
    const jwt = callbacks.jwt as (params: { token: { sub?: string }; account?: { providerAccountId?: string } | null }) => { sub?: string };
    expect(jwt({ token: { sub: "random-uuid" }, account: { providerAccountId: "g-1" } })).toEqual({ sub: "g-1" });
    expect(jwt({ token: { sub: "g-1" }, account: null })).toEqual({ sub: "g-1" });

    const session = callbacks.session as unknown as (params: { session: { user: { id?: string } }; token: { sub?: string } }) => {
      user: { id?: string };
    };
    expect(session({ session: { user: {} }, token: { sub: "g-1" } }).user.id).toBe("g-1");
    expect(session({ session: { user: {} }, token: {} }).user.id).toBeUndefined();
  });
});
