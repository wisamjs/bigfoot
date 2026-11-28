"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { interviewDeletedHref } from "@/features/applications/routes";
import * as api from "@/lib/api";
import { applicationsTag, type ApplicationChanges, type ApplicationFields, type InterviewFields } from "@/lib/applications";
import { findCurrentUser } from "@/lib/dal";
import { applicationErrors, interviewErrors, isValid, summarize, type FieldErrors } from "@/lib/validation";

// Inputs are untrusted (Server Actions are plain POST endpoints, callable with any values): each
// one is checked here with the forms' own rules before it reaches FastAPI, which validates every
// field again and scopes every change to the signed-in job seeker.

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors };

async function run(
  mutate: (jobSeekerId: string) => Promise<unknown>,
  errors: FieldErrors = {},
  { refreshes = true }: { refreshes?: boolean } = {},
): Promise<ActionResult> {
  const user = await findCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  if (!isValid(errors)) return { ok: false, error: summarize(errors), fieldErrors: errors };
  try {
    await mutate(user.id);
  } catch (error) {
    // The API's validation errors name their fields, so a form can show each beside its field.
    if (error instanceof api.ApiError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    console.error(error);
    return { ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." };
  }
  // Applications and Interviews are one cached read (getApplications): expire it so the next read,
  // on this page or any other, is fresh. `refreshes` is only about re-rendering this page.
  updateTag(applicationsTag(user.id));
  if (refreshes) refresh();
  return { ok: true };
}

export type CreateApplicationResult = ActionResult | { ok: true; id: string };

/** Adds the Application and gives back its id, so the form can open its page. */
export async function createApplicationAction(fields: Partial<ApplicationFields>): Promise<CreateApplicationResult> {
  let id = "";
  const result = await run(async (jobSeekerId) => {
    id = (await api.createApplication(jobSeekerId, fields)).id;
  }, applicationErrors(fields, { creating: true }));
  return result.ok ? { ok: true, id } : result;
}

export async function updateApplicationAction(id: string, changes: ApplicationChanges) {
  return run(
    (jobSeekerId) => api.updateApplication(jobSeekerId, id, changes),
    applicationErrors(changes, { creating: false }),
  );
}

/**
 * Deletes the Application and goes to the dashboard. The page it was deleted from would be a
 * not-found page once refreshed, so this redirects instead of refreshing.
 */
export async function deleteApplicationAction(id: string) {
  const result = await run((jobSeekerId) => api.deleteApplication(jobSeekerId, id), {}, { refreshes: false });
  if (result.ok) redirect("/dashboard");
  return result;
}

export async function createInterviewAction(applicationId: string, fields: Partial<InterviewFields>) {
  return run(
    (jobSeekerId) => api.createInterview(jobSeekerId, applicationId, fields),
    interviewErrors(fields, { creating: true }),
  );
}

export async function updateInterviewAction(applicationId: string, id: string, changes: Partial<InterviewFields>) {
  return run(
    (jobSeekerId) => api.updateInterview(jobSeekerId, applicationId, id, changes),
    interviewErrors(changes),
  );
}

/**
 * Deletes the Interview from its own page and goes to its Application page, which says "Interview
 * deleted". Like deleteApplicationAction, it redirects instead of refreshing a page that would
 * now be not found.
 */
export async function deleteInterviewAndLeaveAction(applicationId: string, id: string) {
  const result = await run((jobSeekerId) => api.deleteInterview(jobSeekerId, applicationId, id), {}, { refreshes: false });
  if (result.ok) redirect(interviewDeletedHref(applicationId));
  return result;
}
