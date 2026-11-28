import { describe, expect, it } from "vitest";
import type { Application, Interview } from "./applications";
import { applicationsCsv, dataExportJson, exportFileName, neutralizeFormula } from "./data-export";

const ts = "2026-11-02T15:00:00.000Z";

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: "a1",
    company: "Ramp",
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
    created_at: ts,
    updated_at: ts,
    ...overrides,
  };
}

/** Parses the simple CSV applicationsCsv writes: quoted cells may hold commas, quotes and newlines. */
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      endCell();
    } else if (c === "\r" && text[i + 1] === "\n") {
      endCell();
      rows.push(row);
      row = [];
      i++;
    } else {
      cell += c;
    }
  }
  return rows;
}

describe("applicationsCsv", () => {
  it("starts with a UTF-8 byte order mark and ends lines with CRLF, for Excel", () => {
    const csv = applicationsCsv([application()]);
    expect(csv.startsWith("﻿Company,")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("writes one row per Application with display labels and ISO dates", () => {
    const rows = parseCsv(
      applicationsCsv([
        application({
          company: "Café, Inc.",
          status: "done",
          outcome: "not_the_right_fit",
          done_on: "2026-11-16",
          outcome_note: "They went with an internal candidate.",
          is_sample: true,
          interviews: [
            { id: "i1", application_id: "a1", category: "recruiter", title: "Recruiter Screen", at: ts, what_they_asked: "Why us?\nSalary range?", how_it_went: "Friendly, asked about salary.", takeaway: null, prep_notes: "Know the salary range.", participants: [{ id: "p1", role: "Recruiter", name: "Dana Lee" }], completed: true, created_at: ts, updated_at: ts },
            { id: "i2", application_id: "a1", category: "technical", title: "Technical", at: ts, what_they_asked: null, how_it_went: null, takeaway: null, prep_notes: null, participants: [], completed: true, created_at: ts, updated_at: ts },
            { id: "i3", application_id: "a1", category: "system_design", title: "Retrospective System Design", at: ts, what_they_asked: null, how_it_went: "Drew the cache late.\nStart with the diagram.", takeaway: "Diagram first.", prep_notes: null, participants: [{ id: "p2", role: "EM", name: null }, { id: "p1", role: "Recruiter", name: "Dana Lee" }], completed: true, created_at: ts, updated_at: ts },
          ],
        }),
        application({ company: "Second" }),
      ]).slice(1),
    );
    expect(rows).toHaveLength(3);
    const [header, first] = rows;
    const row = Object.fromEntries(header.map((h, i) => [h, first[i]]));
    expect(row).toEqual({
      Company: "Café, Inc.",
      Title: "Engineer",
      "Job posting URL": "",
      Location: "",
      Salary: "",
      "Applied date": "2026-11-01",
      Status: "Done",
      Outcome: "Not the Right Fit",
      "Done date": "2026-11-16",
      "Outcome note": "They went with an internal candidate.",
      Interviews:
        "Recruiter Screen (Recruiter, 2026-11-02T15:00:00Z); Technical (Technical, 2026-11-02T15:00:00Z); " +
        "Retrospective System Design (System Design, 2026-11-02T15:00:00Z)",
      Participants:
        "Recruiter Screen (Recruiter, 2026-11-02T15:00:00Z): Dana Lee (Recruiter)\n" +
        "Retrospective System Design (System Design, 2026-11-02T15:00:00Z): EM, Dana Lee (Recruiter)",
      "What they asked": "Recruiter Screen (Recruiter, 2026-11-02T15:00:00Z): Why us?\nSalary range?",
      "How it went":
        "Recruiter Screen (Recruiter, 2026-11-02T15:00:00Z): Friendly, asked about salary.\n\n" +
        "Retrospective System Design (System Design, 2026-11-02T15:00:00Z): Drew the cache late.\nStart with the diagram.",
      "Takeaway for next time": "Retrospective System Design (System Design, 2026-11-02T15:00:00Z): Diagram first.",
      "Prep notes": "Recruiter Screen (Recruiter, 2026-11-02T15:00:00Z): Know the salary range.",
      "Sample Application": "Yes",
      Created: "2026-11-02T15:00:00Z",
      Updated: "2026-11-02T15:00:00Z",
    });
    expect(rows[2][0]).toBe("Second");
  });

  it("leaves an Unscheduled Interview's date empty", () => {
    const unscheduled: Interview = { id: "i1", application_id: "a1", category: "people_management", title: "Leadership", at: null, what_they_asked: null, how_it_went: null, takeaway: null, prep_notes: null, participants: [], completed: false, created_at: ts, updated_at: ts };
    const rows = parseCsv(applicationsCsv([application({ interviews: [unscheduled] })]).slice(1));
    expect(rows[1][rows[0].indexOf("Interviews")]).toBe("Leadership (People Management)");
  });

  it("quotes cells holding quotes and newlines", () => {
    const rows = parseCsv(applicationsCsv([application({ title: 'Say "hi"\nthere' })]).slice(1));
    expect(rows[1][1]).toBe('Say "hi"\nthere');
  });

  it("neutralizes cells a spreadsheet would run as a formula", () => {
    const rows = parseCsv(
      applicationsCsv([
        application({ company: "=HYPERLINK(\"http://evil\")", title: "+1", posting_url: "-2", salary: "@SUM(A1)" }),
      ]).slice(1),
    );
    expect(rows[1].slice(0, 5)).toEqual(["'=HYPERLINK(\"http://evil\")", "'+1", "'-2", "", "'@SUM(A1)"]);
  });
});

describe("neutralizeFormula", () => {
  it.each(["=1", "+1", "-1", "@A1", "\t=1", "\r=1"])("prefixes %j", (value) => {
    expect(neutralizeFormula(value)).toBe(`'${value}`);
  });

  it.each(["Ramp", "2026-11-01", "", "a=b", "$120k"])("leaves %j alone", (value) => {
    expect(neutralizeFormula(value)).toBe(value);
  });
});

describe("dataExportJson", () => {
  const user = { id: "google-123", name: "Ada Lovelace", firstName: "Ada", email: "ada@example.com", image: null };
  const now = new Date("2026-11-14T05:00:00Z");

  const accessToken = {
    id: "t1",
    name: "Calendar cron job",
    created_at: "2026-11-12T12:00:00Z",
    last_used_at: "2026-11-13T08:00:00Z",
    expires_at: "2027-11-12T12:00:00Z",
    expired: false,
  };
  const shareLink = {
    id: "k7Qm2x9PaB",
    label: "Mom & Dad",
    created_at: "2026-11-12T12:00:00Z",
    passcode_set_at: "2026-11-12T12:00:00Z",
    expires_at: "2026-11-19T12:00:00Z",
    last_opened_at: "2026-11-13T09:00:00Z",
    expired: false,
  };

  it("holds the profile, every Application field (is_sample, the Done date, the Outcome note, Participants, Interview notes and Prep notes included) Access token names and dates, and Share link labels and dates", () => {
    const noted: Interview = { id: "i1", application_id: "a1", category: "technical", title: "Pair Programming", at: ts, what_they_asked: "Why us?", how_it_went: "Went well.", takeaway: "Smile.", prep_notes: "Review caching.", participants: [{ id: "p1", role: "Recruiter", name: "Dana Lee" }], completed: true, created_at: ts, updated_at: ts };
    const app = application({
      is_sample: true,
      status: "done",
      outcome: "rejected",
      done_on: "2026-11-16",
      outcome_note: "They went with an internal candidate.",
      interviews: [noted],
    });
    const record = {
      job_seeker_id: "google-123",
      created_at: "2026-11-10T12:00:00Z",
      samples_seeded_at: "2026-11-10T12:00:01Z",
      last_seen_at: "2026-11-13T12:00:00Z",
    };
    const data = JSON.parse(dataExportJson(user, record, [app], [accessToken], [shareLink], now));
    expect(data).toEqual({
      exported_at: "2026-11-14T05:00:00.000Z",
      profile: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        photo_url: null,
        google_account_id: "google-123",
        account_created_at: "2026-11-10T12:00:00Z",
        samples_received_at: "2026-11-10T12:00:01Z",
        last_seen_at: "2026-11-13T12:00:00Z",
      },
      applications: [app],
      access_tokens: [
        {
          name: "Calendar cron job",
          created_at: "2026-11-12T12:00:00Z",
          last_used_at: "2026-11-13T08:00:00Z",
          expires_at: "2027-11-12T12:00:00Z",
        },
      ],
      share_links: [
        {
          label: "Mom & Dad",
          created_at: "2026-11-12T12:00:00Z",
          passcode_set_at: "2026-11-12T12:00:00Z",
          expires_at: "2026-11-19T12:00:00Z",
          last_opened_at: "2026-11-13T09:00:00Z",
        },
      ],
    });
    expect(data.applications[0]).toMatchObject({ done_on: "2026-11-16", outcome_note: "They went with an internal candidate." });
    expect(data.applications[0].interviews[0]).toMatchObject({
      category: "technical",
      title: "Pair Programming",
      what_they_asked: "Why us?",
      how_it_went: "Went well.",
      takeaway: "Smile.",
      prep_notes: "Review caching.",
    });
  });

  it("never exports an Access token's secret or hash, even if the API sent one", () => {
    const leaky = { ...accessToken, token: "bigfoot_secret", token_hash: "abc123" };
    const text = dataExportJson(user, null, [], [leaky], [], now);
    expect(text).not.toContain("bigfoot_secret");
    expect(text).not.toContain("abc123");
  });

  it("never exports a Share link's Passcode, its hash or its id, even if the API sent them", () => {
    const leaky = { ...shareLink, passcode: "maple-river-42", passcode_hash: "$argon2id$abc", passcode_version: 3 };
    const text = dataExportJson(user, null, [], [], [leaky], now);
    expect(text).not.toContain("maple-river-42");
    expect(text).not.toContain("argon2id");
    expect(text).not.toContain("passcode_version");
    expect(text).not.toContain("k7Qm2x9PaB");
  });

  it("still exports when the job seeker has no database record yet", () => {
    const data = JSON.parse(dataExportJson(user, null, [], [], [], now));
    expect(data.profile.account_created_at).toBeNull();
    expect(data.applications).toEqual([]);
    expect(data.access_tokens).toEqual([]);
    expect(data.share_links).toEqual([]);
  });
});

describe("exportFileName", () => {
  it("includes the UTC date and the format", () => {
    expect(exportFileName("csv", new Date("2026-11-11T23:30:00Z"))).toBe("bigfoot-export-2026-11-11.csv");
    expect(exportFileName("json", new Date("2026-11-11T00:00:00Z"))).toBe("bigfoot-export-2026-11-11.json");
  });
});
