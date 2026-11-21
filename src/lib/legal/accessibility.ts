// Versioning for the accessibility statement at /accessibility, like TERMS_CHANGES for the Terms.

/** The standard Bigfoot aims to meet, and that `npm run a11y` checks every page against. */
export const CONFORMANCE_TARGET = "WCAG 2.2 Level AA";

/** The date the current version of the statement takes effect (ISO yyyy-mm-dd). */
export const ACCESSIBILITY_EFFECTIVE_DATE = "2026-11-20";

/** Newest first. The first entry's date must equal ACCESSIBILITY_EFFECTIVE_DATE. */
export const ACCESSIBILITY_CHANGES: readonly { date: string; summary: string }[] = [
  { date: "2026-11-20", summary: "First version." },
];
