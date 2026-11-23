import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applicationProgress,
  calendarDaysBetween,
  prepLookBack,
  prepTakeaways,
  takeawayShowsOn,
  upcomingInterviews,
  getApplicationGroups,
  hasInterviewNotes,
  interviewSections,
  noteBlocks,
  paragraphs,
  parseDay,
  questions,
  relativeDays,
  getCalendarInterviews,
  dashboardSummary,
  getStats,
  getUpcoming,
  INTERVIEW_KINDS,
  INTERVIEW_OPTIONS,
  lastCompletedInterview,
  LOCATION_OPTIONS,
  LOCATIONS,
  locationText,
  nextInterview,
  OUTCOME_OPTIONS,
  OUTCOMES,
  STATUS_OPTIONS,
  STATUSES,
  type Application,
  type Interview,
  type InterviewKind,
} from "./applications";

function interview(id: string, at: string, completed: boolean): Interview {
  return { id, application_id: "a", kind: "technical", at, what_they_asked: null, how_it_went: null, takeaway: null, prep_notes: null, completed, created_at: "", updated_at: "" };
}

function application(id: string, overrides: Partial<Application>): Application {
  return {
    id,
    company: id,
    title: "Engineer",
    posting_url: null,
    location: null,
    office_days: null,
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

describe("getApplicationGroups", () => {
  it("has Waiting, Interview scheduled and Offer, and leaves other Done Applications off", () => {
    const columns = getApplicationGroups([waiting, scheduled, offer, rejected]);
    expect(columns.map((c) => [c.label, c.applications.map((a) => a.id)])).toEqual([
      ["Waiting", ["waiting"]],
      ["Interview scheduled", ["scheduled"]],
      ["Offer", ["offer"]],
    ]);
  });

  it("leaves empty columns out", () => {
    expect(getApplicationGroups([scheduled]).map((c) => c.id)).toEqual(["scheduled"]);
    expect(getApplicationGroups([rejected])).toEqual([]);
  });

  it("adds a Done column for Done Applications other than Offers when asked", () => {
    const columns = getApplicationGroups([waiting, offer, rejected], { showDone: true });
    expect(columns.map((c) => [c.id, c.applications.map((a) => a.id)])).toEqual([
      ["waiting", ["waiting"]],
      ["offer", ["offer"]],
      ["done", ["rejected"]],
    ]);
  });
});

describe("getCalendarInterviews", () => {
  it("keeps past and upcoming Interviews of In Progress Applications, by date", () => {
    const result = getCalendarInterviews([scheduled, rejected]);
    expect(result.map((d) => d.interview.id)).toEqual(["past", "next"]);
  });
});

describe("nextInterview and lastCompletedInterview", () => {
  const app = application("both", {
    is_waiting: false,
    interviews: [
      interview("old", "2026-11-01T15:00:00Z", true),
      interview("recent", "2026-11-02T15:00:00Z", true),
      interview("next", "2026-12-01T15:00:00Z", false),
    ],
  });

  it("finds the soonest one ahead and the latest completed one", () => {
    expect(nextInterview(app)?.id).toBe("next");
    expect(lastCompletedInterview(app)?.id).toBe("recent");
    expect(lastCompletedInterview(application("none", { interviews: [] }))).toBeNull();
  });
});

describe("getStats", () => {
  it("counts In Progress, Offers, upcoming Interviews and Applications waiting to hear back", () => {
    const sooner = application("sooner", {
      is_waiting: false,
      interviews: [interview("soon", "2026-11-20T15:00:00Z", false)],
    });
    const stats = getStats([waiting, scheduled, sooner, offer, rejected]);
    expect(stats.inProgress).toBe(3);
    expect(stats.offers).toBe(1);
    expect(stats.upcoming).toBe(getUpcoming([waiting, scheduled, sooner]).length);
    expect(stats.waiting).toBe(1);
  });
});

describe("dashboardSummary", () => {
  it("says what the search holds, singular and plural", () => {
    expect(dashboardSummary([waiting, offer, rejected])).toBe("1 In Progress · 1 Offer · 0 upcoming Interviews");
    expect(dashboardSummary([rejected])).toBe("0 In Progress · 0 Offers · 0 upcoming Interviews");
  });

  it("says nothing is here without Applications", () => {
    expect(dashboardSummary([])).toBe("Nothing here yet.");
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
  ["Location", LOCATIONS, LOCATION_OPTIONS],
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

describe("locationText", () => {
  it("reads as one line: In-Office, Remote, Hybrid, or Hybrid with its days", () => {
    expect(locationText({ location: "in_office", office_days: null })).toBe("In-Office");
    expect(locationText({ location: "remote", office_days: null })).toBe("Remote");
    expect(locationText({ location: "hybrid", office_days: null })).toBe("Hybrid");
    expect(locationText({ location: "hybrid", office_days: 3 })).toBe("Hybrid - 3x a Week");
  });

  it("is null when no Location is set", () => {
    expect(locationText({ location: null, office_days: null })).toBeNull();
  });
});

describe("interviewSections (BIG-174)", () => {
  it("splits the next Interview from the later ones, and puts the completed ones newest first", () => {
    const app = application("a", {
      interviews: [
        interview("old", "2026-11-01T10:00:00Z", true),
        interview("recent", "2026-11-05T10:00:00Z", true),
        interview("next", "2026-12-01T10:00:00Z", false),
        interview("later", "2026-12-09T10:00:00Z", false),
      ],
    });
    const { next, later, completed } = interviewSections(app);
    expect(next?.id).toBe("next");
    expect(later.map((i) => i.id)).toEqual(["later"]);
    expect(completed.map((i) => i.id)).toEqual(["recent", "old"]);
  });

  it("has no next Interview when none is ahead", () => {
    expect(interviewSections(application("a", { interviews: [interview("old", "2026-11-01T10:00:00Z", true)] })).next).toBeNull();
  });
});

describe("paragraphs", () => {
  it("splits notes at blank lines, trimmed, dropping empty ones", () => {
    expect(paragraphs("  One\nstill one\n\n \n Two \n\n")).toEqual(["One\nstill one", "Two"]);
    expect(paragraphs(null)).toEqual([]);
  });
});

describe("noteBlocks", () => {
  it("reads lines starting with a dash as a list and the rest as text", () => {
    expect(noteBlocks("Asked about caching.\nThen queues.\n\n- Send thank-you\n- Ask about on-call\nDone.")).toEqual([
      { type: "text", id: 0, text: "Asked about caching.\nThen queues." },
      {
        type: "list",
        id: 3,
        items: [
          { id: 3, text: "Send thank-you" },
          { id: 4, text: "Ask about on-call" },
        ],
      },
      { type: "text", id: 5, text: "Done." },
    ]);
  });

  it("leaves a dash with no space after it as text, and has no blocks without notes", () => {
    expect(noteBlocks("-5 degrees")).toEqual([{ type: "text", id: 0, text: "-5 degrees" }]);
    expect(noteBlocks(null)).toEqual([]);
    expect(noteBlocks(" \n\n")).toEqual([]);
  });
});

describe("Interview notes", () => {
  it("are there when any of the three fields has text", () => {
    const none = { what_they_asked: null, how_it_went: null, takeaway: null };
    expect(hasInterviewNotes(none)).toBe(false);
    expect(hasInterviewNotes({ ...none, how_it_went: "  " })).toBe(false);
    expect(hasInterviewNotes({ ...none, what_they_asked: "Why us?" })).toBe(true);
    expect(hasInterviewNotes({ ...none, how_it_went: "Fine" })).toBe(true);
    expect(hasInterviewNotes({ ...none, takeaway: "Slow down" })).toBe(true);
  });

  it("read What they asked as one question per line, trimmed, blank lines dropped", () => {
    expect(questions(" Why us? \n\nWhy now?\n  ")).toEqual(["Why us?", "Why now?"]);
    expect(questions(null)).toEqual([]);
  });
});

describe("prepTakeaways", () => {
  /** A completed Interview on a November day, of a kind, with a takeaway or none. */
  const done = (id: string, day: number, kind: InterviewKind, takeaway: string | null = null): Interview => ({
    ...interview(id, `2026-11-${String(day).padStart(2, "0")}T15:00:00Z`, true),
    kind,
    takeaway,
  });
  const ahead = (id: string, kind: InterviewKind): Interview => ({ ...interview(id, "2026-12-01T15:00:00Z", false), kind });

  const deepDive = ahead("deep-dive", "technical_deep_dive");
  const lumen = application("lumen", {
    company: "Lumen Bio",
    interviews: [
      done("screen", 6, "recruiter_screen", "Ask about the team first."),
      done("manager", 13, "hiring_manager", "Lead with the decision."),
      done("chat", 14, "informal_chat", "  "),
      deepDive,
    ],
  });
  const fernway = application("fernway", {
    company: "Fernway Health",
    interviews: [done("old-dive", 3, "technical_deep_dive", "Draw the diagram first."), done("new-dive", 10, "technical_deep_dive", "Name the trade-off.")],
  });
  const summary = (takeaways: ReturnType<typeof prepTakeaways>) =>
    takeaways.map((t) => [t.rule, t.application.company, t.interview.id]);

  it("is nothing when no completed Interview has a takeaway", () => {
    const quiet = application("quiet", { interviews: [done("screen", 6, "recruiter_screen"), deepDive] });
    expect(prepTakeaways([quiet], quiet, deepDive)).toEqual([]);
  });

  it("takes the latest completed Interview of the same Application that has one, skipping blank ones", () => {
    expect(summary(prepTakeaways([lumen], lumen, deepDive))).toEqual([["same_application", "Lumen Bio", "manager"]]);
  });

  it("takes only the latest of the same kind at another Application when its own has none", () => {
    const quiet = application("quiet", { interviews: [deepDive] });
    expect(summary(prepTakeaways([quiet, fernway], quiet, deepDive))).toEqual([["same_kind", "Fernway Health", "new-dive"]]);
  });

  it("shows both, the same Application's first, carrying only the Application's id and company", () => {
    const takeaways = prepTakeaways([fernway, lumen], lumen, deepDive);
    expect(summary(takeaways)).toEqual([
      ["same_application", "Lumen Bio", "manager"],
      ["same_kind", "Fernway Health", "new-dive"],
    ]);
    expect(takeaways[1].application).toEqual({ id: "fernway", company: "Fernway Health" });
  });

  it("shows an Interview both rules could point at once, looking elsewhere for the same kind", () => {
    const second = ahead("second", "hiring_manager");
    const own = application("own", { interviews: [done("first", 12, "hiring_manager", "Slow down."), second] });
    const other = application("other", { interviews: [done("theirs", 5, "hiring_manager", "Bring numbers.")] });
    expect(summary(prepTakeaways([own, other], own, second))).toEqual([
      ["same_application", "own", "first"],
      ["same_kind", "other", "theirs"],
    ]);
    expect(summary(prepTakeaways([own], own, second))).toEqual([["same_application", "own", "first"]]);
  });

  it("counts an Interview whose own Application is Done", () => {
    const rejected = { ...fernway, status: "done" as const, outcome: "rejected" as const };
    const quiet = application("quiet", { interviews: [deepDive] });
    expect(summary(prepTakeaways([rejected, quiet], quiet, deepDive))).toEqual([["same_kind", "Fernway Health", "new-dive"]]);
  });
});

describe("prepLookBack", () => {
  const ahead = interview("next", "2026-12-01T15:00:00Z", false);
  const withAsked = (asked: string | null) =>
    application("a", {
      interviews: [
        { ...interview("first", "2026-11-01T10:00:00Z", true), what_they_asked: "Old question?" },
        { ...interview("last", "2026-11-05T10:00:00Z", true), what_they_asked: asked, takeaway: "Pause first." },
        ahead,
      ],
    });

  it("has They asked last time from the latest completed Interview, with the takeaways", () => {
    const app = withAsked("Why us?\n\nWhy now?");
    const lookBack = prepLookBack([app], app, ahead);
    expect(lookBack.theyAsked).toEqual({ from: app.interviews[1], questions: ["Why us?", "Why now?"] });
    expect(lookBack.takeaways.map((t) => t.interview.id)).toEqual(["last"]);
  });

  it("has no They asked last time when that Interview has no questions, or nothing is completed", () => {
    const app = withAsked(null);
    expect(prepLookBack([app], app, ahead).theyAsked).toBeNull();
    const fresh = application("fresh", { interviews: [ahead] });
    expect(prepLookBack([fresh], fresh, ahead)).toEqual({ takeaways: [], theyAsked: null });
  });
});

describe("takeawayShowsOn", () => {
  const at = (day: number) => `2026-${day > 30 ? "12" : "11"}-${String(day > 30 ? day - 30 : day).padStart(2, "0")}T15:00:00Z`;
  const make = (id: string, day: number, kind: InterviewKind, completed: boolean, takeaway: string | null = null): Interview => ({
    ...interview(id, at(day), completed),
    kind,
    takeaway,
  });
  const manager = make("manager", 13, "hiring_manager", true);
  const lumen = application("lumen", {
    company: "Lumen Bio",
    interviews: [manager, make("deep-dive", 32, "technical_deep_dive", false), make("leadership", 39, "leadership", false)],
  });
  const tilth = application("tilth", { company: "Tilth Agritech", interviews: [make("tilth-manager", 31, "hiring_manager", false)] });
  const targets = (showsOn: ReturnType<typeof takeawayShowsOn>) =>
    showsOn.map((t) => [t.rule, t.application.company, t.interview.id]);

  it("is the next Interview of its Application and the next of its kind elsewhere, as if it had a takeaway", () => {
    expect(targets(takeawayShowsOn([lumen, tilth], lumen, manager))).toEqual([
      ["same_application", "Lumen Bio", "deep-dive"],
      ["same_kind", "Tilth Agritech", "tilth-manager"],
    ]);
  });

  it("agrees with prepTakeaways once the takeaway is written", () => {
    const written = { ...lumen, interviews: lumen.interviews.map((i) => (i.id === "manager" ? { ...i, takeaway: "Lead." } : i)) };
    const [deepDive] = upcomingInterviews(written);
    const [tilthManager] = tilth.interviews;
    expect(prepTakeaways([written, tilth], written, deepDive).map((t) => t.interview.id)).toEqual(["manager"]);
    expect(prepTakeaways([written, tilth], tilth, tilthManager).map((t) => t.interview.id)).toEqual(["manager"]);
  });

  it("is nothing when nothing is ahead, or a later takeaway shows instead", () => {
    const alone = application("alone", { interviews: [manager] });
    expect(takeawayShowsOn([alone], alone, manager)).toEqual([]);
    const later = make("later", 20, "hiring_manager", true, "Newer lesson.");
    const other = application("other", { interviews: [later] });
    const superseded = { ...lumen, interviews: [manager, make("chat", 15, "informal_chat", true, "Newer."), ...upcomingInterviews(lumen)] };
    expect(targets(takeawayShowsOn([superseded, tilth, other], superseded, manager))).toEqual([]);
  });

  it("skips upcoming Interviews of Done Applications, and an upcoming Interview shows nothing", () => {
    const doneTilth = { ...tilth, status: "done" as const, outcome: "withdrawn" as const };
    expect(targets(takeawayShowsOn([lumen, doneTilth], lumen, manager))).toEqual([["same_application", "Lumen Bio", "deep-dive"]]);
    expect(takeawayShowsOn([lumen, tilth], lumen, lumen.interviews[1])).toEqual([]);
  });
});

describe("calendar days", () => {
  it("counts whole days in local time, whatever the hour", () => {
    expect(calendarDaysBetween(new Date(2026, 10, 23, 23, 0), new Date(2026, 10, 25, 1, 0))).toBe(2);
    expect(calendarDaysBetween(new Date(2026, 10, 23, 9), new Date(2026, 10, 23, 22))).toBe(0);
    expect(calendarDaysBetween(new Date(2026, 10, 23), new Date(2026, 9, 28))).toBe(-26);
  });

  it("reads a date-only value as that local day", () => {
    expect(parseDay("2026-11-23").getDate()).toBe(23);
    expect(parseDay("2026-11-23T10:00:00Z").toISOString()).toBe("2026-11-23T10:00:00.000Z");
  });

  it("says how far off a day is", () => {
    expect([0, 1, -1, 2, -26].map(relativeDays)).toEqual(["today", "tomorrow", "yesterday", "in 2 days", "26 days ago"]);
  });
});

describe("applicationProgress", () => {
  it("is Waiting, Interview scheduled, Offer, or Done with its Outcome", () => {
    expect(applicationProgress(application("a", {})).label).toBe("Waiting");
    expect(applicationProgress(application("a", { interviews: [interview("n", "2099-01-01T00:00:00Z", false)] })).label).toBe("Interview scheduled");
    expect(applicationProgress(application("a", { status: "done", outcome: "offer" })).label).toBe("Offer");
    expect(applicationProgress(application("a", { status: "done", outcome: "withdrawn" })).label).toBe("Done · Withdrawn");
  });
});
