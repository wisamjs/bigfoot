// A job seeker's copy of their data (BIG-12): a CSV of their Applications for spreadsheets, and
// JSON with everything Bigfoot holds about them. Served by src/app/account/export/route.ts.

import {
  locationText,
  INTERVIEW_OPTIONS,
  OUTCOME_OPTIONS,
  STATUS_OPTIONS,
  type Application,
  type Interview,
} from "@/lib/applications";
import type { AccessToken, JobSeekerRecord } from "@/lib/api";
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
  {
    header: "Interviews",
    value: (a) => a.interviews.map(interviewName).join("; "),
  },
  {
    // One paragraph per Interview that has notes, named as in the Interviews column.
    header: "Interview notes",
    value: (a) =>
      a.interviews
        .filter((i) => i.notes)
        .map((i) => `${interviewName(i)}: ${i.notes}`)
        .join("\n\n"),
  },
  { header: "Sample Application", value: (a) => (a.is_sample ? "Yes" : "No") },
  { header: "Created", value: (a) => isoUtc(a.created_at) },
  { header: "Updated", value: (a) => isoUtc(a.updated_at) },
];

/** `Technical (2026-11-11T15:30:00Z)`. */
function interviewName(interview: Interview) {
  return `${INTERVIEW_OPTIONS[interview.kind].label} (${isoUtc(interview.at)})`;
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
 * Interview's notes included), and their Access tokens' names and dates. Never a token's secret:
 * Bigfoot stores only a hash of it.
 */
export function dataExportJson(
  user: CurrentUser,
  record: JobSeekerRecord | null,
  applications: Application[],
  accessTokens: AccessToken[],
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
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}
