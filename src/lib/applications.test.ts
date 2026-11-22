import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getBoardColumns,
  getCalendarInterviews,
  getStats,
  getUpcoming,
  INTERVIEW_KINDS,
  INTERVIEW_OPTIONS,
  lastCompletedInterview,
  nextInterview,
  OUTCOME_OPTIONS,
  OUTCOMES,
  STATUS_OPTIONS,
  STATUSES,
  type Application,
  type Interview,
} from "./applications";

function interview(id: string, at: string | null, completed: boolean): Interview {
  return { id, application_id: "a", kind: "technical", at, notes: null, completed, created_at: "", updated_at: "" };
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

describe("an Interview saved with no date (docs/adr/0005)", () => {
  // As the API sends it: completed, and last, since it has no place by date.
  const legacy = application("legacy", {
    is_waiting: true,
    interviews: [interview("past", "2026-11-02T15:00:00Z", true), interview("none", null, true)],
  });

  it("counts as completed, so its Application stays Waiting and is not Active", () => {
    expect(nextInterview(legacy)).toBeNull();
    expect(getBoardColumns([legacy]).map((c) => c.id)).toEqual(["waiting"]);
    expect(getStats([legacy]).active).toBe(0);
    expect(getUpcoming([legacy])).toEqual([]);
  });

  it("is never the last completed Interview, which is the latest dated one", () => {
    expect(lastCompletedInterview(legacy)?.id).toBe("past");
    expect(lastCompletedInterview(application("only", { interviews: [interview("none", null, true)] }))).toBeNull();
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

describe("getUpcoming", () => {
  it("lists upcoming Interviews of In Progress Applications, soonest first, leaving past and Done ones out", () => {
    const later = application("later", {
      is_waiting: false,
      interviews: [interview("in-2027", "2027-01-05T15:00:00Z", false), interview("in-dec", "2026-12-10T15:00:00Z", false)],
    });
    const doneWithUpcoming = application("done", {
      status: "done",
      outcome: "withdrawn",
      is_waiting: false,
      interviews: [interview("cancelled", "2026-11-30T15:00:00Z", false)],
    });
    const result = getUpcoming([later, scheduled, doneWithUpcoming, waiting]);
    expect(result.map((d) => [d.application.id, d.interview.id])).toEqual([
      ["scheduled", "next"],
      ["later", "in-dec"],
      ["later", "in-2027"],
    ]);
  });
});

/** The values of a `Name = Literal[...]` in api/app/domain.py. */
function pythonLiteral(name: string) {
  const source = readFileSync("api/app/domain.py", "utf8");
  const body = source.match(new RegExp(`^${name} = Literal\\[([^\\]]*)\\]`, "m"))?.[1];
  if (!body) throw new Error(`api/app/domain.py has no ${name} Literal`);
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe.each([
  ["Status", STATUSES, STATUS_OPTIONS],
  ["Outcome", OUTCOMES, OUTCOME_OPTIONS],
  ["InterviewKind", INTERVIEW_KINDS, INTERVIEW_OPTIONS],
] as const)("%s options", (name, values, options) => {
  it("match the API's allowed values, in order", () => {
    expect(values).toEqual(pythonLiteral(name));
  });

  it("give every value a distinct label and nothing else", () => {
    expect(Object.keys(options)).toEqual([...values]);
    const labels = Object.values(options).map((o) => o.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.every((label) => label.trim() !== "")).toBe(true);
  });
});
