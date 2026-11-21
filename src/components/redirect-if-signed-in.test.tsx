import { beforeEach, describe, expect, it, vi } from "vitest";
import { findCurrentUser, type CurrentUser } from "@/lib/dal";
import { RedirectWhenSignedIn } from "./redirect-if-signed-in";

// next/navigation's redirect() throws to stop rendering; stand in with a throw we can assert on.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect ${path}`);
  }),
}));
vi.mock("@/lib/dal", () => ({ findCurrentUser: vi.fn() }));

const jobSeeker: CurrentUser = {
  id: "google-123",
  name: "Sam Rivera",
  firstName: "Sam",
  email: "sam@example.com",
  image: null,
};

describe("RedirectWhenSignedIn", () => {
  beforeEach(() => vi.mocked(findCurrentUser).mockReset());

  it("sends a job seeker with a valid session to the dashboard", async () => {
    vi.mocked(findCurrentUser).mockResolvedValue(jobSeeker);
    await expect(RedirectWhenSignedIn()).rejects.toThrow("redirect /dashboard");
  });

  it("renders nothing without a valid session, so the page shows", async () => {
    // findCurrentUser() is null for a missing, expired or invalid session cookie.
    vi.mocked(findCurrentUser).mockResolvedValue(null);
    await expect(RedirectWhenSignedIn()).resolves.toBeNull();
  });
});
