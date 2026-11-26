#!/usr/bin/env node
// Adds or removes a fixed set of Applications for the dev-session test user, through the API, so
// the dashboard can be seen filled (the Applications list, the Interviews calendar, Done Applications), long
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

/** `days` from today at `hour` local time, so the Interviews calendar always lists future Interviews. */
function at(days, hour) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Interviews are [category, title, days from today, hour]; negative days are completed. Every Interview has a
// date and time (docs/adr/0005).
function applications() {
  const applied_on = at(-14, 9).slice(0, 10);
  return [
    { company: "Notion", title: "Full-stack Engineer", location: "remote", interviews: [["recruiter", "Recruiter Screen", 1, 15]] },
    { company: "Datadog", title: "Software Engineer", location: "hybrid", office_days: 3, interviews: [["recruiter", "Recruiter Screen", -5, 11], ["technical", "Technical", 2, 14]] },
    { company: "Figma", title: "Senior Engineer", location: "in_office", interviews: [["technical", "Technical", -3, 10], ["system_design", "Retrospective System Design", 5, 10]] },
    { company: "Linear", title: "Product Engineer", location: "hybrid", office_days: 2, interviews: [["hiring_manager", "Hiring Manager", -4, 13], ["culture", "Values", 6, 11]] },
    { company: "Airtable", title: "Frontend Engineer", interviews: [["hiring_manager", "Hiring Manager", 2, 10]] },
    { company: "Asana", title: "Software Engineer", interviews: [["recruiter", "Recruiter Screen", -2, 9], ["technical", "Technical", 2, 16], ["people_management", "Leadership", 9, 16]] },
    // A long title, so captures and a11y always see how a title wraps beside its date.
    { company: "Okta", title: "Engineering Manager", interviews: [["decision_maker", "Strategic Alignment with Sr Director", 3, 16], ["system_design", "BE System Design", 4, 11]] },
    { company: "Stripe", title: "Software Engineer II", location: "remote", interviews: [] },
    { company: "Shopify", title: "Senior Developer", location: "hybrid", interviews: [["recruiter", "Informal Chat", -1, 12]] },
    { company: "Ramp", title: "Staff Engineer", status: "done", outcome: "offer", interviews: [["hiring_manager", "Final Onsite", -6, 10]] },
    // Done today (the API dates it), with an Outcome note, so its Outcome card shows every part (BIG-182).
    { company: "Vercel", title: "Frontend Engineer", status: "done", outcome: "rejected", outcome_note: "They went with an internal candidate.", interviews: [["technical", "Technical", -8, 10]] },
    { company: "Plaid", title: "Software Engineer", status: "done", outcome: "withdrawn", interviews: [["recruiter", "Recruiter Screen", -10, 10]] },
      // Each has a salary, which the Application page hides behind Reveal.
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
    for (const [category, title, days, hour] of interviews) {
      const body = { category, title, at: at(days, hour) };
      // Every completed Interview has Interview notes, so cards show the notes mark.
      if (days < 0) {
        body.what_they_asked = "Tell me about a past project.\nHow do you test your work?";
        body.how_it_went = "Went well. Asked about past projects.";
        body.takeaway = "Have a question ready about the team.";
      }
      // Technical Interviews also have Prep notes, so the Before card and the folded Prep notes show (BIG-180).
      if (category === "technical") body.prep_notes = "Review the caching chapter.\nDraw the diagram first.\nAsk about the on-call rotation.";
      await call(jobSeekerId, "POST", `/applications/${application.id}/interviews`, body);
    }
  }
}

export async function removeTestApplications(jobSeekerId = TEST_JOB_SEEKER_ID) {
  const existing = await call(jobSeekerId, "GET", "/applications");
  for (const a of existing) await call(jobSeekerId, "DELETE", `/applications/${a.id}`);
  return existing.length;
}

/** Revokes every Access token `jobSeekerId` has, including any a page state created. */
async function removeTestAccessTokens(jobSeekerId) {
  const existing = await call(jobSeekerId, "GET", "/me/access-tokens");
  for (const t of existing) await call(jobSeekerId, "DELETE", `/me/access-tokens/${t.id}`);
}

/** Stops every Share link `jobSeekerId` has, including any a page state created. */
async function removeTestShareLinks(jobSeekerId) {
  const existing = await call(jobSeekerId, "GET", "/me/share-links");
  for (const link of existing) await call(jobSeekerId, "DELETE", `/me/share-links/${link.id}`);
}

/**
 * Runs `fn` with `jobSeekerId` holding exactly these Applications, one Access token and one Share
 * link (so the Account page has one of each to list, change and stop), emptied again afterwards.
 * Filled before their first dashboard visit, so onboarding never adds Sample Applications.
 */
export async function withTestApplications(jobSeekerId, fn) {
  // Clear anything a crashed run left.
  await removeTestApplications(jobSeekerId);
  await removeTestAccessTokens(jobSeekerId);
  await removeTestShareLinks(jobSeekerId);
  await addTestApplications(jobSeekerId);
  await call(jobSeekerId, "POST", "/me/access-tokens", { name: "Calendar cron job" });
  await call(jobSeekerId, "POST", "/me/share-links", { label: "Mom & Dad", passcode: "maple-river-42" });
  try {
    return await fn();
  } finally {
    await removeTestApplications(jobSeekerId);
    await removeTestAccessTokens(jobSeekerId);
    await removeTestShareLinks(jobSeekerId);
  }
}

/**
 * Runs `fn` with `jobSeekerId` holding no Applications, so the dashboard shows its empty states.
 * Onboarded first, or their first dashboard visit would add Sample Applications.
 */
export async function withNoApplications(jobSeekerId, fn) {
  await call(jobSeekerId, "POST", "/me/onboard");
  await removeTestApplications(jobSeekerId);
  return fn();
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
