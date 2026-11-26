import { describe, expect, it } from "vitest";
import { LOCKED_MESSAGE, viewerCopy, type JourneyApplication, type JourneyInterview } from "@/lib/journey";
import { dayDotClasses, journeyNext, markClasses, nextMarkIndex, passcodeError, progressLabel } from "./journey-text";

// Local times: the tests check the Viewer's own day, whatever time zone they run in.
const NOW = new Date(2026, 10, 25, 9, 0); // Wed, Nov 25
const on = (day: number, hour = 14) => new Date(2026, 10, day, hour).toISOString();
// The Viewer's locale writes the times: "2:00 PM", "2:00 p.m.".
const format = (at: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, options).format(new Date(at));

function interview(at: string, title = "Technical"): JourneyInterview {
  return { category: "technical", title, at, completed: new Date(at) <= NOW };
}

function app(fields: Partial<JourneyApplication> = {}): JourneyApplication {
  return { company: "Acme", title: "Engineer", applied_on: "2026-11-02", offer: false, is_waiting: false, waiting_since: null, interviews: [], ...fields };
}

describe("progressLabel", () => {
  it("names the Offer and Interviewing groups", () => {
    expect(progressLabel(app(), "offer", NOW)).toBe("Offer");
    expect(progressLabel(app(), "interviewing", NOW)).toBe("Interviewing");
  });

  it("counts the days waiting, in the singular for one, and none without a date", () => {
    expect(progressLabel(app({ waiting_since: "2026-11-12" }), "waiting", NOW)).toBe("Waiting · 13 days");
    expect(progressLabel(app({ waiting_since: "2026-11-24" }), "waiting", NOW)).toBe("Waiting · 1 day");
    expect(progressLabel(app(), "waiting", NOW)).toBe("Waiting");
  });
});

describe("nextMarkIndex and markClasses", () => {
  it("marks the first Interview not completed as the next, and none for an Offer", () => {
    const interviews = [interview(on(20)), interview(on(27)), interview(on(30))];
    expect(nextMarkIndex(app({ interviews }))).toBe(1);
    expect(nextMarkIndex(app({ interviews, offer: true }))).toBe(-1);
    expect(nextMarkIndex(app({ interviews: [interview(on(20))] }))).toBe(-1);
  });

  it("colours a completed mark green, the next in the brand colour, and later ones muted", () => {
    expect(markClasses(true, false)).toBe("bg-fg-success-strong");
    expect(markClasses(false, true)).toBe("bg-brand");
    expect(markClasses(false, false)).toBe("bg-line-medium");
  });
});

describe("journeyNext", () => {
  it("is Thinking it over for an Offer, and Nothing booked yet with no Interview ahead", () => {
    expect(journeyNext(app({ offer: true, interviews: [interview(on(27))] }), NOW)).toEqual({ kind: "offer" });
    expect(journeyNext(app({ interviews: [interview(on(20))] }), NOW)).toEqual({ kind: "nothing" });
  });

  it("writes today and tomorrow with the time, in the brand colour", () => {
    expect(journeyNext(app({ interviews: [interview(on(26), "Onsite")] }), NOW)).toEqual({
      kind: "interview",
      title: "Onsite",
      at: on(26),
      when: `Tomorrow, ${format(on(26), { hour: "numeric", minute: "2-digit" })}`,
      soon: true,
    });
  });

  it("writes the weekday and time within the week, and the date after it", () => {
    expect(journeyNext(app({ interviews: [interview(on(27, 11))] }), NOW)).toMatchObject({
      when: format(on(27, 11), { weekday: "short", hour: "numeric", minute: "2-digit" }),
      soon: false,
    });
    expect(journeyNext(app({ interviews: [interview(on(32))] }), NOW)).toMatchObject({
      when: format(on(32), { weekday: "short", month: "short", day: "numeric" }),
      soon: false,
    });
  });
});

describe("dayDotClasses", () => {
  const dated = (at: string) => ({ application: app(), interview: interview(at) });

  it("is the brand colour while any Interview that day is ahead, grey once all are done, and none without any", () => {
    expect(dayDotClasses([dated(on(25, 8)), dated(on(25, 15))], NOW)).toBe("bg-brand");
    expect(dayDotClasses([dated(on(25, 8))], NOW)).toBe("bg-body-subtle");
    expect(dayDotClasses([], NOW)).toBe("");
  });
});

describe("passcodeError", () => {
  it("says nothing before a try", () => {
    expect(passcodeError("idle", false, "Wisam Zaghal")).toBeUndefined();
  });

  it("says the link is locked, on load or by this try, before anything else", () => {
    expect(passcodeError("idle", true, "Wisam Zaghal")).toBe(LOCKED_MESSAGE);
    expect(passcodeError("locked", false, "Wisam Zaghal")).toBe(LOCKED_MESSAGE);
    expect(passcodeError("wrong", true, "Wisam Zaghal")).toBe(LOCKED_MESSAGE);
  });

  it("says a wrong Passcode in the job seeker's words, and a server that couldn't be reached", () => {
    expect(passcodeError("wrong", false, "Wisam Zaghal")).toBe(viewerCopy("Wisam Zaghal").wrongPasscode);
    expect(passcodeError("error", false, null)).toBe("Couldn’t reach Bigfoot’s server. Try again.");
  });
});
