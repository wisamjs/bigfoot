import { describe, expect, it } from "vitest";
import {
  firstName,
  interviewsDone,
  journeyCounts,
  journeyGroups,
  upcomingJourneyInterviews,
  viewerCopy,
  waitingDays,
  type JourneyApplication,
  type JourneyInterview,
} from "./journey";

const NOW = new Date(2026, 10, 18, 12, 0);
const at = (month: number, day: number, hour = 14) => new Date(2026, month, day, hour).toISOString();

function interview(when: string, title = "Technical"): JourneyInterview {
  return { category: "technical", title, at: when, completed: new Date(when) <= NOW };
}

function app(fields: Partial<JourneyApplication>): JourneyApplication {
  return {
    company: "Acme",
    title: "Engineer",
    applied_on: "2026-11-02",
    offer: false,
    is_waiting: false,
    waiting_since: null,
    interviews: [],
    ...fields,
  };
}

describe("viewerCopy", () => {
  it("names the job seeker by first name, without pronouns", () => {
    const copy = viewerCopy("Wisam Zaghal");
    expect(copy.invitation).toBe("Wisam shared a job search with you");
    expect(copy.open).toBe("See Wisam’s progress");
    expect(copy.wrongPasscode).toBe("That Passcode didn’t match. Check the message from Wisam and try again.");
    expect(copy.expired).toBe("Ask Wisam to renew it.");
    expect(copy.heading).toBe("Wisam’s Journey");
    for (const text of Object.values(copy)) expect(text).not.toMatch(/\b(he|his|him|she|her|they|their|them)\b/i);
  });

  it("words everything without a name for a link made before names were stored", () => {
    const copy = viewerCopy(null);
    expect(copy.invitation).toBe("A job search was shared with you");
    expect(copy.footer).toBe("The job seeker shared this view-only page with you. Notes and prep stay private.");
    for (const text of Object.values(copy)) expect(text).not.toMatch(/\bnull\b/);
  });

  it("takes the first word of the name", () => {
    expect(firstName("  Cher ")).toBe("Cher");
    expect(firstName("")).toBeNull();
  });
});

describe("journeyGroups", () => {
  it("groups Offers, Interviewing and Waiting to hear back, leaving out empty groups", () => {
    const offer = app({ company: "Cobalt", offer: true });
    const booked = app({ company: "Tilth", interviews: [interview(at(10, 19))] });
    const waiting = app({ company: "Fernway", is_waiting: true, waiting_since: "2026-11-05" });
    expect(journeyGroups([waiting, booked, offer]).map((g) => [g.id, g.applications])).toEqual([
      ["offer", [offer]],
      ["interviewing", [booked]],
      ["waiting", [waiting]],
    ]);
    expect(journeyGroups([waiting]).map((g) => g.id)).toEqual(["waiting"]);
    expect(journeyGroups([])).toEqual([]);
  });
});

describe("journeyCounts", () => {
  it("counts Offers, Interviews in the next 2 weeks, Interviews completed this month and Applications waiting", () => {
    const apps = [
      app({ offer: true, interviews: [interview(at(10, 3)), interview(at(9, 20))] }),
      app({ interviews: [interview(at(10, 10)), interview(at(10, 19)), interview(at(10, 30)), interview(at(11, 20))] }),
      app({ is_waiting: true, waiting_since: "2026-11-02" }),
    ];
    expect(journeyCounts({ applications: apps, other_completed_interviews: [] }, NOW).map((c) => [c.value, c.label])).toEqual([
      [1, "Offer to decide"],
      [2, "Interviews in the next 2 weeks"],
      [2, "Interviews completed this month"],
      [1, "waiting to hear back"],
    ]);
  });

  it("counts the other Done Applications' Interviews completed this month too", () => {
    const journey = { applications: [app({ interviews: [interview(at(10, 10))] })], other_completed_interviews: [at(9, 28), at(10, 4), at(10, 12)] };
    expect(journeyCounts(journey, NOW).find((c) => c.id === "completed")?.value).toBe(3);
  });

  it("says one or none in the singular or plural", () => {
    expect(journeyCounts({ applications: [app({ interviews: [interview(at(10, 19))] })], other_completed_interviews: [] }, NOW).map((c) => c.label)).toEqual([
      "Offers to decide",
      "Interview in the next 2 weeks",
      "Interviews completed this month",
      "waiting to hear back",
    ]);
  });
});

describe("upcomingJourneyInterviews", () => {
  it("lists In Progress Applications' upcoming Interviews soonest first, not an Offer's", () => {
    const later = app({ company: "Lumen", interviews: [interview(at(10, 25), "Leadership")] });
    const sooner = app({ company: "Tilth", interviews: [interview(at(10, 10)), interview(at(10, 19), "Hiring Manager")] });
    const offer = app({ offer: true, interviews: [interview(at(10, 20), "Paperwork")] });
    expect(upcomingJourneyInterviews([later, sooner, offer], NOW).map((d) => d.interview.title)).toEqual([
      "Hiring Manager",
      "Leadership",
    ]);
  });
});

describe("waitingDays and interviewsDone", () => {
  it("counts calendar days since Waiting since", () => {
    expect(waitingDays(app({ waiting_since: "2026-11-05" }), NOW)).toBe(13);
    expect(waitingDays(app({ waiting_since: at(10, 17, 9) }), NOW)).toBe(1);
    expect(waitingDays(app({}), NOW)).toBeNull();
  });

  it("says how many Interviews are done", () => {
    const done = interview(at(10, 10));
    const ahead = interview(at(10, 25));
    expect(interviewsDone(app({ interviews: [done, done, ahead, ahead] }))).toBe("2 of 4 done");
    expect(interviewsDone(app({ interviews: [done, done] }))).toBe("All 2 done");
    expect(interviewsDone(app({ interviews: [done] }))).toBe("1 done");
    expect(interviewsDone(app({}))).toBeNull();
  });
});
