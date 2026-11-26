// A job seeker's copy of their data (BIG-12): a CSV of their Applications for spreadsheets, and
// JSON with everything Bigfoot holds about them. Served by src/app/account/export/route.ts.

import {
  locationText,
  INTERVIEW_NOTES_FIELDS,
  INTERVIEW_NOTES_LABELS,
  categoryLabel,
  OUTCOME_OPTIONS,
  participantText,
  STATUS_OPTIONS,
  type Application,
  type Interview,
} from "@/lib/applications";
import type { AccessToken, JobSeekerRecord, ShareLink } from "@/lib/api";
import type { CurrentUser } from "@/lib/dal";

export const EXPORT_FORMATS = ["csv", "json"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function isExportFormat(value: unknown): value is ExportFormat {
  return EXPORT_FORMATS.includes(value as ExportFormat);
}

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
};

/** `bigfoot-export-2026-11-11.csv`, dated in UTC. */
export function exportFileName(format: ExportFormat, now: Date) {
  return `bigfoot-export-${now.toISOString().slice(0, 10)}.${format}`;
}

/**
 * Spreadsheets run a cell starting with one of these as a formula (OWASP, CSV injection).
 * Tab and carriage return are on OWASP's list too.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Prefixes a cell that would run as a formula with `'`, so spreadsheets show it as text. */
export function neutralizeFormula(value: string) {
  return FORMULA_START.test(value) ? `'${value}` : value;
}

function csvCell(value: string | null) {
  const text = neutralizeFormula(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const CSV_COLUMNS: {
  header: string;
  value: (app: Application) => string | null;
}[] = [
  { header: "Company", value: (a) => a.company },
  { header: "Title", value: (a) => a.title },
  { header: "Job posting URL", value: (a) => a.posting_url },
  { header: "Location", value: locationText },
  { header: "Salary", value: (a) => a.salary },
  { header: "Applied date", value: (a) => a.applied_on },
  { header: "Status", value: (a) => STATUS_OPTIONS[a.status].label },
  {
    header: "Outcome",
    value: (a) => (a.outcome ? OUTCOME_OPTIONS[a.outcome].label : null),
  },
  { header: "Done date", value: (a) => a.done_on },
  { header: "Outcome note", value: (a) => a.outcome_note },
  {
    header: "Interviews",
    value: (a) => a.interviews.map(interviewName).join("; "),
  },
  {
    // Participants: a line per Interview that has any, named as in the Interviews column.
    header: "Participants",
    value: (a) =>
      a.interviews
        .filter((i) => i.participants.length > 0)
        .map((i) => `${interviewName(i)}: ${i.participants.map(participantText).join(", ")}`)
        .join("\n"),
  },
  // Interview notes, a column for each field: one paragraph per Interview that has it, named as in
  // the Interviews column.
  ...INTERVIEW_NOTES_FIELDS.map((field) => ({
    header: INTERVIEW_NOTES_LABELS[field],
    value: (a: Application) =>
      a.interviews
        .filter((i) => i[field])
        .map((i) => `${interviewName(i)}: ${i[field]}`)
        .join("\n\n"),
  })),
  {
    // Likewise: one paragraph per Interview that has Prep notes.
    header: "Prep notes",
    value: (a) =>
      a.interviews
        .filter((i) => i.prep_notes)
        .map((i) => `${interviewName(i)}: ${i.prep_notes}`)
        .join("\n\n"),
  },
  { header: "Sample Application", value: (a) => (a.is_sample ? "Yes" : "No") },
  { header: "Created", value: (a) => isoUtc(a.created_at) },
  { header: "Updated", value: (a) => isoUtc(a.updated_at) },
];

/** `Retrospective System Design (System Design, 2026-11-11T15:30:00Z)`: its title, category and date. */
function interviewName(interview: Interview) {
  return `${interview.title} (${categoryLabel(interview.category)}, ${isoUtc(interview.at)})`;
}

/** `2026-11-11T15:30:00Z`: ISO 8601 in UTC, to the second, which spreadsheets read as a date. */
function isoUtc(timestamp: string) {
  return new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** One row per Application, with display labels. UTF-8 with a BOM so Excel reads accents. */
export function applicationsCsv(applications: Application[]) {
  const rows = [
    CSV_COLUMNS.map((c) => c.header),
    ...applications.map((app) => CSV_COLUMNS.map((c) => c.value(app))),
  ];
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/**
 * Everything Bigfoot holds about the job seeker: their profile, every Application field (each
 * Interview's Participants, Interview notes and Prep notes included), their Access tokens' names and dates, and their Share links' labels and dates. Never a
 * token's secret or a Share link's Passcode: Bigfoot stores only a hash of each.
 */
export function dataExportJson(
  user: CurrentUser,
  record: JobSeekerRecord | null,
  applications: Application[],
  accessTokens: AccessToken[],
  shareLinks: ShareLink[],
  now: Date,
) {
  const data = {
    exported_at: now.toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      photo_url: user.image,
      google_account_id: user.id,
      account_created_at: record?.created_at ?? null,
      samples_received_at: record?.samples_seeded_at ?? null,
      last_seen_at: record?.last_seen_at ?? null,
    },
    applications,
    access_tokens: accessTokens.map(
      ({ name, created_at, last_used_at, expires_at }) => ({
        name,
        created_at,
        last_used_at,
        expires_at,
      }),
    ),
    // Labels and dates only: Bigfoot never has a Passcode to give, and its hash stays in the database.
    share_links: shareLinks.map(({ label, created_at, passcode_set_at, expires_at, last_opened_at }) => ({
      label,
      created_at,
      passcode_set_at,
      expires_at,
      last_opened_at,
    })),
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}
