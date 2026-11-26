// The Journey (GLOSSARY.md, docs/adr/0008): what a Viewer of a Share link sees, as the API's Journey
// endpoint returns it, and the views the Journey page works out from it. Nothing here reads the
// job seeker's own Applications: a Viewer only ever has this projection.
//
// The copy names the job seeker by first name and uses no pronouns (BIG-197).

import { calendarDaysBetween, parseDay, SUMMARY_DAYS, type InterviewCategory } from "@/lib/applications";

export type JourneyInterview = {
  category: InterviewCategory;
  /** Interview title, as the job seeker wrote it. */
  title: string;
  /** ISO timestamp. */
  at: string;
  /** Derived by the API: the date is in the past. */
  completed: boolean;
};

export type JourneyApplication = {
  company: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  applied_on: string;
  /** Done with an Offer; otherwise In Progress. */
  offer: boolean;
  /** In Progress with no upcoming Interview. */
  is_waiting: boolean;
  /** While waiting: an ISO timestamp (the last completed Interview) or an ISO date (applied). */
  waiting_since: string | null;
  /** Ordered by date. */
  interviews: JourneyInterview[];
};

export type Journey = {
  /** The job seeker's name; null for a Share link made before Bigfoot stored it. */
  shared_by: string | null;
  /** In Progress Applications and Offers, oldest applied first. */
  applications: JourneyApplication[];
  /**
   * ISO timestamps, oldest first: when each completed Interview of the other Done Applications
   * happened, those without an Offer. Only "completed this month" counts them; nothing else of
   * those Applications reaches a Viewer (BIG-206).
   */
  other_completed_interviews: string[];
};

/** What a Share link's Passcode page knows before the Passcode: the API's status. */
export type ShareLinkStatus = { shared_by: string | null; expired: boolean; locked: boolean };

/** A Share link's id: 10 URL-safe characters, as the API makes them. */
export const SHARE_LINK_ID_PATTERN = /^[A-Za-z0-9_-]{10}$/;

/** The first word of the job seeker's name, or null without one. */
export function firstName(sharedBy: string | null): string | null {
  const first = sharedBy?.trim().split(/\s+/)[0];
  return first || null;
}

/**
 * The Viewer's words, worded around the job seeker's first name, or around "the person who sent
 * it" for a link made before Bigfoot stored names. No pronouns.
 */
export function viewerCopy(sharedBy: string | null) {
  const first = firstName(sharedBy);
  return {
    invitation: first ? `${first} shared a job search with you` : "A job search was shared with you",
    intro: first
      ? `Enter the Passcode ${first} sent you to see upcoming Interviews and how the search is going.`
      : "Enter the Passcode you were sent to see upcoming Interviews and how the search is going.",
    open: first ? `See ${first}’s progress` : "See the progress",
    askForPasscode: first ? `Don’t have it? Ask ${first} for the Passcode.` : "Don’t have it? Ask the person who sent it for the Passcode.",
    wrongPasscode: first
      ? `That Passcode didn’t match. Check the message from ${first} and try again.`
      : "That Passcode didn’t match. Check the message with the link and try again.",
    expired: first ? `Ask ${first} to renew it.` : "Ask the person who sent it to renew it.",
    heading: first ? `${first}’s Journey` : "A shared Journey",
    footer: `${first ?? "The job seeker"} shared this view-only page with you. Notes and prep stay private.`,
  };
}

/** The locked Passcode page's message, the same whoever shared the link. */
export const LOCKED_MESSAGE = "Too many tries. Try again in 15 minutes.";

export type JourneyGroup = {
  id: "offer" | "interviewing" | "waiting";
  applications: JourneyApplication[];
};

/**
 * Where things stand's order: Offers, Interviewing (something booked), then Waiting to hear back. Each
 * row's pill names its group, so the groups have no headings of their own (BIG-208). Empty groups are left out.
 */
export function journeyGroups(apps: JourneyApplication[]): JourneyGroup[] {
  const groups: JourneyGroup[] = [
    { id: "offer", applications: apps.filter((a) => a.offer) },
    { id: "interviewing", applications: apps.filter((a) => !a.offer && !a.is_waiting) },
    { id: "waiting", applications: apps.filter((a) => !a.offer && a.is_waiting) },
  ];
  return groups.filter((g) => g.applications.length > 0);
}

export type DatedJourneyInterview = { application: JourneyApplication; interview: JourneyInterview };

/** Every Interview of the Journey, past and upcoming, by date. */
export function journeyInterviews(apps: JourneyApplication[]): DatedJourneyInterview[] {
  return apps
    .flatMap((application) => application.interviews.map((interview) => ({ application, interview })))
    .toSorted((a, b) => a.interview.at.localeCompare(b.interview.at));
}

/** Upcoming Interviews of In Progress Applications, soonest first: an Offer's search there is over. */
export function upcomingJourneyInterviews(apps: JourneyApplication[], now: Date): DatedJourneyInterview[] {
  return journeyInterviews(apps.filter((a) => !a.offer)).filter(({ interview }) => new Date(interview.at) > now);
}

export type JourneyCount = { id: "offers" | "upcoming" | "completed" | "waiting"; value: number; label: string };

/**
 * The four counts over the Journey, in the viewer's time zone: Offers to decide, Interviews in the
 * next 2 weeks, Interviews completed this month (the other Done Applications' too, BIG-206) and
 * Applications waiting to hear back.
 */
export function journeyCounts(
  { applications: apps, other_completed_interviews }: Pick<Journey, "applications" | "other_completed_interviews">,
  now: Date,
): JourneyCount[] {
  const until = now.getTime() + SUMMARY_DAYS * 24 * 60 * 60 * 1000;
  const upcoming = upcomingJourneyInterviews(apps, now).filter(({ interview }) => new Date(interview.at).getTime() <= until);
  const completed = [...journeyInterviews(apps).map(({ interview }) => interview.at), ...other_completed_interviews].filter((iso) => {
    const at = new Date(iso);
    return at <= now && at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth();
  });
  const offers = apps.filter((a) => a.offer).length;
  const waiting = apps.filter((a) => !a.offer && a.is_waiting).length;
  const weeks = SUMMARY_DAYS / 7;
  return [
    { id: "offers", value: offers, label: offers === 1 ? "Offer to decide" : "Offers to decide" },
    {
      id: "upcoming",
      value: upcoming.length,
      label: `${upcoming.length === 1 ? "Interview" : "Interviews"} in the next ${weeks} weeks`,
    },
    {
      id: "completed",
      value: completed.length,
      label: `${completed.length === 1 ? "Interview" : "Interviews"} completed this month`,
    },
    { id: "waiting", value: waiting, label: "waiting to hear back" },
  ];
}

/** "Waiting · 13 days": days since Waiting since, in the viewer's time zone. */
export function waitingDays(app: Pick<JourneyApplication, "waiting_since">, now: Date): number | null {
  return app.waiting_since ? calendarDaysBetween(parseDay(app.waiting_since), now) : null;
}

/** "2 of 4 done", "All 4 done", "1 done" (nothing booked after it), or null with no Interviews. */
export function interviewsDone(app: Pick<JourneyApplication, "interviews">): string | null {
  const total = app.interviews.length;
  if (total === 0) return null;
  const done = app.interviews.filter((i) => i.completed).length;
  if (done === total) return total === 1 ? "1 done" : `All ${total} done`;
  return `${done} of ${total} done`;
}
