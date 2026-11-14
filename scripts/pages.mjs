// Every page route, signed out and signed in, for scripts/smoke.mjs and scripts/a11y.mjs.
// scripts/pages.test.ts fails when a src/app page.tsx has no entry here for either state.
//   expect    text the page must show
//   redirect  the page must redirect instead (a11y skips it)
//   states    what a click opens or reveals (a dialog, a toggled column); a11y checks each one,
//             signed in as a user holding scripts/dev-applications.mjs's Applications, and
//             `npm run capture -- --state <name>` captures one. Each step clicks the first element
//             matching `click` whose text includes `text`; `expect` is text the state must show.
export const PAGES = [
  { path: "/", signedIn: false, expect: "Sign up" },
  { path: "/", signedIn: true, expect: "Sign up" },
  { path: "/privacy", signedIn: false, expect: "Privacy Policy" },
  { path: "/privacy", signedIn: true, expect: "Privacy Policy" },
  { path: "/dashboard", signedIn: false, redirect: true },
  {
    path: "/dashboard",
    signedIn: true,
    expect: "Add application",
    states: [
      { name: "show-done", steps: [{ click: "label", text: "Show done" }], expect: "Rejected" },
      {
        name: "edit-dialog",
        steps: [{ click: 'section[aria-label="Interview scheduled"] li button' }],
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
      { name: "add-dialog", steps: [{ click: "button", text: "Add application" }], expect: "Job posting URL" },
    ],
  },
  { path: "/account", signedIn: false, redirect: true },
  { path: "/account", signedIn: true, expect: "Delete account" },
];
