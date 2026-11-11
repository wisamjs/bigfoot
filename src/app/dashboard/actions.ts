"use server";

import { refresh } from "next/cache";
import * as api from "@/lib/api";
import type { ApplicationFields } from "@/lib/applications";
import { findCurrentUser } from "@/lib/dal";

// Inputs are untrusted (Server Actions are plain POST endpoints): FastAPI validates every
// field and scopes every change to the signed-in job seeker.

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(mutate: (ownerId: string) => Promise<unknown>): Promise<ActionResult> {
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
  return run((owner) => api.createApplication(owner, fields));
}

export async function updateApplicationAction(id: string, changes: Partial<ApplicationFields>) {
  return run((owner) => api.updateApplication(owner, id, changes));
}

export async function deleteApplicationAction(id: string) {
  return run((owner) => api.deleteApplication(owner, id));
}
