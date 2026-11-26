import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";
import { signInHref } from "@/lib/safe-next";

// auth(handler) attaches the decrypted session as request.auth (null when missing, expired or
// invalid); stand in with a pass-through so the handler can be called with any session.
vi.mock("@/auth", () => ({ auth: (handler: unknown) => handler }));

const { proxy, config } = await import("./proxy");
type Handler = (request: NextRequest & { auth: Session | null }) => Response | undefined;

const session: Session = {
  user: { id: "google-123", name: "Sam Rivera", email: "sam@example.com" },
  expires: "2026-12-21T00:00:00.000Z",
};

function request(path: string, auth: Session | null, method = "GET") {
  const url = new URL(path, "http://localhost:3300");
  return { method, auth, nextUrl: url, url: url.href } as unknown as NextRequest & { auth: Session | null };
}

const run = (path: string, auth: Session | null, method?: string) =>
  (proxy as unknown as Handler)(request(path, auth, method));

describe("proxy", () => {
  it("runs on the signed-out pages and the signed-in ones", () => {
    expect(config.matcher).toEqual([
      "/",
      "/sign-in",
      "/sign-up",
      "/dashboard",
      "/applications/:path*",
      "/interviews/:path*",
      "/account",
      "/account/journey-preview",
    ]);
  });

  it("leaves a Share link's pages to anyone, signed in or not (BIG-197)", () => {
    for (const pattern of config.matcher) expect(pattern).not.toMatch(/^\/(journey|s)(\/|$)/);
  });

  it.each(["/", "/sign-in", "/sign-up"])("redirects a job seeker with a valid session from %s to /dashboard", (path) => {
    const response = run(path, session);
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost:3300/dashboard");
  });

  it("sends a signed-in job seeker on to /sign-in's next", () => {
    const response = run(signInHref("/applications/a1/interviews/i1"), session);
    expect(response?.headers.get("location")).toBe("http://localhost:3300/applications/a1/interviews/i1");
  });

  it("ignores a next that leaves Bigfoot", () => {
    const response = run(signInHref("//evil.example"), session);
    expect(response?.headers.get("location")).toBe("http://localhost:3300/dashboard");
  });

  it("lets a signed-out page render without a valid session", () => {
    expect(run("/", null)).toBeUndefined();
  });

  it("lets the page render for a session that names no job seeker, as the dashboard would reject it", () => {
    const noEmail = { ...session, user: { id: "google-123" } };
    expect(run("/", noEmail)).toBeUndefined();
  });

  it("lets the Google button's Server Action POST through", () => {
    expect(run("/sign-in", session, "POST")).toBeUndefined();
  });

  it.each(["/dashboard?month=2026-12&day=2026-12-04", "/applications/a1/interviews/i1", "/account", "/account/journey-preview"])(
    "sends a signed-out visitor from %s to /sign-in, with the page as next",
    (path) => {
      const response = run(path, null);
      expect(response?.status).toBe(307);
      const location = new URL(response?.headers.get("location") ?? "");
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("next")).toBe(path);
    },
  );

  it("lets a signed-in job seeker open a signed-in page", () => {
    expect(run("/applications/a1/interviews/i1", session)).toBeUndefined();
  });

  it("lets a signed-out Server Action POST through to answer for itself", () => {
    expect(run("/applications/a1", null, "POST")).toBeUndefined();
  });
});
