import { describe, expect, it } from "vitest";
import { getBoardColumns, getCalendarInterviews, getStats, type Application, type Interview } from "./applications";

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

  it("adds a Done column for Done Applications other than Offers when asked", () => {
    const columns = getBoardColumns([waiting, offer, rejected], { showDone: true });
    expect(columns.map((c) => [c.id, c.applications.map((a) => a.id)])).toEqual([
      ["waiting", ["waiting"]],
      ["offer", ["offer"]],
      ["done", ["rejected"]],
    ]);
  });
});

describe("getCalendarInterviews", () => {
  it("keeps past and upcoming dated Interviews of In Progress Applications, by date", () => {
    const undated = application("undated", { is_waiting: false, interviews: [interview("none", null, true)] });
    const result = getCalendarInterviews([scheduled, rejected, undated]);
    expect(result.map((d) => d.interview.id)).toEqual(["past", "next"]);
  });
});

describe("getStats", () => {
  it("counts Open and Active, and finds the soonest upcoming Interview of In Progress Applications", () => {
    const sooner = application("sooner", {
      is_waiting: false,
      interviews: [interview("soon", "2026-11-20T15:00:00Z", false)],
    });
    const stats = getStats([waiting, scheduled, sooner, offer, rejected]);
    expect(stats.open).toBe(3);
    expect(stats.active).toBe(2);
    expect(stats.next?.application.id).toBe("sooner");
  });

  it("has no next Interview when nothing is scheduled", () => {
    expect(getStats([waiting, rejected]).next).toBeNull();
  });
});
