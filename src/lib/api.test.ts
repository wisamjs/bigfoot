import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApplications, listApplications } from "./api";

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
