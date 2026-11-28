import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { XSS_TEXT, XSS_URLS } from "@/test/xss";
import { ACCESS_TOKEN_NAME_MAX, PASSCODE_MAX_LENGTH, PASSCODE_MIN_LENGTH, SHARE_LINK_LABEL_MAX, SHARE_LINKS_MAX } from "./account";
import { APPLICATION_MAX_LENGTHS, DIDNT_HAPPEN, INTERVIEW_NOTES_MAX_LENGTHS, OFFICE_DAYS } from "./applications";
import {
  accessTokenNameError,
  applicationErrors,
  dateOrderError,
  happenedError,
  interviewErrors,
  isHttpUrl,
  participantsError,
  isValid,
  passcodeError,
  shareLinkLabelError,
  summarize,
} from "./validation";

const valid = { company: "Birch", title: "Engineer", applied_on: "2026-11-01" };

/** A `NAME = 1_000` constant in an API module (api/app/domain.py unless given). */
function pythonNumber(name: string, file = "api/app/domain.py") {
  const source = readFileSync(file, "utf8");
  const value = source.match(new RegExp(`^${name} = ([\\d_]+)\\b`, "m"))?.[1];
  if (!value) throw new Error(`${file} has no ${name}`);
  return Number(value.replaceAll("_", ""));
}

describe("limits", () => {
  it("of Share links are the API's", () => {
    expect(SHARE_LINK_LABEL_MAX).toBe(pythonNumber("SHARE_LINK_LABEL_MAX", "api/app/models.py"));
    expect(PASSCODE_MIN_LENGTH).toBe(pythonNumber("PASSCODE_MIN_LENGTH", "api/app/models.py"));
    expect(PASSCODE_MAX_LENGTH).toBe(pythonNumber("PASSCODE_MAX_LENGTH", "api/app/models.py"));
    expect(SHARE_LINKS_MAX).toBe(pythonNumber("SHARE_LINKS_MAX", "api/app/models.py"));
  });

  it("are the API's, so the forms and the API agree", () => {
    expect(APPLICATION_MAX_LENGTHS).toEqual({
      company: pythonNumber("COMPANY_MAX_LENGTH"),
      title: pythonNumber("TITLE_MAX_LENGTH"),
      salary: pythonNumber("SALARY_MAX_LENGTH"),
      posting_url: pythonNumber("POSTING_URL_MAX_LENGTH"),
      outcome_note: pythonNumber("OUTCOME_NOTE_MAX_LENGTH"),
    });
    expect(OFFICE_DAYS).toEqual([pythonNumber("OFFICE_DAYS_MIN"), 2, 3, pythonNumber("OFFICE_DAYS_MAX")]);
    expect(INTERVIEW_NOTES_MAX_LENGTHS).toEqual({
      what_they_asked: pythonNumber("WHAT_THEY_ASKED_MAX_LENGTH"),
      how_it_went: pythonNumber("HOW_IT_WENT_MAX_LENGTH"),
      takeaway: pythonNumber("TAKEAWAY_MAX_LENGTH"),
    });
    expect(ACCESS_TOKEN_NAME_MAX).toBe(pythonNumber("ACCESS_TOKEN_NAME_MAX", "api/app/models.py"));
  });
});

