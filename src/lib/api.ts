import "server-only";
import { SignJWT } from "jose";
import type { Application, ApplicationFields } from "@/lib/applications";

// Client for the FastAPI service (api/). Every request carries a short-lived token naming the
// job seeker; FastAPI scopes all reads and writes to that owner (docs/adr/0001).

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function token(ownerId: string) {
  const secret = process.env.API_SECRET;
  if (!secret) throw new Error("API_SECRET is not set (see .env.example)");
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(ownerId)
    .setIssuer("bigfoot-web")
    .setAudience("bigfoot-api")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(new TextEncoder().encode(secret));
}

async function request<T>(ownerId: string, path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${await token(ownerId)}`,
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
  stage: "Stage",
  previous_round: "Previous round",
  next_round: "Next round",
  next_round_at: "Next round date",
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

export function listApplications(ownerId: string) {
  return request<Application[]>(ownerId, "/applications");
}

export function createApplication(ownerId: string, fields: Partial<ApplicationFields>) {
  return request<Application>(ownerId, "/applications", { method: "POST", body: fields });
}

export function updateApplication(ownerId: string, id: string, changes: Partial<ApplicationFields>) {
  return request<Application>(ownerId, `/applications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
  });
}

export function deleteApplication(ownerId: string, id: string) {
  return request<void>(ownerId, `/applications/${encodeURIComponent(id)}`, { method: "DELETE" });
}
