import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApplications, getJourney, getShareLinkStatus, listApplications, openShareLink } from "./api";

// `use cache` and next/cache's cacheTag/cacheLife only work inside a Next.js build, so these tests
// check what the cached read does on a miss. That it is kept, tagged per job seeker and expired by
// the Server Actions is covered by the actions' tests and by the browser check in the PR.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ setUser: vi.fn() }));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("API_SECRET", "test-secret-test-secret-test-secret");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => Response.json([{ id: "app-1" }]));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("getApplications", () => {
  it("reads the job seeker's own Applications from the API, with a token naming them", async () => {
    expect(await getApplications("seeker-1")).toEqual([{ id: "app-1" }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/applications$/);
    expect(init.method).toBe("GET");
    expect(init.headers.authorization).toMatch(/^Bearer /);
  });

  it("names the job seeker to Sentry once, outside the cached read, as listApplications does", async () => {
    await getApplications("seeker-1");
    expect(Sentry.setUser).toHaveBeenCalledOnce();
    vi.mocked(Sentry.setUser).mockClear();
    await listApplications("seeker-1");
    expect(Sentry.setUser).toHaveBeenCalledOnce();
  });
});

describe("a Viewer's requests (docs/adr/0008)", () => {
  it("reads a Share link's status with no token, and null when no link has the id", async () => {
    fetchMock.mockImplementation(async () => Response.json({ shared_by: "Wisam", expired: false, locked: false }));
    expect(await getShareLinkStatus("k7Qm2x9PaB")).toEqual({ shared_by: "Wisam", expired: false, locked: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/share-links\/k7Qm2x9PaB$/);
    expect(init.headers.authorization).toBeUndefined();

    fetchMock.mockImplementation(async () => Response.json({ detail: "This link isn't active" }, { status: 404 }));
    expect(await getShareLinkStatus("k7Qm2x9PaB")).toBeNull();
    fetchMock.mockImplementation(async () => Response.json({ detail: "Down" }, { status: 503 }));
    await expect(getShareLinkStatus("k7Qm2x9PaB")).rejects.toMatchObject({ status: 503 });
  });

  it("sends the Passcode with no token, and the Journey request with the Viewer token alone", async () => {
    fetchMock.mockImplementation(async () => Response.json({ token: "viewer", expires_at: "2026-12-02T15:00:00Z" }));
    expect(await openShareLink("k7Qm2x9PaB", "maple-river-42")).toMatchObject({ token: "viewer" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/share-links\/k7Qm2x9PaB\/viewer-token$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ passcode: "maple-river-42" });
    expect(init.headers.authorization).toBeUndefined();

    fetchMock.mockImplementation(async () => Response.json({ shared_by: null, applications: [] }));
    await getJourney("k7Qm2x9PaB", "viewer");
    expect(fetchMock.mock.calls[1][1].headers.authorization).toBe("Bearer viewer");
  });

  it("turns a refusal into an ApiError with the API's message", async () => {
    fetchMock.mockImplementation(async () => Response.json({ detail: "That Passcode didn't match" }, { status: 401 }));
    await expect(openShareLink("k7Qm2x9PaB", "otter-lake-7")).rejects.toMatchObject({
      status: 401,
      message: "That Passcode didn't match",
    });
  });
});
