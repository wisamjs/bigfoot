import type { PasscodeState } from "@/app/journey/[id]/actions";
import { COMPLETED_MARK, UNSCHEDULED_MARK } from "@/features/applications/status-tone";
import { capitalize, nearness } from "@/features/applications/when-text";
import { calendarDaysBetween, relativeDays, UNSCHEDULED_PROGRESS_LABEL } from "@/lib/applications";
import {
  isScheduledJourneyInterview,
  LOCKED_MESSAGE,
  viewerCopy,
  waitingDays,
  type DatedJourneyInterview,
  type JourneyApplication,
  type JourneyGroup,
} from "@/lib/journey";

// What the Journey's components choose to show, as plain functions so each choice has a unit test
// (journey-text.test.ts). `now` is the Viewer's: the Journey renders in their browser.

/**
 * Where things stand's badge: "Offer", "Interviewing", "Next round · date TBD" (only Unscheduled
 * Interviews ahead, BIG-221), or "Waiting · 13 days" ("Waiting" with no date to count from).
 */
export function progressLabel(app: Pick<JourneyApplication, "waiting_since">, group: JourneyGroup["id"], now: Date): string {
  if (group === "offer") return "Offer";
  if (group === "interviewing") return "Interviewing";
  if (group === "unscheduled") return UNSCHEDULED_PROGRESS_LABEL;
  const days = waitingDays(app, now);
  return days === null ? "Waiting" : `Waiting · ${days} ${days === 1 ? "day" : "days"}`;
}

/** Which Interview's mark is the next one, in the brand colour: the first not completed, none for an Offer. -1 for none. */
export function nextMarkIndex(app: Pick<JourneyApplication, "offer" | "interviews">): number {
  return app.offer ? -1 : app.interviews.findIndex((i) => !i.completed);
}

/**
 * The colour of an Interview's mark: completed green, an Unscheduled one dashed in the brand colour
 * (BIG-221), the next in the brand colour, later ones muted.
 */
export function markClasses(completed: boolean, next: boolean, unscheduled = false): string {
  if (completed) return COMPLETED_MARK.in_progress;
  if (unscheduled) return UNSCHEDULED_MARK;
  return next ? "bg-brand" : "bg-line-medium";
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekdayTimeFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });

/** What comes next for an Application in Where things stand. */
export type JourneyNext =
  | { kind: "offer" }
  | { kind: "nothing" }
  | { kind: "unscheduled"; title: string }
  | { kind: "interview"; title: string; at: string; when: string; soon: boolean };

/**
 * An Offer is "Thinking it over"; otherwise its next Scheduled Interview's title and when:
 * "Tomorrow, 2:00 PM" (`soon`, in the brand colour), "Wed 11:00 AM" within the week, or "Fri, Dec
 * 4" later; with only Unscheduled ones ahead, the first one's title over "Date TBD" (BIG-221);
 * "Nothing booked yet" without any.
 */
export function journeyNext(app: Pick<JourneyApplication, "offer" | "interviews">, now: Date): JourneyNext {
  if (app.offer) return { kind: "offer" };
  const ahead = app.interviews.filter((i) => !i.completed);
  const next = ahead.find(isScheduledJourneyInterview);
  if (!next) return ahead[0] ? { kind: "unscheduled", title: ahead[0].title } : { kind: "nothing" };
  const at = new Date(next.at);
  const days = calendarDaysBetween(now, at);
  const near = nearness(days);
  const when =
    near === "soon" ? `${capitalize(relativeDays(days))}, ${timeFormat.format(at)}` : (near === "week" ? weekdayTimeFormat : dateFormat).format(at);
  return { kind: "interview", title: next.title, at: next.at, when, soon: near === "soon" };
}

/** A calendar day's dot: the brand colour while any of its Interviews is ahead, grey once all are done, none without any. */
export function dayDotClasses(items: DatedJourneyInterview[], now: Date): string {
  if (items.length === 0) return "";
  return items.some((d) => new Date(d.interview.at) > now) ? "bg-brand" : "bg-body-subtle";
}

/**
 * What the Passcode page says under the field after a try: locked (on load or by this try) wins,
 * then a wrong Passcode, then a server that couldn't be reached; nothing before any try.
 */
export function passcodeError(status: PasscodeState["status"], locked: boolean, sharedBy: string | null): string | undefined {
  if (locked || status === "locked") return LOCKED_MESSAGE;
  if (status === "wrong") return viewerCopy(sharedBy).wrongPasscode;
  if (status === "error") return "Couldn’t reach Bigfoot’s server. Try again.";
  return undefined;
}
