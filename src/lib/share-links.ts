import type { ShareLink } from "@/lib/api";

// Share links (GLOSSARY.md): the words the Account page uses for their dates, worked out in the
// viewer's time zone from `now`, and the Passcodes Suggest offers.

const dayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const DAY_MS = 24 * 60 * 60 * 1000;

/** The path a Viewer opens: `/s/<id>`. */
export function shareLinkPath(id: string) {
  return `/s/${id}`;
}

/** "Nov 20", in the viewer's time zone. */
export function shortDate(at: string | Date) {
  return dayFormat.format(new Date(at));
}

/** Whole calendar days from `now`'s day to `at`'s day, in the viewer's time zone. */
function daysBetween(now: Date, at: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

export type Expiry = {
  text: string;
  /** "soon" on the link's last day, shown in the warning colour; "expired" once it no longer opens. */
  tone: "normal" | "soon" | "expired";
};

/** "Expires in 3 days", "Expires tomorrow", "Expires today, 6:00 PM" or "Expired Nov 30". */
export function expiry(link: Pick<ShareLink, "expires_at" | "expired">, now: Date): Expiry {
  const at = new Date(link.expires_at);
  if (link.expired || at <= now) return { text: `Expired ${shortDate(at)}`, tone: "expired" };
  const days = daysBetween(now, at);
  if (days <= 0) return { text: `Expires today, ${timeFormat.format(at)}`, tone: "soon" };
  if (days === 1) return { text: "Expires tomorrow", tone: "normal" };
  return { text: `Expires in ${days} days`, tone: "normal" };
}

/** "Viewed today, 8:12 AM", "Viewed yesterday, 8:12 AM", "Viewed Nov 20, 8:12 AM" or "Not opened yet". */
export function lastOpened(link: Pick<ShareLink, "last_opened_at">, now: Date): string {
  if (!link.last_opened_at) return "Not opened yet";
  const at = new Date(link.last_opened_at);
  const days = daysBetween(at, now);
  const day = days === 0 ? "today" : days === 1 ? "yesterday" : shortDate(at);
  return `Viewed ${day}, ${timeFormat.format(at)}`;
}

/** How many people can open a link now: one per link that hasn't expired. */
export function followingText(links: Pick<ShareLink, "expired">[]): string {
  const open = links.filter((link) => !link.expired).length;
  if (open === 0) return "Every link has expired, so no one can follow along right now. Renew a link to share again.";
  const people = open === 1 ? "1 person" : `${open} people`;
  return `${people} can follow along. Each link has its own passcode and stops working as soon as you stop sharing it.`;
}

// Short, everyday words that are easy to say on the phone and hard to mishear.
const WORDS = [
  "maple", "river", "otter", "cedar", "harbour", "meadow", "pebble", "lantern", "willow", "comet",
  "acorn", "birch", "canoe", "falcon", "garden", "island", "juniper", "kettle", "lemon", "marble",
  "nutmeg", "orchard", "pepper", "quilt", "robin", "sparrow", "tulip", "violet", "walnut", "yarrow",
  "almond", "beacon", "clover", "dune", "ember", "fern", "glacier", "hazel", "iris", "jasper",
  "koala", "lagoon", "mango", "nectar", "olive", "prairie", "raven", "summit", "thistle", "valley",
] as const;

/** A random number below `max`, from the browser's or Node's secure random source. */
function randomBelow(max: number) {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return value % max;
}

/** A Passcode like "maple-river-otter-42": three different words and a number, easy to say out loud. */
export function suggestPasscode(random: (max: number) => number = randomBelow): string {
  const words: string[] = [];
  while (words.length < 3) {
    const word = WORDS[random(WORDS.length)];
    if (!words.includes(word)) words.push(word);
  }
  return `${words.join("-")}-${10 + random(90)}`;
}
