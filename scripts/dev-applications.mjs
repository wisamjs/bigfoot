#!/usr/bin/env node
// Adds or removes a fixed set of Applications for the dev-session test user, through the API, so
// the dashboard can be seen filled (Pipeline board, Coming up, Done Applications), long
// Interview labels included.
//   node scripts/dev-applications.mjs add      # refuses if the test user already has Applications
//   node scripts/dev-applications.mjs remove   # deletes every Application the test user has
// Needs the API running at API_URL (default http://localhost:8000) with the same API_SECRET;
// API_URL is read per call, so scripts/servers.mjs can point it at a server it started.
// These are dev fixtures for the test user, not Sample Applications (GLOSSARY.md).
import { apiToken } from "./dev-api-token.mjs";
import { TEST_JOB_SEEKER_ID } from "./dev-session.mjs";

/** A request to the API as `jobSeekerId`, with the token the Next.js server would send. */
export async function call(jobSeekerId, method, path, body) {
  const apiBase = process.env.API_URL ?? "http://localhost:8000";
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await apiToken(jobSeekerId)}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** `days` from today at `hour` local time, so Coming up always lists future Interviews. */
function at(days, hour) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Interviews are [kind, days from today, hour]; negative days are completed, none is undated.
function applications() {
  const applied_on = at(-14, 9).slice(0, 10);
  return [
    { company: "Notion", title: "Full-stack Engineer", interviews: [["recruiter_screen", 1, 15]] },
    { company: "Datadog", title: "Software Engineer", interviews: [["recruiter_screen", -5, 11], ["technical", 2, 14]] },
    { company: "Figma", title: "Senior Engineer", interviews: [["technical", -3, 10], ["onsite_loop", 5, 10]] },
    { company: "Linear", title: "Product Engineer", interviews: [["hiring_manager", -4, 13], ["behavioural", 6, 11]] },
    { company: "Airtable", title: "Frontend Engineer", interviews: [["hiring_manager", 2, 10]] },
    { company: "Asana", title: "Software Engineer", interviews: [["recruiter_screen", -2, 9], ["technical", 2, 16], ["leadership", 9, 16]] },
    // The longest kind, so captures and a11y always see how a label wraps beside its date.
    { company: "Okta", title: "Engineering Manager", interviews: [["cross_functional_interview", 3, 16], ["be_system_design", 4, 11]] },
    { company: "Stripe", title: "Software Engineer II", interviews: [] },
    { company: "Shopify", title: "Senior Developer", interviews: [["informal_chat"]] },
    { company: "Ramp", title: "Staff Engineer", status: "done", outcome: "offer", interviews: [["onsite_loop", -6, 10]] },
    { company: "Vercel", title: "Frontend Engineer", status: "done", outcome: "rejected", interviews: [["technical", -8, 10]] },
    { company: "Plaid", title: "Software Engineer", status: "done", outcome: "withdrawn", interviews: [["recruiter_screen"]] },
      // Each has a salary, so the panel's hidden salary and its Reveal button are captured and checked.
  ].map((a) => ({ applied_on, salary: "$150k–$180k", ...a }));
}

export async function addTestApplications(jobSeekerId = TEST_JOB_SEEKER_ID) {
  const existing = await call(jobSeekerId, "GET", "/applications");
  if (existing.length) {
    throw new Error(
      `The test user already has ${existing.length} Applications. ` +
        "Run `node scripts/dev-applications.mjs remove` first if they can go.",
    );
  }
  for (const { interviews, ...fields } of applications()) {
    const application = await call(jobSeekerId, "POST", "/applications", fields);
    for (const [kind, days, hour] of interviews) {
      const body = days === undefined ? { kind } : { kind, at: at(days, hour) };
      // Every completed, dated Interview has Interview notes, so cards show the notes mark.
      if (days < 0) body.notes = "Went well. Asked about past projects.\n\nNext time: have a question ready about the team.";
      await call(jobSeekerId, "POST", `/applications/${application.id}/interviews`, body);
    }
  }
}

export async function removeTestApplications(jobSeekerId = TEST_JOB_SEEKER_ID) {
  const existing = await call(jobSeekerId, "GET", "/applications");
  for (const a of existing) await call(jobSeekerId, "DELETE", `/applications/${a.id}`);
  return existing.length;
}

/**
 * Runs `fn` with `jobSeekerId` holding exactly these Applications, emptied again afterwards.
 * Filled before their first dashboard visit, so onboarding never adds Sample Applications.
 */
export async function withTestApplications(jobSeekerId, fn) {
  // Clear anything a crashed run left.
  await removeTestApplications(jobSeekerId);
  await addTestApplications(jobSeekerId);
  try {
    return await fn();
  } finally {
    await removeTestApplications(jobSeekerId);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  if (command === "add") {
    await addTestApplications();
    console.log(`Added ${applications().length} Applications for the test user.`);
  } else if (command === "remove") {
    console.log(`Removed ${await removeTestApplications()} Applications for the test user.`);
  } else {
    console.error("Usage: node scripts/dev-applications.mjs add|remove");
    process.exit(1);
  }
}
