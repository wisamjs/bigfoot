// Versioning for the Privacy Policy at /privacy. Kept outside the page so it can be tested and
// reused (e.g. a dashboard notice when the policy changes).

/** The date the current version of the policy takes effect (ISO yyyy-mm-dd). */
export const PRIVACY_EFFECTIVE_DATE = "2026-11-11";

/** Newest first. The first entry's date must equal PRIVACY_EFFECTIVE_DATE. */
export const PRIVACY_CHANGES: readonly { date: string; summary: string }[] = [
  { date: "2026-11-11", summary: "First version." },
];

/** Where job seekers send privacy questions and requests. */
export const PRIVACY_CONTACT_EMAIL = "wisamzaghal@gmail.com";

/** "November 11, 2026". Parsed as UTC so the date never shifts with the server's time zone. */
export function formatPolicyDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