describe("applicationErrors", () => {
  it("accepts a whole new Application, and one with only the required fields", () => {
    const whole = { ...valid, location: "hybrid", office_days: 3, salary: "$150k", posting_url: "https://jobs.example.com/1" };
    expect(applicationErrors(whole, { creating: true })).toEqual({});
    expect(applicationErrors({ company: "Birch", title: "Engineer" }, { creating: true })).toEqual({});
  });

  it("needs a Company and Title on a new Application, and never lets a change blank them", () => {
    expect(applicationErrors({ company: " ", title: null }, { creating: true })).toEqual({
      company: "Enter the company.",
      title: "Enter the title.",
    });
    expect(applicationErrors({ company: "" }, { creating: false })).toEqual({ company: "Enter the company." });
    expect(applicationErrors({ location: null }, { creating: false })).toEqual({});
  });

  it.each(Object.entries(APPLICATION_MAX_LENGTHS))("caps %s at %i characters", (name, max) => {
    const at = name === "posting_url" ? `https://${"a".repeat(max - 8)}` : "a".repeat(max);
    expect(applicationErrors({ [name]: at }, { creating: false })).toEqual({});
    expect(applicationErrors({ [name]: `${at}a` }, { creating: false })[name]).toMatch(/at most/);
  });

  it.each(XSS_URLS)("refuses %j as a Posting link", (url) => {
    expect(applicationErrors({ posting_url: url }, { creating: false })).toEqual({
      posting_url: "Enter a link that starts with http:// or https://.",
    });
  });

  it("refuses a Posting link that isn't a URL or has spaces", () => {
    for (const url of ["jobs.example.com", "https://", "https://jobs.example.com/a b"]) {
      expect(applicationErrors({ posting_url: url }, { creating: false })).toHaveProperty("posting_url");
    }
  });

  it.each(XSS_TEXT)("keeps %j as typed: text is escaped where it's shown, not refused", (text) => {
    expect(applicationErrors({ ...valid, company: text, salary: text }, { creating: true })).toEqual({});
  });

  it("takes a Location only from its choices, and office days only for Hybrid", () => {
    expect(applicationErrors({ location: "remote", office_days: null }, { creating: false })).toEqual({});
    expect(applicationErrors({ location: "Toronto" }, { creating: false })).toEqual({ location: "Choose a Location." });
    expect(applicationErrors({ location: "hybrid", office_days: 5 }, { creating: false })).toEqual({
      office_days: "Choose 1 to 4 days in office.",
    });
    expect(applicationErrors({ location: "remote", office_days: 2 }, { creating: false })).toEqual({
      office_days: "Only a Hybrid Location has days in office.",
    });
  });

  it("needs a real applied date", () => {
    for (const date of ["2026-02-30", "11/01/2026", "", null, 20261101]) {
      expect(applicationErrors({ applied_on: date }, { creating: false })).toEqual({
        applied_on: "Enter the date you applied.",
      });
    }
  });

  it("takes a Done date that is a real date, or none", () => {
    expect(applicationErrors({ done_on: "2026-11-16" }, { creating: false })).toEqual({});
    expect(applicationErrors({ done_on: null }, { creating: false })).toEqual({});
    for (const date of ["2026-02-30", "16/11/2026", "", 20261116]) {
      expect(applicationErrors({ done_on: date }, { creating: false })).toEqual({ done_on: "Enter the date it ended." });
    }
  });

  it("matches the Outcome to the Status, as the API does", () => {
    expect(applicationErrors({ status: "done", outcome: "offer" }, { creating: false })).toEqual({});
    expect(applicationErrors({ status: "in_progress", outcome: null }, { creating: false })).toEqual({});
    expect(applicationErrors({ status: "done", outcome: null }, { creating: false })).toHaveProperty("outcome");
    expect(applicationErrors({ status: "in_progress", outcome: "offer" }, { creating: false })).toHaveProperty("outcome");
    expect(applicationErrors({ status: "archived" }, { creating: false })).toHaveProperty("status");
    expect(applicationErrors({ status: null }, { creating: false })).toHaveProperty("status");
    expect(applicationErrors({ status: "done", outcome: "ghosted" }, { creating: false })).toHaveProperty("outcome");
  });

  it("refuses values that aren't text and fields Bigfoot doesn't store, as a script might send", () => {
    expect(applicationErrors({ salary: 150_000, is_sample: true }, { creating: false })).toEqual({
      salary: "Salary must be text.",
      is_sample: "This isn’t a field Bigfoot stores.",
    });
    expect(applicationErrors(null, { creating: false })).toEqual({ form: "Nothing to save." });
  });
});

