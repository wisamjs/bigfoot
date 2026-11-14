"use server";

import { refresh } from "next/cache";
import * as api from "@/lib/api";
import type { ApplicationFields, InterviewFields } from "@/lib/applications";
import { findCurrentUser } from "@/lib/dal";

// Inputs are untrusted (Server Actions are plain POST endpoints): FastAPI validates every
// field and scopes every change to the signed-in job seeker.

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(mutate: (jobSeekerId: string) => Promise<unknown>): Promise<ActionResult> {
  const user = await findCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
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
  return run((jobSeekerId) => api.createApplication(jobSeekerId, fields));
}

export async function updateApplicationAction(id: string, changes: Partial<ApplicationFields>) {
  return run((jobSeekerId) => api.updateApplication(jobSeekerId, id, changes));
}

export async function deleteApplicationAction(id: string) {
  return run((jobSeekerId) => api.deleteApplication(jobSeekerId, id));
}

export async function createInterviewAction(applicationId: string, fields: Partial<InterviewFields>) {
  return run((jobSeekerId) => api.createInterview(jobSeekerId, applicationId, fields));
}

export async function updateInterviewAction(applicationId: string, id: string, changes: Partial<InterviewFields>) {
  return run((jobSeekerId) => api.updateInterview(jobSeekerId, applicationId, id, changes));
}

export async function deleteInterviewAction(applicationId: string, id: string) {
  return run((jobSeekerId) => api.deleteInterview(jobSeekerId, applicationId, id));
}
