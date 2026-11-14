// Versioning for the Privacy Policy at /privacy. Kept outside the page so it can be tested and
// reused (e.g. a dashboard notice when the policy changes).

/** The date the current version of the policy takes effect (ISO yyyy-mm-dd). */
export const PRIVACY_EFFECTIVE_DATE = "2026-11-14";

/** Newest first. The first entry's date must equal PRIVACY_EFFECTIVE_DATE. */
export const PRIVACY_CHANGES: readonly { date: string; summary: string }[] = [
  {
    date: "2026-11-14",
    summary:
      "You can download a copy of your data yourself on your Account page, as CSV or JSON, instead of emailing us.",
  },
  {
    date: "2026-11-13",
    summary:
      "An Application now holds a list of Interviews, each with a kind and an optional date, and a Status and Outcome, instead of one previous and one next round. We store the same kind of information; we only describe it differently.",
  },
  {
    date: "2026-11-12",
    summary:
      "You can delete your account yourself on your Account page, instead of emailing us. We keep a record of each account deletion, without your Google account id.",
  },
  { date: "2026-11-11", summary: "First version." },
];

/**
 * Hosting plans the policy's retention periods depend on. Changing a plan changes the policy:
 * add an entry to PRIVACY_CHANGES too.
 * - Vercel runtime logs: Hobby 1 hour, Pro 1 day (https://vercel.com/docs/logs/runtime#limits)
 * - Supabase daily backups: Pro 7 days, Team 14 (https://supabase.com/docs/guides/platform/backups)
 */
export const HOSTING_PLANS = { vercel: "hobby", supabase: "pro" } as const;

const LOG_RETENTION = { hobby: "1 hour", pro: "1 day" } as const;
const BACKUP_RETENTION_DAYS = { pro: 7, team: 14 } as const;

/** How long Vercel keeps server logs, as the policy says it. */
export const SERVER_LOG_RETENTION = LOG_RETENTION[HOSTING_PLANS.vercel];

/** How many days each daily database backup is kept. */
export const BACKUP_DAYS = BACKUP_RETENTION_DAYS[HOSTING_PLANS.supabase];

/** Where job seekers send privacy questions and requests. */
export const PRIVACY_CONTACT_EMAIL = "wisamzaghal@gmail.com";

/** "November 11, 2026". Parsed as UTC so the date never shifts with the server's time zone. */
export function formatPolicyDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