describe("interviewErrors", () => {
  it("accepts a category, a title, a timestamp, and each Interview notes field up to its limit", () => {
    const notes = {
      what_they_asked: "a".repeat(INTERVIEW_NOTES_MAX_LENGTHS.what_they_asked),
      how_it_went: "a".repeat(INTERVIEW_NOTES_MAX_LENGTHS.how_it_went),
      takeaway: "a".repeat(INTERVIEW_NOTES_MAX_LENGTHS.takeaway),
    };
    const participants = [{ role: "Recruiter", name: null }];
    expect(
      interviewErrors({ category: "technical", title: "Technical", at: "2026-12-01T15:00:00.000Z", participants, ...notes }, { creating: true }),
    ).toEqual({});
    expect(interviewErrors({ what_they_asked: null, how_it_went: null, takeaway: null })).toEqual({});
  });

  it("refuses an unknown category, a blank or long title, a date that isn't one, and notes over the limit", () => {
    expect(
      interviewErrors({
        category: "<script>",
        title: "a".repeat(201),
        at: "tomorrow",
        what_they_asked: "a".repeat(20_001),
        how_it_went: "a".repeat(20_001),
        takeaway: "a".repeat(501),
      }),
    ).toEqual({
      category: "Choose an Interview category.",
      title: "Title can be at most 200 characters.",
      at: "Enter a date and time.",
      what_they_asked: "What they asked can be at most 20,000 characters.",
      how_it_went: "How it went can be at most 20,000 characters.",
      takeaway: "Takeaway for next time can be at most 500 characters.",
    });
    // The single field they replaced is no longer one Bigfoot stores, nor is the kind (docs/adr/0007).
    expect(interviewErrors({ notes: "Old" })).toEqual({ notes: "This isn’t a field Bigfoot stores." });
    expect(interviewErrors({ kind: "technical" })).toEqual({ kind: "This isn’t a field Bigfoot stores." });
    expect(interviewErrors({ title: "  " })).toEqual({ title: "Enter the title." });
    expect(interviewErrors({ category: "onsite_loop" })).toEqual({ category: "Choose an Interview category." });
    expect(interviewErrors({ prep_notes: "a".repeat(20_001) })).toEqual({ prep_notes: "Prep notes can be at most 20,000 characters." });
  });

  it.each([null, "a title", 7])("refuses %s, which isn't an object", (input) => {
    expect(interviewErrors(input)).toEqual({ form: "Nothing to save." });
  });

  it("needs the category, the title and a date and time on a new Interview, never just a date", () => {
    expect(interviewErrors({}, { creating: true })).toEqual({
      category: "Choose an Interview category.",
      title: "Enter the title.",
      at: "Enter the date and time, or choose Date TBD.",
      participants: "Add at least one person you’re meeting.",
    });
    const participants = [{ role: "EM", name: null }];
    expect(interviewErrors({ category: "technical", title: "Technical", at: "2026-12-01", participants }, { creating: true })).toEqual({
      at: "Enter a date and time.",
    });
  });

  it("accepts no date only as an explicit Date TBD choice (docs/adr/0009)", () => {
    const base = { category: "technical", title: "Technical", participants: [{ role: "EM", name: null }] };
    expect(interviewErrors({ ...base, at: null, noDate: true }, { creating: true })).toEqual({});
    expect(interviewErrors({ ...base, at: null }, { creating: true })).toEqual({ at: "Enter the date and time, or choose Date TBD." });
    expect(interviewErrors({ ...base, at: "2026-12-01T15:00:00.000Z", noDate: true }, { creating: true })).toEqual({
      at: "Choose a date and time, or Date TBD, not both.",
    });
    expect(interviewErrors({ ...base, at: null, noDate: "yes" }, { creating: true })).toEqual({ at: "Choose a date and time, or Date TBD." });
    expect(interviewErrors({ at: null, noDate: true })).toEqual({});
    expect(interviewErrors({ noDate: false })).toEqual({ at: "Enter the date and time, or turn on Date TBD." });
    expect(interviewErrors({ at: "2026-12-01T15:00:00.000Z", noDate: false })).toEqual({});
  });

  it("asks only for a date and time where Date TBD isn't offered", () => {
    const options = { creating: true, noDateChoice: null };
    const base = { category: "technical", title: "Technical", participants: [{ role: "EM", name: null }] };
    expect(interviewErrors({ ...base, at: null }, options)).toEqual({ at: "Enter the date and time." });
    expect(interviewErrors({ ...base, at: null, noDate: true }, options)).toEqual({ at: "Enter the date and time." });
    expect(interviewErrors({ at: null }, { noDateChoice: null })).toEqual({ at: "Enter the date and time." });
  });

  it("offers Didn't happen on a Done Application's Interview, and only dates in the past (BIG-222)", () => {
    const options = { noDateChoice: DIDNT_HAPPEN, latest: new Date("2026-11-28T12:00:00Z") } as const;
    expect(interviewErrors({ at: null, noDate: true }, options)).toEqual({});
    expect(interviewErrors({ at: null }, options)).toEqual({ at: "Enter the date and time, or turn on Didn’t happen." });
    expect(interviewErrors({ at: "2026-11-28T11:00:00.000Z" }, options)).toEqual({});
    expect(interviewErrors({ at: "2026-11-28T13:00:00.000Z" }, options)).toEqual({
      at: "Enter a date and time in the past: the Application is Done.",
    });
  });

  it("checks a Mark done answer that says it happened: a past date, not before applying (BIG-222)", () => {
    const now = new Date(2026, 10, 28, 12);
    expect(happenedError(null, "2026-11-02", now)).toBe("Enter when it happened.");
    expect(happenedError(new Date(2026, 10, 20, 15).toISOString(), "2026-11-02", now)).toBeNull();
    expect(happenedError(new Date(2026, 10, 2, 9).toISOString(), "2026-11-02", now)).toBeNull();
    expect(happenedError(new Date(2026, 10, 1, 23).toISOString(), "2026-11-02", now)).toBe(
      "Enter a date on or after the day you applied.",
    );
    expect(happenedError(new Date(2026, 10, 28, 13).toISOString(), "2026-11-02", now)).toBe("Enter a date and time in the past.");
  });

  it("checks the Mark done answers' shape, only when marking it Done (BIG-222)", () => {
    const done = { status: "done", outcome: "rejected" };
    expect(applicationErrors({ ...done, interviews: [{ id: "i1", at: null }] }, { creating: false })).toEqual({});
    expect(applicationErrors({ ...done, interviews: [{ id: "i1", at: "2026-11-20T15:00:00.000Z" }] }, { creating: false })).toEqual({});
    expect(applicationErrors({ outcome: "rejected", interviews: [] }, { creating: false })).toEqual({
      interviews: "Say whether Interviews happened only when marking it Done.",
    });
    expect(applicationErrors({ ...done, interviews: "all" }, { creating: false })).toEqual({ interviews: "Answer for each Interview." });
    const twice = [
      { id: "i1", at: null },
      { id: "i1", at: null },
    ];
    expect(applicationErrors({ ...done, interviews: twice }, { creating: false })).toEqual({ interviews: "Answer once for each Interview." });
    expect(applicationErrors({ ...done, interviews: [{ id: "i1", at: "soon" }] }, { creating: false })).toEqual({
      interviews: "Enter when it happened.",
    });
  });

  it("refuses clearing the date without Date TBD, or the category or the title of an Interview", () => {
    expect(interviewErrors({ at: null })).toEqual({ at: "Enter the date and time, or turn on Date TBD." });
    expect(interviewErrors({ category: null, title: null })).toEqual({
      category: "Choose an Interview category.",
      title: "Enter the title.",
    });
    expect(interviewErrors({ at: "" })).toEqual({ at: "Enter the date and time, or turn on Date TBD." });
  });

  it("refuses emptying an Interview's Participants, and leaves them alone when not sent", () => {
    expect(interviewErrors({ participants: [] })).toEqual({ participants: "Add at least one person you’re meeting." });
    expect(interviewErrors({ participants: null })).toEqual({ participants: "Add at least one person you’re meeting." });
    expect(interviewErrors({ title: "Onsite" })).toEqual({});
  });

  it.each(XSS_TEXT)("keeps %j in Interview notes as typed", (notes) => {
    expect(interviewErrors({ what_they_asked: notes, how_it_went: notes, takeaway: notes })).toEqual({});
  });
});

