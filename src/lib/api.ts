import "server-only";
import * as Sentry from "@sentry/nextjs";
import { SignJWT } from "jose";
import { cacheLife, cacheTag } from "next/cache";
import { applicationsTag, type Application, type ApplicationFields, type Interview, type InterviewFields } from "@/lib/applications";
import type { Journey, ShareLinkStatus } from "@/lib/journey";
import { jobSeekerTag } from "@/lib/sentry";

// Client for the FastAPI service (api/). Every request carries a short-lived token naming the
// job seeker; FastAPI scopes all reads and writes to that job seeker (docs/adr/0001).

/** Where the API is. Also the address a job seeker's scripts call with an Access token (docs/adr/0003). */
export const API_URL = process.env.API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** For a validation error (422): each field's message, keyed by field name. */
    readonly fieldErrors?: Record<string, string>,
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

/** Names the job seeker to Sentry (a hash only) so errors in the requests that follow carry it. */
async function identify(jobSeekerId: string) {
  Sentry.setUser({ id: await jobSeekerTag(jobSeekerId) });
}

async function request<T>(jobSeekerId: string, path: string, init: { method?: string; body?: unknown } = {}) {
  // Errors in this request name the job seeker by a hash only. Sentry's fetch instrumentation
  // adds the sentry-trace and baggage headers, so the API's spans join this trace.
  await identify(jobSeekerId);
  return send<T>(jobSeekerId, path, init);
}

/** `request` without the Sentry call, for code that runs inside a cache (`use cache`) and so only on a miss. */
async function send<T>(jobSeekerId: string, path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${await token(jobSeekerId)}`,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) {
    const { message, fieldErrors } = await apiError(res);
    throw new ApiError(res.status, message, fieldErrors);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const FIELD_LABELS: Record<string, string> = {
  company: "Company",
  title: "Title",
  posting_url: "Job posting URL",
  location: "Location",
  office_days: "Days in office",
  salary: "Salary",
  applied_on: "Applied date",
  status: "Status",
  outcome: "Outcome",
  done_on: "Done date",
  outcome_note: "Outcome note",
  category: "Interview category",
  at: "Interview date",
  what_they_asked: "What they asked",
  how_it_went: "How it went",
  takeaway: "Takeaway for next time",
  prep_notes: "Prep notes",
  name: "Name",
  label: "Who it’s for",
  passcode: "Passcode",
};

/**
 * FastAPI errors: {detail: string} or, for validation, {detail: [{loc, msg}]}. A validation error
 * also gives each field's message, worded to stand alone beside that field.
 */
async function apiError(res: Response): Promise<{ message: string; fieldErrors?: Record<string, string> }> {
  try {
    const { detail } = await res.json();
    if (typeof detail === "string") return { message: detail };
    if (Array.isArray(detail)) {
      const problems = detail.map((d: { loc?: unknown[]; msg?: string }) => {
        const field = String(d.loc?.at(-1) ?? "");
        const message = `${FIELD_LABELS[field] ?? "A field"} ${(d.msg ?? "is invalid").replace(/^Value error, /, "")}`;
        return [field, message] as const;
      });
      return {
        message: problems.map(([, message]) => message).join("; "),
        fieldErrors: Object.fromEntries(problems.filter(([field]) => field in FIELD_LABELS)),
      };
    }
  } catch {}
  return { message: `Request failed (${res.status})` };
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
  last_used_at: string | null;
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

/** A Share link (GLOSSARY.md) as the API lists it: never the Passcode, which Bigfoot doesn't store. */
export type ShareLink = {
  /** 10 URL-safe characters: the link is `/s/<id>`. */
  id: string;
  label: string;
  /** ISO timestamps. */
  created_at: string;
  passcode_set_at: string;
  expires_at: string;
  last_opened_at: string | null;
  /** Derived by the API: `expires_at` has passed, so the link no longer opens. */
  expired: boolean;
};

/** A Share link as returned when created or when its Passcode changes: the one time `passcode` is shown. */
export type NewShareLink = ShareLink & { passcode: string };

export function listShareLinks(jobSeekerId: string) {
  return request<ShareLink[]>(jobSeekerId, "/me/share-links");
}

/** `sharedBy` is the job seeker's name as their Viewers see it: "Shared by Wisam Zaghal". */
export function createShareLink(jobSeekerId: string, label: string, passcode: string, sharedBy: string) {
  return request<NewShareLink>(jobSeekerId, "/me/share-links", {
    method: "POST",
    body: { label, passcode, shared_by: sharedBy },
  });
}

export function renewShareLink(jobSeekerId: string, id: string) {
  return request<ShareLink>(jobSeekerId, `/me/share-links/${encodeURIComponent(id)}/renew`, { method: "POST" });
}

export function changeShareLinkPasscode(jobSeekerId: string, id: string, passcode: string) {
  return request<NewShareLink>(jobSeekerId, `/me/share-links/${encodeURIComponent(id)}/passcode`, {
    method: "PUT",
    body: { passcode },
  });
}

export function stopSharing(jobSeekerId: string, id: string) {
  return request<void>(jobSeekerId, `/me/share-links/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// A Viewer's side of a Share link (docs/adr/0008). No job seeker signs these requests: the status
// and Passcode check need no token, and the Journey takes the Viewer token the check returned.

async function viewerRequest<T>(path: string, init: { method?: string; body?: unknown; viewerToken?: string } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.viewerToken ? { authorization: `Bearer ${init.viewerToken}` } : {}),
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, (await apiError(res)).message);
  return (await res.json()) as T;
}

/** What a Share link's Passcode page shows; null when no link has this id (stopped, or never made). */
export async function getShareLinkStatus(id: string) {
  try {
    return await viewerRequest<ShareLinkStatus>(`/share-links/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** A Viewer token for the link when the Passcode is right. ApiError 401 wrong, 423 locked, 410 expired, 404 not active. */
export function openShareLink(id: string, passcode: string) {
  return viewerRequest<{ token: string; expires_at: string }>(`/share-links/${encodeURIComponent(id)}/viewer-token`, {
    method: "POST",
    body: { passcode },
  });
}

/** The link's Journey. ApiError 401 when the token is no good for it, 410 expired, 404 not active. */
export function getJourney(id: string, viewerToken: string) {
  return viewerRequest<Journey>(`/share-links/${encodeURIComponent(id)}/journey`, { viewerToken });
}

export function listApplications(jobSeekerId: string) {
  return request<Application[]>(jobSeekerId, "/applications");
}

/**
 * The job seeker's Applications, kept for a few minutes so going back to a page doesn't wait on the
 * API again (docs/adr/0006). Their changes through the Server Actions expire it at once. Changes made
 * with an Access token (docs/adr/0003, such as the calendar cron) go straight to the API, so they show
 * once the lifetime below runs out. Use this for pages; `listApplications` always asks the API.
 */
export async function getApplications(jobSeekerId: string) {
  // Outside the cached function: inside it, the call would run only on a miss.
  await identify(jobSeekerId);
  return cachedApplications(jobSeekerId);
}

// Not exported, so no caller can read another job seeker's Applications by passing their id; the
// id is part of the cache key and of the tag.
async function cachedApplications(jobSeekerId: string) {
  "use cache";
  cacheTag(applicationsTag(jobSeekerId));
  // stale: the browser reuses a page it already holds, with no request, for 5 minutes, so going back
  // shows it at once. revalidate: after a minute the server refreshes the read in the background on
  // the next visit. expire: after an hour unused, the next visit waits for the API.
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  return send<Application[]>(jobSeekerId, "/applications");
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
