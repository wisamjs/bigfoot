// Every page route, signed out and signed in, for scripts/smoke.mjs and scripts/a11y.mjs.
// scripts/pages.test.ts fails when a src/app page.tsx has no entry here for either state.
//   expect    text the page must show
//   redirect  the page must redirect instead (a11y skips it): a path means an HTTP redirect there
//             (src/proxy.ts); true allows the redirect a page streams while it renders
//   states    what a click opens or reveals (a dialog, a toggled column); a11y checks each one,
//             signed in as a user holding scripts/dev-applications.mjs's Applications and Access
//             token, and `npm run capture -- --state <name>` captures one. Each step clicks the first
//             element matching `click` whose text includes `text`, or types `value` into the first
//             element matching `fill`; `expect` is text the state must show.
//             `applications: "none"` signs in as a job seeker with no Applications instead, for
//             empty states.
export const PAGES = [
  { path: "/", signedIn: false, expect: "Find your Bigfoot" },
  { path: "/", signedIn: true, redirect: "/dashboard" },
  { path: "/sign-in", signedIn: false, expect: "Continue with Google" },
  { path: "/sign-in", signedIn: true, redirect: "/dashboard" },
  { path: "/sign-up", signedIn: false, expect: "Continue with Google" },
  { path: "/sign-up", signedIn: true, redirect: "/dashboard" },
  { path: "/privacy", signedIn: false, expect: "Privacy Policy" },
  { path: "/privacy", signedIn: true, expect: "Privacy Policy" },
  { path: "/terms", signedIn: false, expect: "Terms of Service" },
  { path: "/terms", signedIn: true, expect: "Terms of Service" },
  { path: "/accessibility", signedIn: false, expect: "Report a barrier" },
  { path: "/accessibility", signedIn: true, expect: "Report a barrier" },
  { path: "/dashboard", signedIn: false, redirect: true },
  {
    path: "/dashboard",
    signedIn: true,
    expect: "Add application",
    states: [
      { name: "show-done", steps: [{ click: "label", text: "Show done" }], expect: "Rejected" },
      {
        name: "application-panel",
        steps: [{ click: 'section[aria-label="Interview scheduled"] li button' }],
        expect: "Save details",
      },
      {
        name: "salary-revealed",
        steps: [
          { click: 'section[aria-label="Interview scheduled"] li button' },
          { click: "dialog[open] button", text: "Reveal" },
        ],
        expect: "Save details",
      },
      {
        name: "delete-confirmation",
        steps: [
          { click: 'section[aria-label="Interview scheduled"] li button' },
          { click: "dialog[open] button", text: "Delete application" },
        ],
        expect: "This can’t be undone",
      },
      { name: "add-panel", steps: [{ click: "button", text: "Add application" }], expect: "Job posting URL" },
      { name: "nothing-coming-up", applications: "none", steps: [], expect: "All quiet in the woods" },
    ],
  },
  { path: "/account", signedIn: false, redirect: true },
  {
    path: "/account",
    signedIn: true,
    // Text only the loaded page shows: the skeleton has the headings, so waiting for one can catch
    // the page mid-stream, with the skeleton and the loaded page both in the DOM.
    expect: "to confirm",
    states: [
      {
        name: "token-created",
        steps: [
          { fill: 'input[name="name"]', value: "Laptop script" },
          { click: "button", text: "Create Access token" },
        ],
        expect: "Copy your Access token now",
      },
      {
        name: "revoke-confirmation",
        steps: [{ click: "button", text: "Revoke" }],
        expect: "will stop working straight away",
      },
    ],
  },
];