describe("accessTokenNameError", () => {
  it("accepts a name up to the limit, including any XSS payload, which shows as text", () => {
    expect(accessTokenNameError("Calendar cron job")).toBeNull();
    expect(accessTokenNameError("a".repeat(ACCESS_TOKEN_NAME_MAX))).toBeNull();
    for (const payload of XSS_TEXT) expect(accessTokenNameError(payload)).toBeNull();
  });

  it("needs a name that isn't blank or too long", () => {
    expect(accessTokenNameError("  ")).toBe("Enter the name.");
    expect(accessTokenNameError(null)).toBe("Enter the name.");
    expect(accessTokenNameError("a".repeat(ACCESS_TOKEN_NAME_MAX + 1))).toBe("Name can be at most 100 characters.");
  });

  it.each(["tab\there", "null\u0000", "\u202eevil.exe", "rtl\u2067mark"])(
    "refuses %j, which the API refuses: control and text-reordering characters",
    (name) => {
      expect(accessTokenNameError(name)).toBe("Use only characters you can see in the name.");
    },
  );
});

describe("isHttpUrl", () => {
  it("allows only http and https", () => {
    expect(isHttpUrl("HTTPS://jobs.example.com")).toBe(true);
    expect(isHttpUrl("ftp://jobs.example.com")).toBe(false);
  });
});

describe("summarize", () => {
  it("says the first problem, and how many more there are", () => {
    expect(summarize({})).toBe("");
    expect(isValid({})).toBe(true);
    expect(summarize({ company: "Enter the company." })).toBe("Enter the company.");
    expect(summarize({ company: "Enter the company.", title: "Enter the title." })).toBe(
      "Enter the company. 1 more field needs fixing.",
    );
    expect(summarize({ company: "A.", title: "B.", salary: "C." })).toBe("A. 2 more fields need fixing.");
  });
});

