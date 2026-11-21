// Versioning for the Terms of Service at /terms, like PRIVACY_CHANGES for the Privacy Policy.

/** The date the current version of the Terms takes effect (ISO yyyy-mm-dd). */
export const TERMS_EFFECTIVE_DATE = "2026-11-16";

/** Newest first. The first entry's date must equal TERMS_EFFECTIVE_DATE. */
export const TERMS_CHANGES: readonly { date: string; summary: string }[] = [
  {
    date: "2026-11-16",
    summary:
      "Your own scripts may now use Bigfoot with an Access token you create on your Account page. You are responsible for keeping your Access tokens secret.",
  },
  { date: "2026-11-14", summary: "First version." },
];

/** Where disputes about the Terms are decided. */
export const GOVERNING_LAW = "the Province of Ontario and the federal laws of Canada that apply there";
