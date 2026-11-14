import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application } from "@/lib/applications";
import type { CurrentUser } from "@/lib/dal";

// A fake API holding two job seekers' Applications, scoped the way FastAPI scopes them.
const store: Record<string, Application[]> = {};
let signedIn: CurrentUser | null = null;

vi.mock("@/lib/dal", () => ({ findCurrentUser: async () => signedIn }));
vi.mock("@/lib/api", () => ({
  listApplications: async (jobSeekerId: string) => store[jobSeekerId] ?? [],
  getJobSeeker: async (jobSeekerId: string) => ({
    job_seeker_id: jobSeekerId,
    created_at: "2026-11-10T12:00:00Z",
    samples_seeded_at: null,
    last_seen_at: "2026-11-13T12:00:00Z",
  }),
}));

const { GET } = await import("./route");

function user(id: string): CurrentUser {
  return { id, name: id, firstName: id, email: `${id}@example.com`, image: null };
}

function app(id: string, company: string): Application {
  return {
    id,
    company,
    title: "Engineer",
    posting_url: null,
    location: null,
    salary: null,
    applied_on: "2026-11-01",
    status: "in_progress",
    outcome: null,
    interviews: [],
    is_waiting: true,
    waiting_since: "2026-11-01",
    is_sample: false,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };
}

const get = (format: string) => GET(new Request(`http://localhost/account/export?format=${format}`));

beforeEach(() => {
  store.alice = [app("a1", "Alice Corp")];
  store.bob = [app("b1", "Bob Corp"), app("b2", "Bob Two")];
  signedIn = user("alice");
});

describe("GET /account/export", () => {
  it("sends a signed-out visitor to the landing page", async () => {
    signedIn = null;
    const res = await get("csv");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("rejects an unknown format", async () => {
    expect((await get("xml")).status).toBe(400);
  });

  it("excludes another job seeker's Applications from the CSV", async () => {
    const csv = await (await get("csv")).text();
    expect(csv).toContain("Alice Corp");
    expect(csv).not.toContain("Bob");
  });

  it("excludes another job seeker's Applications and profile from the JSON", async () => {
    const res = await get("json");
    const data = await res.json();
    expect(data.applications.map((a: Application) => a.id)).toEqual(["a1"]);
    expect(data.profile.google_account_id).toBe("alice");
    expect(JSON.stringify(data)).not.toContain("bob");
  });

  it("downloads as a dated file that is never cached", async () => {
    const res = await get("csv");
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="bigfoot-export-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});