describe("dateOrderError", () => {
  const saved = { applied_on: "2026-10-20", done_on: "2026-11-16" };
  const today = "2026-11-23";

  it("keeps the Done date between the applied date and today", () => {
    expect(dateOrderError({ done_on: "2026-10-20" }, saved, today)).toBeNull();
    expect(dateOrderError({ done_on: today }, saved, today)).toBeNull();
    expect(dateOrderError({ done_on: null }, saved, today)).toBeNull();
    expect(dateOrderError({ done_on: "2026-10-19" }, saved, today)).toBe("The Done date can’t be before the applied date.");
    expect(dateOrderError({ done_on: "2026-11-24" }, saved, today)).toBe("The Done date can’t be in the future.");
  });

  it("keeps the applied date on or before a saved Done date, and any applied date without one", () => {
    expect(dateOrderError({ applied_on: "2026-11-16" }, saved, today)).toBeNull();
    expect(dateOrderError({ applied_on: "2026-11-17" }, saved, today)).toBe("The applied date can’t be after the Done date.");
    expect(dateOrderError({ applied_on: "2026-11-30" }, { ...saved, done_on: null }, today)).toBeNull();
  });
});

describe("shareLinkLabelError", () => {
  it("accepts a label up to the limit, including any XSS payload, which shows as text", () => {
    expect(shareLinkLabelError("Mom & Dad")).toBeNull();
    expect(shareLinkLabelError("a".repeat(SHARE_LINK_LABEL_MAX))).toBeNull();
    for (const payload of XSS_TEXT) expect(shareLinkLabelError(payload)).toBeNull();
  });

  it("needs a label that isn't blank, too long or reordered by control characters", () => {
    expect(shareLinkLabelError(" ")).toBe("Say who the link is for.");
    expect(shareLinkLabelError(null)).toBe("Say who the link is for.");
    expect(shareLinkLabelError("a".repeat(SHARE_LINK_LABEL_MAX + 1))).toBe("Who it’s for can be at most 100 characters.");
    expect(shareLinkLabelError("Mom\u202e")).toBe("Use only characters you can see.");
  });
});

describe("passcodeError", () => {
  it("accepts 8 to 128 characters, kept as typed", () => {
    expect(passcodeError("maple-river-42")).toBeNull();
    expect(passcodeError(" a b c d ")).toBeNull();
    expect(passcodeError("p".repeat(PASSCODE_MIN_LENGTH))).toBeNull();
    expect(passcodeError("p".repeat(PASSCODE_MAX_LENGTH))).toBeNull();
  });

  it("refuses one that is missing, blank, too short, too long or has control characters", () => {
    expect(passcodeError(null)).toBe("Choose a passcode, or press Suggest.");
    expect(passcodeError("          ")).toBe("Choose a passcode, or press Suggest.");
    expect(passcodeError("p".repeat(PASSCODE_MIN_LENGTH - 1))).toBe("Use at least 8 characters.");
    expect(passcodeError("p".repeat(PASSCODE_MAX_LENGTH + 1))).toBe("Passcode can be at most 128 characters.");
    expect(passcodeError("maple\triver")).toBe("Use only characters you can see.");
  });
});

describe("participantsError", () => {
  it("accepts 1 to 20 people, each with a role and maybe a name, new or already on the Application", () => {
    expect(participantsError([{ role: "Sr Director, Product", name: "Dana Lee" }, { id: "p1", role: "EM", name: null }])).toBeNull();
    expect(participantsError(Array.from({ length: 20 }, (_, n) => ({ role: `Engineer ${n}`, name: null })))).toBeNull();
  });

  it("needs someone, and no more than 20", () => {
    expect(participantsError([])).toEqual({ message: "Add at least one person you’re meeting." });
    expect(participantsError(undefined)).toEqual({ message: "Add at least one person you’re meeting." });
    expect(participantsError(Array.from({ length: 21 }, () => ({ role: "EM", name: null })))).toEqual({
      message: "An Interview can have at most 20 people.",
    });
  });

  it("names the first person with a problem", () => {
    const ok = { role: "EM", name: null };
    expect(participantsError([ok, { role: "  ", name: "Sam" }])).toEqual({ message: "Enter each person’s role.", index: 1 });
    expect(participantsError([ok, {}])).toEqual({ message: "Enter each person’s role.", index: 1 });
    expect(participantsError([{ role: "a".repeat(201), name: null }])).toEqual({
      message: "Role can be at most 200 characters.",
      index: 0,
    });
    expect(participantsError([{ role: "EM", name: "a".repeat(201) }])).toEqual({
      message: "Name can be at most 200 characters.",
      index: 0,
    });
    expect(participantsError([{ role: "E\u202eM", name: null }])).toEqual({ message: "Use only characters you can see.", index: 0 });
    expect(participantsError([{ id: "p1", ...ok }, { id: "p1", ...ok }])).toEqual({ message: "Each person can be listed once.", index: 1 });
  });
});
