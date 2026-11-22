import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { XSS_TEXT, XSS_URLS } from "@/test/xss";
import { ACCESS_TOKEN_NAME_MAX } from "./account";
import { APPLICATION_MAX_LENGTHS, INTERVIEW_NOTES_MAX_LENGTH } from "./applications";
import {
  accessTokenNameError,
  applicationErrors,
  DATE_NEEDED,
  interviewErrors,
  isHttpUrl,
  isValid,
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
  it("are the API's, so the forms and the API agree", () => {
    expect(APPLICATION_MAX_LENGTHS).toEqual({
      company: pythonNumber("COMPANY_MAX_LENGTH"),
      title: pythonNumber("TITLE_MAX_LENGTH"),
      location: pythonNumber("LOCATION_MAX_LENGTH"),
      salary: pythonNumber("SALARY_MAX_LENGTH"),
      posting_url: pythonNumber("POSTING_URL_MAX_LENGTH"),
    });
    expect(INTERVIEW_NOTES_MAX_LENGTH).toBe(pythonNumber("INTERVIEW_NOTES_MAX_LENGTH"));
    expect(ACCESS_TOKEN_NAME_MAX).toBe(pythonNumber("ACCESS_TOKEN_NAME_MAX", "api/app/models.py"));
  });
});

describe("applicationErrors", () => {
  it("accepts a whole new Application, and one with only the required fields", () => {
    const whole = { ...valid, location: "Remote", salary: "$150k", posting_url: "https://jobs.example.com/1" };
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
    expect(applicationErrors({ ...valid, company: text, location: text }, { creating: true })).toEqual({});
  });

  it("needs a real applied date", () => {
    for (const date of ["2026-02-30", "11/01/2026", "", null, 20261101]) {
      expect(applicationErrors({ applied_on: date }, { creating: false })).toEqual({
        applied_on: "Enter the date you applied.",
      });
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
  it("accepts a kind, a timestamp, and notes up to the limit", () => {
    const notes = "a".repeat(INTERVIEW_NOTES_MAX_LENGTH);
    expect(interviewErrors({ kind: "technical", at: "2026-12-01T15:00:00.000Z", notes }, { creating: true })).toEqual(
      {},
    );
    expect(interviewErrors({ notes: null })).toEqual({});
  });

  it("refuses an unknown kind, a date that isn't one, and notes over the limit", () => {
    expect(
      interviewErrors({ kind: "<script>", at: "tomorrow", notes: "a".repeat(INTERVIEW_NOTES_MAX_LENGTH + 1) }),
    ).toEqual({
      kind: "Choose an Interview kind.",
      at: "Enter a date and time.",
      notes: "Interview notes can be at most 20,000 characters.",
    });
  });

  it("needs the kind and a date and time on a new Interview, never just a date", () => {
    expect(interviewErrors({}, { creating: true })).toEqual({
      kind: "Choose an Interview kind.",
      at: "Enter the date and time.",
    });
    expect(interviewErrors({ kind: "technical", at: "2026-12-01" }, { creating: true })).toEqual({
      at: "Enter a date and time.",
    });
  });

  it("refuses clearing the date of an Interview", () => {
    expect(interviewErrors({ at: null })).toEqual({ at: "Enter the date and time." });
    expect(interviewErrors({ at: "" })).toEqual({ at: "Enter the date and time." });
  });

  it("needs any change to an Interview with no date to set one (ADR 0005)", () => {
    expect(interviewErrors({ kind: "technical" }, { savedAt: null })).toEqual({ at: DATE_NEEDED });
    expect(interviewErrors({ notes: "Went well." }, { savedAt: null })).toEqual({ at: DATE_NEEDED });
    expect(interviewErrors({ notes: "Booked.", at: "2026-12-01T15:00:00.000Z" }, { savedAt: null })).toEqual({});
    expect(interviewErrors({ kind: "technical" }, { savedAt: "2026-12-01T15:00:00.000Z" })).toEqual({});
  });

  it.each(XSS_TEXT)("keeps %j in Interview notes as typed", (notes) => {
    expect(interviewErrors({ notes })).toEqual({});
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
