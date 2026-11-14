import { describe, expect, it } from "vitest";
import { getBoardColumns, getCalendarInterviews, type Application, type Interview } from "./applications";

function interview(id: string, at: string | null, completed: boolean): Interview {
  return { id, application_id: "a", kind: "technical", at, completed, created_at: "", updated_at: "" };
}

function application(id: string, overrides: Partial<Application>): Application {
  return {
    id,
    company: id,
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
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const waiting = application("waiting", {});
const scheduled = application("scheduled", {
  is_waiting: false,
  interviews: [interview("past", "2026-11-02T15:00:00Z", true), interview("next", "2026-12-01T15:00:00Z", false)],
});
const offer = application("offer", { status: "done", outcome: "offer", is_waiting: false });
const rejected = application("rejected", {
  status: "done",
  outcome: "rejected",
  is_waiting: false,
  interviews: [interview("old", "2026-11-03T15:00:00Z", true)],
});

describe("getBoardColumns", () => {
  it("has Waiting, Interview scheduled and Offer, and leaves other Done Applications off", () => {
    const columns = getBoardColumns([waiting, scheduled, offer, rejected]);
    expect(columns.map((c) => [c.label, c.applications.map((a) => a.id)])).toEqual([
      ["Waiting", ["waiting"]],
      ["Interview scheduled", ["scheduled"]],
      ["Offer", ["offer"]],
    ]);
  });

  it("leaves empty columns out", () => {
    expect(getBoardColumns([scheduled]).map((c) => c.id)).toEqual(["scheduled"]);
    expect(getBoardColumns([rejected])).toEqual([]);
  });
});

describe("getCalendarInterviews", () => {
  it("keeps past and upcoming dated Interviews of In Progress Applications, by date", () => {
    const undated = application("undated", { is_waiting: false, interviews: [interview("none", null, true)] });
    const result = getCalendarInterviews([scheduled, rejected, undated]);
    expect(result.map((d) => d.interview.id)).toEqual(["past", "next"]);
  });
});
