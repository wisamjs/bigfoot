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
  roundNumber,
  roundTitle,
  getCalendarInterviews,
  dashboardSummary,
  getStats,
  getUpcoming,
  nextUp,
  categoryLabel,
  INTERVIEW_CATEGORIES,
  INTERVIEW_CATEGORY_OPTIONS,
  lastCompletedInterview,
  LOCATION_OPTIONS,
  LOCATIONS,
  locationText,
  nextInterview,
  OUTCOME_OPTIONS,
  outcomeSummary,
  takeaways,
  titleForCategory,
  applicationParticipants,
  participantOption,
  participantText,
  withParticipants,
  OUTCOMES,
  STATUS_OPTIONS,
  STATUSES,
  type Application,
  type Interview,
  type InterviewCategory,
} from "./applications";

function interview(id: string, at: string, completed: boolean): Interview {
  return { id, application_id: "a", category: "technical", title: "Technical", at, what_they_asked: null, how_it_went: null, takeaway: null, prep_notes: null, participants: [], completed, created_at: "", updated_at: "" };
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
    done_on: null,
    outcome_note: null,
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

describe("roundNumber", () => {
  const added = (id: string, at: string, created_at: string): Interview => ({ ...interview(id, at, true), created_at });
  const first = added("first", "2026-11-02T15:00:00Z", "2026-10-01T09:00:00Z");
  const second = added("second", "2026-11-09T15:00:00Z", "2026-10-02T09:00:00Z");
  const third = added("third", "2026-11-16T15:00:00Z", "2026-10-03T09:00:00Z");

  it("counts from 1 by date, whatever order the list is in", () => {
    const app = application("a", { interviews: [third, first, second] });
    expect([first, second, third].map((i) => roundNumber(app, i))).toEqual([1, 2, 3]);
  });

  it("orders by the instant, not the text, when times carry different offsets", () => {
    const early = added("early", "2026-11-02T10:00:00-05:00", "2026-10-02T09:00:00Z");
    const late = added("late", "2026-11-02T14:00:00Z", "2026-10-01T09:00:00Z");
    const app = application("a", { interviews: [late, early] });
    expect(roundNumber(app, late)).toBe(1);
    expect(roundNumber(app, early)).toBe(2);
  });

  it("counts Interviews at the same time in the order they were added", () => {
    const later = added("aaa", "2026-11-09T15:00:00Z", "2026-10-05T09:00:00Z");
    const app = application("a", { interviews: [first, later, second] });
    expect(roundNumber(app, second)).toBe(2);
    expect(roundNumber(app, later)).toBe(3);
  });

  it("renumbers the later Interviews after one is deleted", () => {
    const app = application("a", { interviews: [first, second, third] });
    expect(roundNumber(app, third)).toBe(3);
    const afterDelete = { ...app, interviews: app.interviews.filter((i) => i.id !== second.id) };
    expect(roundNumber(afterDelete, first)).toBe(1);
    expect(roundNumber(afterDelete, third)).toBe(2);
  });

  it("counts a Done Application's Interviews the same way", () => {
    const app = application("a", { status: "done", outcome: "rejected", is_waiting: false, interviews: [first, second, third] });
    expect(roundNumber(app, second)).toBe(2);
  });

  it("goes by id for Interviews at the same time, added at the same time", () => {
    const b = added("b", "2026-11-09T15:00:00Z", "2026-10-02T09:00:00Z");
    const a = added("a", "2026-11-09T15:00:00Z", "2026-10-02T09:00:00Z");
    const app = application("x", { interviews: [b, a] });
    expect(roundNumber(app, a)).toBe(1);
    expect(roundNumber(app, b)).toBe(2);
  });

  it("goes by date before the order added", () => {
    const next = added("next", "2026-12-01T15:00:00Z", "2026-09-01T09:00:00Z");
    const app = application("a", { interviews: [first, next] });
    expect(roundNumber(app, next)).toBe(2);
  });

  it("is 0 for an Interview that isn't the Application's", () => {
    expect(roundNumber(application("a", { interviews: [first] }), second)).toBe(0);
  });

  it("puts the round before the title", () => {
    expect(roundTitle(3, "Retrospective System Design")).toBe("Round 3 · Retrospective System Design");
  });
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
  it("keeps past and upcoming Interviews of In Progress Applications and completed ones of Done Applications, by date", () => {
    const result = getCalendarInterviews([scheduled, rejected]);
    expect(result.map((d) => d.interview.id)).toEqual(["past", "old", "next"]);
  });

  it("leaves out a Done Application's Interviews that were still to come", () => {
    const withdrawn = application("withdrawn", {
      status: "done",
      outcome: "withdrawn",
      interviews: [interview("done", "2026-11-04T15:00:00Z", true), interview("cancelled", "2026-12-02T15:00:00Z", false)],
    });
    expect(getCalendarInterviews([withdrawn]).map((d) => d.interview.id)).toEqual(["done"]);
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
  const now = new Date("2026-11-20T12:00:00Z");
  const soon = (id: string, at: string) =>
    application(id, { is_waiting: false, interviews: [interview(`${id}-i`, at, false)] });

  it("counts Offers, Interviews in the next 2 weeks and Applications waiting to hear back", () => {
    const apps = [
      offer,
      waiting,
      application("waiting-too", {}),
      soon("tomorrow", "2026-11-21T15:00:00Z"),
      soon("in-13-days", "2026-12-03T15:00:00Z"),
      soon("in-15-days", "2026-12-05T15:00:00Z"),
      rejected,
    ];
    expect(dashboardSummary(apps, now)).toEqual([
      { id: "offers", text: "1 Offer to decide" },
      { id: "interviews", text: "2 Interviews in the next 2 weeks" },
      { id: "waiting", text: "2 waiting to hear back" },
    ]);
  });

  it("leaves out Interviews of Done Applications", () => {
    const done = application("done", { status: "done", outcome: "withdrawn", is_waiting: false, interviews: [interview("d", "2026-11-21T15:00:00Z", false)] });
    expect(dashboardSummary([done], now)).toEqual([]);
  });

  it("says one in the singular and leaves out counts at zero", () => {
    expect(dashboardSummary([soon("tomorrow", "2026-11-21T15:00:00Z")], now)).toEqual([
      { id: "interviews", text: "1 Interview in the next 2 weeks" },
    ]);
    expect(dashboardSummary([offer, offer, waiting], now)).toEqual([
      { id: "offers", text: "2 Offers to decide" },
      { id: "waiting", text: "1 waiting to hear back" },
    ]);
  });

  it("is empty when every count is zero", () => {
    expect(dashboardSummary([], now)).toEqual([]);
    expect(dashboardSummary([rejected], now)).toEqual([]);
  });
});

describe("nextUp", () => {
  it("is the soonest upcoming Interview of an In Progress Application", () => {
    const sooner = application("sooner", { is_waiting: false, interviews: [interview("soon", "2026-11-20T15:00:00Z", false)] });
    const done = application("done", { status: "done", outcome: "withdrawn", interviews: [interview("d", "2026-11-19T15:00:00Z", false)] });
    expect(nextUp([scheduled, sooner, done])?.interview.id).toBe("soon");
    expect(nextUp([scheduled, sooner, done])?.application.id).toBe("sooner");
  });

  it("is null when nothing is upcoming", () => {
    expect(nextUp([waiting, rejected])).toBeNull();
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
  ["InterviewCategory", INTERVIEW_CATEGORIES, INTERVIEW_CATEGORY_OPTIONS],
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

describe("titleForCategory", () => {
  it("follows the category while the title is still the old category's name, or blank", () => {
    expect(titleForCategory("Recruiter", "recruiter", "system_design")).toBe("System Design");
    expect(titleForCategory(" ", "recruiter", "culture")).toBe("Culture");
  });

  it("keeps a title the job seeker wrote", () => {
    expect(titleForCategory("Retrospective System Design", "system_design", "technical")).toBe("Retrospective System Design");
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
  /** A completed Interview on a November day, of a category, with a takeaway or none. Its title is its category's name. */
  const done = (id: string, day: number, category: InterviewCategory, takeaway: string | null = null): Interview => ({
    ...interview(id, `2026-11-${String(day).padStart(2, "0")}T15:00:00Z`, true),
    category,
    title: categoryLabel(category),
    takeaway,
  });
  const ahead = (id: string, category: InterviewCategory): Interview => ({
    ...interview(id, "2026-12-01T15:00:00Z", false),
    category,
    title: categoryLabel(category),
  });

  const deepDive = ahead("deep-dive", "project_deep_dive");
  const lumen = application("lumen", {
    company: "Lumen Bio",
    interviews: [
      done("screen", 6, "recruiter", "Ask about the team first."),
      done("manager", 13, "hiring_manager", "Lead with the decision."),
      done("chat", 14, "recruiter", "  "),
      deepDive,
    ],
  });
  const fernway = application("fernway", {
    company: "Fernway Health",
    interviews: [done("old-dive", 3, "project_deep_dive", "Draw the diagram first."), done("new-dive", 10, "project_deep_dive", "Name the trade-off.")],
  });
  const summary = (takeaways: ReturnType<typeof prepTakeaways>) =>
    takeaways.map((t) => [t.rule, t.application.company, t.interview.id]);

  it("is nothing when no completed Interview has a takeaway", () => {
    const quiet = application("quiet", { interviews: [done("screen", 6, "recruiter"), deepDive] });
    expect(prepTakeaways([quiet], quiet, deepDive)).toEqual([]);
  });

  it("takes the latest completed Interview of the same Application that has one, skipping blank ones", () => {
    expect(summary(prepTakeaways([lumen], lumen, deepDive))).toEqual([["same_application", "Lumen Bio", "manager"]]);
  });

  it("takes only the latest of the same category at another Application when its own has none", () => {
    const quiet = application("quiet", { interviews: [deepDive] });
    expect(summary(prepTakeaways([quiet, fernway], quiet, deepDive))).toEqual([["same_category", "Fernway Health", "new-dive"]]);
  });

  it("shows both, the same Application's first, carrying only the Application's id and company", () => {
    const takeaways = prepTakeaways([fernway, lumen], lumen, deepDive);
    expect(summary(takeaways)).toEqual([
      ["same_application", "Lumen Bio", "manager"],
      ["same_category", "Fernway Health", "new-dive"],
    ]);
    expect(takeaways[1].application).toEqual({ id: "fernway", company: "Fernway Health" });
  });

  it("shows an Interview both rules could point at once, looking elsewhere for the same category", () => {
    const second = ahead("second", "hiring_manager");
    const own = application("own", { interviews: [done("first", 12, "hiring_manager", "Slow down."), second] });
    const other = application("other", { interviews: [done("theirs", 5, "hiring_manager", "Bring numbers.")] });
    expect(summary(prepTakeaways([own, other], own, second))).toEqual([
      ["same_application", "own", "first"],
      ["same_category", "other", "theirs"],
    ]);
    expect(summary(prepTakeaways([own], own, second))).toEqual([["same_application", "own", "first"]]);
  });

  it("matches another Application's Interview by category, whatever the titles say", () => {
    const retro = { ...ahead("retro", "system_design"), title: "Retrospective System Design" };
    const quiet = application("quiet", { interviews: [retro] });
    const other = application("other", {
      company: "Other",
      interviews: [
        { ...done("fe", 9, "system_design", "Start from the user."), title: "FE System Design" },
        // Same title, another category: not a match.
        { ...done("named-alike", 11, "technical", "Not this one."), title: "Retrospective System Design" },
      ],
    });
    expect(summary(prepTakeaways([quiet, other], quiet, retro))).toEqual([["same_category", "Other", "fe"]]);
  });

  it("counts an Interview whose own Application is Done", () => {
    const rejected = { ...fernway, status: "done" as const, outcome: "rejected" as const };
    const quiet = application("quiet", { interviews: [deepDive] });
    expect(summary(prepTakeaways([rejected, quiet], quiet, deepDive))).toEqual([["same_category", "Fernway Health", "new-dive"]]);
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
  const make = (id: string, day: number, category: InterviewCategory, completed: boolean, takeaway: string | null = null): Interview => ({
    ...interview(id, at(day), completed),
    category,
    takeaway,
  });
  const manager = make("manager", 13, "hiring_manager", true);
  const lumen = application("lumen", {
    company: "Lumen Bio",
    interviews: [manager, make("deep-dive", 32, "project_deep_dive", false), make("people_management", 39, "people_management", false)],
  });
  const tilth = application("tilth", { company: "Tilth Agritech", interviews: [make("tilth-manager", 31, "hiring_manager", false)] });
  const targets = (showsOn: ReturnType<typeof takeawayShowsOn>) =>
    showsOn.map((t) => [t.rule, t.application.company, t.interview.id]);

  it("is the next Interview of its Application and the next of its category elsewhere, as if it had a takeaway", () => {
    expect(targets(takeawayShowsOn([lumen, tilth], lumen, manager))).toEqual([
      ["same_application", "Lumen Bio", "deep-dive"],
      ["same_category", "Tilth Agritech", "tilth-manager"],
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
    const superseded = { ...lumen, interviews: [manager, make("chat", 15, "recruiter", true, "Newer."), ...upcomingInterviews(lumen)] };
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
    expect(applicationProgress(application("a", { status: "done", outcome: null })).label).toBe("Done");
  });
});

describe("Outcome card (BIG-182)", () => {
  const screen = { ...interview("screen", "2026-11-03T15:00:00Z", true), takeaway: "Ask about internal candidates." };
  const manager = { ...interview("manager", "2026-11-12T15:00:00Z", true), takeaway: " Lead with the decision. " };
  const blank = { ...interview("blank", "2026-11-14T15:00:00Z", true), takeaway: "   " };
  const ended = application("ended", { status: "done", outcome: "rejected", applied_on: "2026-10-20", done_on: "2026-11-16", interviews: [screen, manager, blank] });

  it("lists the takeaways, trimmed, newest Interview first, leaving out blank ones", () => {
    expect(takeaways(ended).map(({ from, text }) => [from.id, text])).toEqual([
      ["manager", "Lead with the decision."],
      ["screen", "Ask about internal candidates."],
    ]);
    expect(takeaways(application("none", {}))).toEqual([]);
  });

  it("counts the completed Interviews and the days from applying to the Done date", () => {
    expect(outcomeSummary(ended)).toBe("After 3 Interviews, 27 days from applying.");
    const upcoming = interview("later", "2026-12-01T15:00:00Z", false);
    expect(outcomeSummary({ ...ended, done_on: "2026-10-21", interviews: [screen, upcoming] })).toBe(
      "After 1 Interview, 1 day from applying.",
    );
  });

  it("leaves out the days without a Done date, and says when it ended before any Interview or the same day", () => {
    expect(outcomeSummary({ ...ended, done_on: null })).toBe("After 3 Interviews.");
    expect(outcomeSummary({ ...ended, done_on: "2026-10-20", interviews: [] })).toBe("Before any Interview, on the day you applied.");
  });
});

describe("Participants", () => {
  const dana = { id: "p1", role: "Recruiter", name: "Dana Lee" };
  const em = { id: "p2", role: "EM", name: null };

  it("reads as a name with the role, or the role alone", () => {
    expect(participantText(dana)).toBe("Dana Lee (Recruiter)");
    expect(participantText(em)).toBe("EM");
    expect(participantOption(dana)).toBe("Dana Lee · Recruiter");
    expect(participantOption(em)).toBe("EM");
  });

  it("heads an Interview as \"With …\", and says nothing for one with nobody", () => {
    expect(withParticipants([dana, { ...em, name: "Sam" }])).toBe("With Dana Lee (Recruiter), Sam (EM)");
    expect(withParticipants([])).toBeNull();
  });

  it("lists an Application's people once each, in the order they first appear", () => {
    const app = application("a", {
      interviews: [
        { ...interview("i1", "2026-11-01T15:00:00Z", true), participants: [dana] },
        { ...interview("i2", "2026-11-02T15:00:00Z", true), participants: [em, dana] },
        interview("i3", "2026-11-03T15:00:00Z", false),
      ],
    });
    expect(applicationParticipants(app)).toEqual([dana, em]);
  });
});
