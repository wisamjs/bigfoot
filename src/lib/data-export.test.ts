import { describe, expect, it } from "vitest";
import type { Application } from "./applications";
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
          is_sample: true,
          interviews: [
            { id: "i1", application_id: "a1", kind: "recruiter_screen", at: null, notes: "Friendly, asked about salary.", completed: true, created_at: ts, updated_at: ts },
            { id: "i2", application_id: "a1", kind: "technical", at: ts, notes: null, completed: true, created_at: ts, updated_at: ts },
            { id: "i3", application_id: "a1", kind: "fe_system_design", at: ts, notes: "Drew the cache late.\nStart with the diagram.", completed: true, created_at: ts, updated_at: ts },
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
      Interviews: "Recruiter Screen (no date); Technical (2026-11-02T15:00:00Z); FE System Design (2026-11-02T15:00:00Z)",
      "Interview notes":
        "Recruiter Screen (no date): Friendly, asked about salary.\n\n" +
        "FE System Design (2026-11-02T15:00:00Z): Drew the cache late.\nStart with the diagram.",
      "Sample Application": "Yes",
      Created: "2026-11-02T15:00:00Z",
      Updated: "2026-11-02T15:00:00Z",
    });
    expect(rows[2][0]).toBe("Second");
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

  it("holds the profile, every Application field (is_sample and Interview notes included) and Access token names and dates", () => {
    const noted = { id: "i1", application_id: "a1", kind: "technical", at: ts, notes: "Went well.", completed: true, created_at: ts, updated_at: ts } as const;
    const app = application({ is_sample: true, interviews: [noted] });
    const record = {
      job_seeker_id: "google-123",
      created_at: "2026-11-10T12:00:00Z",
      samples_seeded_at: "2026-11-10T12:00:01Z",
      last_seen_at: "2026-11-13T12:00:00Z",
    };
    const data = JSON.parse(dataExportJson(user, record, [app], [accessToken], now));
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
    });
    expect(data.applications[0].interviews[0].notes).toBe("Went well.");
  });

  it("never exports an Access token's secret or hash, even if the API sent one", () => {
    const leaky = { ...accessToken, token: "bigfoot_secret", token_hash: "abc123" };
    const text = dataExportJson(user, null, [], [leaky], now);
    expect(text).not.toContain("bigfoot_secret");
    expect(text).not.toContain("abc123");
  });

  it("still exports when the job seeker has no database record yet", () => {
    const data = JSON.parse(dataExportJson(user, null, [], [], now));
    expect(data.profile.account_created_at).toBeNull();
    expect(data.applications).toEqual([]);
    expect(data.access_tokens).toEqual([]);
  });
});

describe("exportFileName", () => {
  it("includes the UTC date and the format", () => {
    expect(exportFileName("csv", new Date("2026-11-11T23:30:00Z"))).toBe("bigfoot-export-2026-11-11.csv");
    expect(exportFileName("json", new Date("2026-11-11T00:00:00Z"))).toBe("bigfoot-export-2026-11-11.json");
  });
});
