import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";

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

describe("proxy", () => {
  it("runs only on the landing page, /sign-in and /sign-up", () => {
    expect(config.matcher).toEqual(["/", "/sign-in", "/sign-up"]);
  });

  it.each(["/", "/sign-in", "/sign-up"])("redirects a job seeker with a valid session from %s to /dashboard", (path) => {
    const response = (proxy as unknown as Handler)(request(path, session));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost:3300/dashboard");
  });

  it("lets the page render without a valid session", () => {
    expect((proxy as unknown as Handler)(request("/", null))).toBeUndefined();
  });

  it("lets the page render for a session that names no job seeker, as the dashboard would reject it", () => {
    const noEmail = { ...session, user: { id: "google-123" } };
    expect((proxy as unknown as Handler)(request("/", noEmail))).toBeUndefined();
  });

  it("lets the Google button's Server Action POST through", () => {
    expect((proxy as unknown as Handler)(request("/sign-in", session, "POST"))).toBeUndefined();
  });
});
