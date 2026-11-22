"use server";

import { refresh } from "next/cache";
import * as api from "@/lib/api";
import type { ApplicationFields, InterviewFields } from "@/lib/applications";
import { findCurrentUser } from "@/lib/dal";
import { applicationErrors, interviewErrors, isValid, summarize, type FieldErrors } from "@/lib/validation";

// Inputs are untrusted (Server Actions are plain POST endpoints, callable with any values): each
// one is checked here with the forms' own rules before it reaches FastAPI, which validates every
// field again and scopes every change to the signed-in job seeker.

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors };

async function run(mutate: (jobSeekerId: string) => Promise<unknown>, errors: FieldErrors = {}): Promise<ActionResult> {
  const user = await findCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  if (!isValid(errors)) return { ok: false, error: summarize(errors), fieldErrors: errors };
  try {
    await mutate(user.id);
  } catch (error) {
    if (error instanceof api.ApiError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." };
  }
  refresh();
  return { ok: true };
}

export async function createApplicationAction(fields: Partial<ApplicationFields>) {
  return run((jobSeekerId) => api.createApplication(jobSeekerId, fields), applicationErrors(fields, { creating: true }));
}

export async function updateApplicationAction(id: string, changes: Partial<ApplicationFields>) {
  return run(
    (jobSeekerId) => api.updateApplication(jobSeekerId, id, changes),
    applicationErrors(changes, { creating: false }),
  );
}

export async function deleteApplicationAction(id: string) {
  return run((jobSeekerId) => api.deleteApplication(jobSeekerId, id));
}

export async function createInterviewAction(applicationId: string, fields: Partial<InterviewFields>) {
  return run((jobSeekerId) => api.createInterview(jobSeekerId, applicationId, fields), interviewErrors(fields));
}

export async function updateInterviewAction(applicationId: string, id: string, changes: Partial<InterviewFields>) {
  return run(
    (jobSeekerId) => api.updateInterview(jobSeekerId, applicationId, id, changes),
    interviewErrors(changes),
  );
}

export async function deleteInterviewAction(applicationId: string, id: string) {
  return run((jobSeekerId) => api.deleteInterview(jobSeekerId, applicationId, id));
}
