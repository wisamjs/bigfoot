import "server-only";
import { SignJWT } from "jose";
import type { Application, ApplicationFields, Interview, InterviewFields } from "@/lib/applications";

// Client for the FastAPI service (api/). Every request carries a short-lived token naming the
// job seeker; FastAPI scopes all reads and writes to that job seeker (docs/adr/0001).

/** Where the API is. Also the address a job seeker's scripts call with an Access token (docs/adr/0003). */
export const API_URL = process.env.API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function token(jobSeekerId: string) {
  const secret = process.env.API_SECRET;
  if (!secret) throw new Error("API_SECRET is not set (see .env.example)");
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(jobSeekerId)
    .setIssuer("bigfoot-web")
    .setAudience("bigfoot-api")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(new TextEncoder().encode(secret));
}

async function request<T>(jobSeekerId: string, path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${await token(jobSeekerId)}`,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const FIELD_LABELS: Record<string, string> = {
  company: "Company",
  title: "Title",
  posting_url: "Job posting URL",
  location: "Location",
  salary: "Salary",
  applied_on: "Applied date",
  status: "Status",
  outcome: "Outcome",
  kind: "Interview kind",
  at: "Interview date",
  notes: "Interview notes",
  name: "Name",
};

/** FastAPI errors: {detail: string} or, for validation, {detail: [{loc, msg}]}. */
async function errorMessage(res: Response) {
  try {
    const { detail } = await res.json();
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = String(d.loc?.at(-1) ?? "");
          const message = (d.msg ?? "is invalid").replace(/^Value error, /, "");
          return `${FIELD_LABELS[field] ?? "A field"} ${message}`;
        })
        .join("; ");
    }
  } catch {}
  return `Request failed (${res.status})`;
}

/** Records the job seeker; the first time only, gives them Sample Applications. Idempotent. */
export function onboard(jobSeekerId: string) {
  return request<{ samples_seeded: boolean }>(jobSeekerId, "/me/onboard", { method: "POST" });
}

/** What the database holds about the job seeker besides their Applications (GET /me). */
export type JobSeekerRecord = {
  /** The Google account id. */
  job_seeker_id: string;
  /** ISO timestamp: when they first signed in. */
  created_at: string;
  samples_seeded_at: string | null;
  last_seen_at: string;
};

/** The job seeker's own record; null if they were never onboarded. */
export async function getJobSeeker(jobSeekerId: string) {
  try {
    return await request<JobSeekerRecord>(jobSeekerId, "/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Deletes the job seeker and all of their Applications. Idempotent. */
export function deleteAccount(jobSeekerId: string) {
  return request<void>(jobSeekerId, "/me", { method: "DELETE" });
}

/** An Access token (GLOSSARY.md) as the API lists it: never the secret, which Bigfoot doesn't store. */
export type AccessToken = {
  id: string;
  name: string;
  /** ISO timestamps. */
  created_at: string;
  expires_at: string;
  /** Derived by the API: `expires_at` has passed, so the token no longer works. */
  expired: boolean;
};

/** An Access token as returned once, when created: `token` is the secret. */
export type NewAccessToken = AccessToken & { token: string };

export function listAccessTokens(jobSeekerId: string) {
  return request<AccessToken[]>(jobSeekerId, "/me/access-tokens");
}

export function createAccessToken(jobSeekerId: string, name: string) {
  return request<NewAccessToken>(jobSeekerId, "/me/access-tokens", { method: "POST", body: { name } });
}

export function revokeAccessToken(jobSeekerId: string, id: string) {
  return request<void>(jobSeekerId, `/me/access-tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function listApplications(jobSeekerId: string) {
  return request<Application[]>(jobSeekerId, "/applications");
}

export function createApplication(jobSeekerId: string, fields: Partial<ApplicationFields>) {
  return request<Application>(jobSeekerId, "/applications", { method: "POST", body: fields });
}

export function updateApplication(jobSeekerId: string, id: string, changes: Partial<ApplicationFields>) {
  return request<Application>(jobSeekerId, `/applications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
  });
}

export function deleteApplication(jobSeekerId: string, id: string) {
  return request<void>(jobSeekerId, `/applications/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function listInterviews(jobSeekerId: string, applicationId: string) {
  return request<Interview[]>(jobSeekerId, `/applications/${encodeURIComponent(applicationId)}/interviews`);
}

export function createInterview(jobSeekerId: string, applicationId: string, fields: Partial<InterviewFields>) {
  return request<Interview>(jobSeekerId, `/applications/${encodeURIComponent(applicationId)}/interviews`, {
    method: "POST",
    body: fields,
  });
}

export function updateInterview(
  jobSeekerId: string,
  applicationId: string,
  id: string,
  changes: Partial<InterviewFields>,
) {
  return request<Interview>(
    jobSeekerId,
    `/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(id)}`,
    { method: "PATCH", body: changes },
  );
}

export function deleteInterview(jobSeekerId: string, applicationId: string, id: string) {
  return request<void>(
    jobSeekerId,
    `/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
