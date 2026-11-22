// Every page route, signed out and signed in, for scripts/smoke.mjs and scripts/a11y.mjs.
// scripts/pages.test.ts fails when a src/app page.tsx has no entry here for either state.
//   expect    text the page must show
//   params, application
//             what fills a dynamic route's [id] (scripts/page-path.mjs); a page with `application`
//             is opened by a job seeker holding scripts/dev-applications.mjs's Applications
//   redirect  the page must redirect instead (a11y skips it): a path means an HTTP redirect there
//             (src/proxy.ts); true allows the redirect a page streams while it renders
//   states    what a click or typing opens or reveals (a dialog, a toggled column, an error); a11y
//             checks each one, signed in as a user holding scripts/dev-applications.mjs's
//             Applications and Access token, and `npm run capture -- --state <name>` captures one. Each step clicks
//             the first element matching `click` whose text includes `text`, or types `value` into
//             the first element matching `fill`; `expect` is text the state must show.
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
    expect: "Add Application",
    states: [
      { name: "show-done", steps: [{ click: "label", text: "Show done" }], expect: "Rejected" },
      { name: "nothing-coming-up", applications: "none", steps: [], expect: "All quiet in the woods" },
    ],
  },
  // A dynamic route's entry fills its [id]: `application` is the company of one of the
  // Applications from scripts/dev-applications.mjs, `params` the value itself (scripts/page-path.mjs).
  { path: "/applications/[id]", signedIn: false, params: { id: "unknown" }, redirect: true },
  {
    path: "/applications/[id]",
    signedIn: true,
    application: "Datadog",
    expect: "Job posting URL",
    states: [
      {
        name: "salary-revealed",
        steps: [{ click: "button", text: "Reveal" }],
        expect: "Job posting URL",
      },
      {
        name: "delete-confirmation",
        steps: [{ click: "button", text: "Delete application" }],
        expect: "This can’t be undone",
      },
      {
        name: "interview-calendar",
        steps: [{ click: 'button[id^="at-"]' }],
        expect: "Mo",
      },
    ],
  },
  {
    // A deleted Application, a malformed id and another job seeker's Application look the same.
    // The page streams inside Suspense, so the response is 200 with the not-found page and a
    // noindex tag, not a 404 status.
    path: "/applications/[id]",
    signedIn: true,
    params: { id: "not-an-application" },
    expect: "Application not found",
  },
  { path: "/applications/new", signedIn: false, redirect: true },
  {
    path: "/applications/new",
    signedIn: true,
    expect: "Job posting URL",
    states: [
      {
        name: "applied-calendar",
        steps: [{ click: 'button[id$="-applied_on"]' }],
        expect: "Mo",
      },
      {
        // A company of only spaces passes the browser's `required` but is blank once trimmed: the
        // form names the error beside the field and announces it, before anything is sent (BIG-89).
        name: "add-error",
        steps: [
          { fill: 'input[id$="-company"]', value: "   " },
          { fill: 'input[id$="-title"]', value: "Frontend Engineer" },
          { click: 'button[type="submit"]', text: "Add Application" },
        ],
        expect: "Enter the company.",
      },
    ],
  },
  { path: "/interviews/new", signedIn: false, redirect: true },
  {
    path: "/interviews/new",
    signedIn: true,
    // In the form ("Application") and the empty state ("Add Application"), not the loading state.
    expect: "Application",
    states: [
      {
        name: "interview-date-calendar",
        steps: [{ click: 'button[id$="-at"]' }],
        expect: "Mo",
      },
      {
        // Nothing chosen or picked: each error beside its field, announced, nothing sent.
        name: "add-interview-error",
        steps: [{ click: 'button[type="submit"]', text: "Add Interview" }],
        expect: "Choose the Application this Interview belongs to.",
      },
      {
        name: "add-interview-no-applications",
        applications: "none",
        steps: [],
        expect: "An Interview belongs to an Application",
      },
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
