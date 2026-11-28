import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeJwt } from "jose";
import {
  ApiError,
  changeShareLinkPasscode,
  createAccessToken,
  createApplication,
  createInterview,
  createShareLink,
  deleteAccount,
  deleteApplication,
  deleteInterview,
  getApplications,
  getJobSeeker,
  getJourney,
  getShareLinkStatus,
  listAccessTokens,
  listApplications,
  listInterviews,
  listShareLinks,
  onboard,
  openShareLink,
  previewJourney,
  renewShareLink,
  revokeAccessToken,
  stopSharing,
  updateApplication,
  updateInterview,
} from "./api";

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

describe("previewJourney (BIG-198)", () => {
  it("reads the job seeker's own Journey with a token naming them, not a Viewer token", async () => {
    fetchMock.mockImplementation(async () => Response.json({ shared_by: null, applications: [], other_completed_interviews: [] }));
    expect(await previewJourney("seeker-1")).toEqual({ shared_by: null, applications: [], other_completed_interviews: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/me\/journey$/);
    expect(init.headers.authorization).toMatch(/^Bearer /);
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

    fetchMock.mockImplementation(async () => Response.json({ shared_by: null, applications: [], other_completed_interviews: [] }));
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

describe("a job seeker's requests", () => {
  it("refuses to send anything without API_SECRET", async () => {
    vi.stubEnv("API_SECRET", "");
    await expect(listApplications("seeker-1")).rejects.toThrow("API_SECRET is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs a short-lived token for the job seeker, for the API alone", async () => {
    await listApplications("seeker-1");
    const token = fetchMock.mock.calls[0][1].headers.authorization.replace("Bearer ", "");
    const claims = decodeJwt(token);
    expect(claims).toMatchObject({ sub: "seeker-1", iss: "bigfoot-web", aud: "bigfoot-api" });
    expect(claims.exp! - claims.iat!).toBe(60);
  });

  it("is never cached by fetch", async () => {
    await listApplications("seeker-1");
    expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
  });

  const changes = { company: "Maple" };
  it.each<[string, () => Promise<unknown>, string, string, unknown]>([
    ["onboard", () => onboard("s"), "POST", "/me/onboard", undefined],
    ["deleteAccount", () => deleteAccount("s"), "DELETE", "/me", undefined],
    ["listAccessTokens", () => listAccessTokens("s"), "GET", "/me/access-tokens", undefined],
    ["createAccessToken", () => createAccessToken("s", "Cron"), "POST", "/me/access-tokens", { name: "Cron" }],
    ["revokeAccessToken", () => revokeAccessToken("s", "t/1"), "DELETE", "/me/access-tokens/t%2F1", undefined],
    ["listShareLinks", () => listShareLinks("s"), "GET", "/me/share-links", undefined],
    [
      "createShareLink",
      () => createShareLink("s", "Mum", "maple-river-42", "Wisam Zaghal"),
      "POST",
      "/me/share-links",
      { label: "Mum", passcode: "maple-river-42", shared_by: "Wisam Zaghal" },
    ],
    ["renewShareLink", () => renewShareLink("s", "k7Qm2x9PaB"), "POST", "/me/share-links/k7Qm2x9PaB/renew", undefined],
    [
      "changeShareLinkPasscode",
      () => changeShareLinkPasscode("s", "k7Qm2x9PaB", "otter-lake-77"),
      "PUT",
      "/me/share-links/k7Qm2x9PaB/passcode",
      { passcode: "otter-lake-77" },
    ],
    ["stopSharing", () => stopSharing("s", "k7Qm2x9PaB"), "DELETE", "/me/share-links/k7Qm2x9PaB", undefined],
    ["createApplication", () => createApplication("s", changes), "POST", "/applications", changes],
    ["updateApplication", () => updateApplication("s", "a 1", changes), "PATCH", "/applications/a%201", changes],
    ["deleteApplication", () => deleteApplication("s", "a1"), "DELETE", "/applications/a1", undefined],
    ["listInterviews", () => listInterviews("s", "a1"), "GET", "/applications/a1/interviews", undefined],
    [
      "createInterview",
      () => createInterview("s", "a1", { title: "Screen" }),
      "POST",
      "/applications/a1/interviews",
      { title: "Screen" },
    ],
    [
      "updateInterview",
      () => updateInterview("s", "a1", "i1", { title: "Screen" }),
      "PATCH",
      "/applications/a1/interviews/i1",
      { title: "Screen" },
    ],
    [
      "createInterview, Date TBD",
      () => createInterview("s", "a1", { title: "Screen", at: null, unscheduled: true }),
      "POST",
      "/applications/a1/interviews",
      { title: "Screen", at: null },
    ],
    [
      "updateInterview, Date TBD turned off",
      () => updateInterview("s", "a1", "i1", { at: "2026-12-01T15:00:00.000Z", unscheduled: false }),
      "PATCH",
      "/applications/a1/interviews/i1",
      { at: "2026-12-01T15:00:00.000Z" },
    ],
    ["deleteInterview", () => deleteInterview("s", "a1", "i1"), "DELETE", "/applications/a1/interviews/i1", undefined],
  ])("%s sends its method, path and body", async (_, call, method, path, body) => {
    await call();
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe(path);
    expect(init.method).toBe(method);
    if (body === undefined) {
      expect(init.body).toBeUndefined();
      expect(init.headers["content-type"]).toBeUndefined();
    } else {
      expect(JSON.parse(init.body)).toEqual(body);
      expect(init.headers["content-type"]).toBe("application/json");
    }
  });

  it("returns nothing for 204 No Content", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
    expect(await deleteApplication("seeker-1", "a1")).toBeUndefined();
  });

  it("reads the job seeker's record, null when they were never onboarded, and rethrows anything else", async () => {
    fetchMock.mockImplementation(async () => Response.json({ job_seeker_id: "seeker-1" }));
    expect(await getJobSeeker("seeker-1")).toEqual({ job_seeker_id: "seeker-1" });
    fetchMock.mockImplementation(async () => Response.json({ detail: "Not found" }, { status: 404 }));
    expect(await getJobSeeker("seeker-1")).toBeNull();
    fetchMock.mockImplementation(async () => Response.json({ detail: "Down" }, { status: 500 }));
    await expect(getJobSeeker("seeker-1")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("the API's errors", () => {
  async function refusal(body: BodyInit | null, status = 422) {
    fetchMock.mockImplementation(async () => new Response(body, { status }));
    try {
      await createApplication("seeker-1", {});
    } catch (error) {
      return error as ApiError;
    }
    throw new Error("expected a refusal");
  }

  it("keeps a plain message as it is", async () => {
    const error = await refusal(JSON.stringify({ detail: "Too many Share links" }), 409);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: "Too many Share links", fieldErrors: undefined });
  });

  it("words each validation problem to stand alone beside its field", async () => {
    const error = await refusal(
      JSON.stringify({
        detail: [
          { loc: ["body", "company"], msg: "Value error, can't be blank" },
          { loc: ["body", "applied_on"], msg: "must be a date" },
        ],
      }),
    );
    expect(error.message).toBe("Company can't be blank; Applied date must be a date");
    expect(error.fieldErrors).toEqual({ company: "Company can't be blank", applied_on: "Applied date must be a date" });
  });

  it("says 'A field' for a field it doesn't know, and leaves that field out of fieldErrors", async () => {
    const error = await refusal(JSON.stringify({ detail: [{ loc: ["body", "colour"], msg: "isn't allowed" }, {}] }));
    expect(error.message).toBe("A field isn't allowed; A field is invalid");
    expect(error.fieldErrors).toEqual({});
  });

  it.each([
    ["a body that isn't JSON", "<html>Bad gateway</html>"],
    ["a detail of another shape", JSON.stringify({ detail: { code: 7 } })],
    ["no body", null],
  ])("falls back to the status for %s", async (_, body) => {
    const error = await refusal(body, 502);
    expect(error.message).toBe("Request failed (502)");
  });
});
