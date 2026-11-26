// Versioning for the Privacy Policy at /privacy. Kept outside the page so it can be tested and
// reused (e.g. a dashboard notice when the policy changes).

/** The date the current version of the policy takes effect (ISO yyyy-mm-dd). */
export const PRIVACY_EFFECTIVE_DATE = "2026-11-26";

/** Newest first. The first entry's date must equal PRIVACY_EFFECTIVE_DATE. */
export const PRIVACY_CHANGES: readonly { date: string; summary: string }[] = [
  {
    date: "2026-11-26",
    summary:
      "You can make Share links on your Account page, so someone you choose can follow your search. For each one, we store who it is for, its dates and a one-way hash of its passcode, never the passcode itself. Your data download lists each link’s label and dates, and deleting your account deletes your Share links.",
  },
  {
    date: "2026-11-25",
    summary:
      "Each Interview now has a title you write and a category (such as Recruiter or System Design) in place of its kind. Each existing Interview kept its kind’s name as its title. We store the title as we do your other Interview details: it is included in your data download, and deleted with the Interview or your account.",
  },
  {
    date: "2026-11-23",
    summary:
      "You can also write Prep notes on each Interview, to get ready for it. We store what you write there as we do Interview notes: it is included in your data download, and deleted with the Interview or your account. When you mark an Application Done, we also store the date it ended (its Done date) and, if you write one, an Outcome note: what the company said. Both are included in your data download, cleared when you reopen the Application, and deleted with it or your account.",
  },
  {
    date: "2026-11-21",
    summary:
      "We send reports of errors in Bigfoot to Sentry, so we can fix them. A report names you only by a one-way hash of your Google account id, and leaves out your Applications, email address, IP address and cookies. Sentry keeps reports for up to 90 days.",
  },
  {
    date: "2026-11-16",
    summary:
      "You can create Access tokens on your Account page, so your own scripts can read and change your Applications. We store each token’s name and dates and a one-way hash of its secret, never the secret itself. You can also write Interview notes on each Interview: what they asked, how it went and a takeaway for next time. We store what you write there, include it in your data download, and delete it with the Interview or your account.",
  },
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

/**
 * The longest Sentry keeps error reports on any plan: 30 days on Developer (free), 90 on Team and
 * Business, and so during a trial too (https://docs.sentry.io/security-legal-pii/security/data-retention-periods/).
 */
export const ERROR_REPORT_RETENTION_DAYS = 90;

/** Where job seekers send privacy questions and requests. */
export const PRIVACY_CONTACT_EMAIL = "wisamzaghal@gmail.com";

/** "November 11, 2026". Parsed as UTC so the date never shifts with the server's time zone. */
export function formatPolicyDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
