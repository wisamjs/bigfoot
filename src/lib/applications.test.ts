import { describe, expect, it } from "vitest";
import { getStats, type Application, type Interview } from "./applications";

function interview(id: string, at: string | null, completed: boolean): Interview {
  return {
    id,
    application_id: "a",
    kind: "technical",
    at,
    completed,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function app(company: string, over: Partial<Application> = {}): Application {
  return {
    id: company,
    company,
    title: "Engineer",
    posting_url: null,
    location: null,
    salary: null,
    applied_on: "2026-01-01",
    status: "in_progress",
    outcome: null,
    interviews: [],
    is_waiting: true,
    waiting_since: "2026-01-01",
    is_sample: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("getStats", () => {
  it("counts Open and Active and finds the soonest upcoming Interview of In Progress Applications", () => {
    const later = app("Later", { is_waiting: false, interviews: [interview("1", "2030-02-01T15:00:00Z", false)] });
    const sooner = app("Sooner", { is_waiting: false, interviews: [interview("2", "2030-01-01T15:00:00Z", false)] });
    const doneWithUpcoming = app("Done", {
      status: "done",
      outcome: "rejected",
      is_waiting: false,
      interviews: [interview("3", "2029-01-01T15:00:00Z", false)],
    });
    const waiting = app("Waiting", { interviews: [interview("4", "2020-01-01T15:00:00Z", true)] });

    const stats = getStats([later, sooner, doneWithUpcoming, waiting]);

    expect(stats.open).toBe(3);
    expect(stats.active).toBe(2);
    expect(stats.next?.application.company).toBe("Sooner");
  });

  it("has no next Interview when nothing is scheduled", () => {
    expect(getStats([app("New")]).next).toBeNull();
  });
});
