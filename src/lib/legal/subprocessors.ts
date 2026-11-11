// Service providers that process job seekers' personal information for Bigfoot.
// One list for every legal page: the Privacy Policy imports it, and so will the Terms (BIG-4).
// When a provider is added or removed, update this list and add an entry to PRIVACY_CHANGES.

export type Subprocessor = {
  name: string;
  purpose: string;
  /** What the provider receives, in plain language. */
  receives: string;
  /** Where the provider stores or processes it. */
  location: string;
  privacyUrl: string;
};

export const SUBPROCESSORS: readonly Subprocessor[] = [
  {
    name: "Google",
    purpose: "Sign-in",
    receives:
      "Your sign-in request. Google tells us your name, email address, profile photo and Google account id.",
    location: "United States and other countries",
    privacyUrl: "https://policies.google.com/privacy",
  },
  {
    name: "Vercel",
    purpose: "Hosting the website and the API",
    receives:
      "Every request your browser makes to Bigfoot, including your IP address, browser details and the pages you open, plus the Applications passing through our servers.",
    location: "United States",
    privacyUrl: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Supabase",
    purpose: "Database",
    receives: "Your Applications and Rounds, stored against your Google account id.",
    location: "United States",
    privacyUrl: "https://supabase.com/privacy",
  },
  {
    name: "Sentry",
    purpose: "Error reports",
    receives:
      "Details about errors: the page or request that failed, browser details and your Google account id. We ask it not to keep IP addresses or Application details.",
    location: "United States",
    privacyUrl: "https://sentry.io/privacy/",
  },
];
