// Every page route, signed out and signed in, for scripts/smoke.mjs and scripts/a11y.mjs.
// scripts/pages.test.ts fails when a src/app page.tsx has no entry here for either state.
//   expect    text the page must show
//   redirect  the page must redirect instead (a11y skips it)
export const PAGES = [
  { path: "/", signedIn: false, expect: "Sign up" },
  { path: "/", signedIn: true, expect: "Sign up" },
  { path: "/privacy", signedIn: false, expect: "Privacy Policy" },
  { path: "/privacy", signedIn: true, expect: "Privacy Policy" },
  { path: "/dashboard", signedIn: false, redirect: true },
  { path: "/dashboard", signedIn: true, expect: "All applications" },
  { path: "/account", signedIn: false, redirect: true },
  { path: "/account", signedIn: true, expect: "Delete account" },
];
