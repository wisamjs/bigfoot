// Every page route, signed out and signed in, for scripts/smoke.mjs and scripts/a11y.mjs.
// scripts/pages.test.ts fails when a src/app page.tsx has no entry here for either state.
//   expect    text the page must show
//   params, application, interview
//             what fills a dynamic route's [id] and [interviewId] (scripts/page-path.mjs); a page
//             with `application` is opened by a job seeker holding scripts/dev-applications.mjs's
//             Applications, and `interview` names the title of one of that Application's Interviews
//   redirect  the page must redirect instead (a11y skips it): a path means an HTTP redirect there
//             (src/proxy.ts: signed-out visitors go to /sign-in with `next`); true allows the
//             redirect a page streams while it renders
//   states    what a click or typing opens or reveals (a dialog, a toggled column, an error); a11y
//             checks each one, signed in as a user holding scripts/dev-applications.mjs's
//             Applications and Access token, and `npm run capture -- --state <name>` captures one. Each step clicks
//             the first element matching `click` whose text includes `text` (with `pointer: true` it
//             presses it instead, as a Radix menu opens on pointerdown), or types `value` into
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
  { path: "/dashboard", signedIn: false, redirect: "/sign-in" },
  {
    path: "/dashboard",
    signedIn: true,
    expect: "Add Application",
    states: [
      { name: "show-done", steps: [{ click: "label", text: "Show done" }], expect: "Rejected" },
      { name: "nothing-scheduled", applications: "none", steps: [], expect: "All quiet in the woods" },
      { name: "account-menu", steps: [{ click: "button", text: "Account menu", pointer: true }], expect: "Sign out" },
    ],
  },
  // A dynamic route's entry fills its [id]: `application` is the company of one of the
  // Applications from scripts/dev-applications.mjs, `params` the value itself (scripts/page-path.mjs).
  { path: "/applications/[id]", signedIn: false, params: { id: "unknown" }, redirect: "/sign-in" },
  {
    path: "/applications/[id]",
    signedIn: true,
    application: "Datadog",
    expect: "Open Interview",
    states: [
      {
        name: "details-editing",
        steps: [{ click: 'button[aria-label="Edit details"]' }],
        expect: "Stays hidden while you edit",
      },
      { name: "salary-revealed", steps: [{ click: "button", text: "Reveal" }], expect: "Hide" },
      // ⋯ holds Delete application, and on a phone the Change Status choices too. Mark done…, the
      // wide-screen menu, is checked by its story (application-editor.stories.tsx, MarkDone).
      {
        name: "more-menu",
        steps: [{ click: 'button[aria-label^="More actions"]', pointer: true }],
        expect: "Delete application",
      },
      {
        name: "delete-confirmation",
        steps: [
          { click: 'button[aria-label^="More actions"]', pointer: true },
          { click: '[role="menuitem"]', text: "Delete application" },
        ],
        expect: "This can’t be undone",
      },
    ],
  },
  // A Done Application (BIG-182): its Outcome card with the Outcome note and a takeaway, and Ended in
  // Details, whose fields add the Done date and Outcome note.
  {
    path: "/applications/[id]",
    signedIn: true,
    application: "Vercel",
    expect: "What you’re taking from it",
    states: [
      {
        name: "done-details-editing",
        steps: [{ click: 'button[aria-label="Edit details"]' }],
        expect: "Outcome note",
      },
    ],
  },
  // An Application with no Interviews yet: Bigfoot and a first Add Interview (BIG-174).
  { path: "/applications/[id]", signedIn: true, application: "Stripe", expect: "No Interviews yet" },
  {
    // A deleted Application, a malformed id and another job seeker's Application look the same.
    // The page streams inside Suspense, so the response is 200 with the not-found page and a
    // noindex tag, not a 404 status.
    path: "/applications/[id]",
    signedIn: true,
    params: { id: "not-an-application" },
    expect: "Application not found",
  },
  {
    path: "/applications/[id]/interviews/[interviewId]",
    signedIn: false,
    params: { id: "unknown", interviewId: "unknown" },
    redirect: "/sign-in",
  },
  {
    // A Done Application's Interview (BIG-119): it opens with its Status/Outcome badge, and its
    // completed Interview has Interview notes.
    path: "/applications/[id]/interviews/[interviewId]",
    signedIn: true,
    application: "Vercel",
    interview: "Technical",
    expect: "Done · Rejected",
    states: [
      {
        name: "interview-heading-editing",
        steps: [{ click: "button", text: "Edit details" }],
        expect: "Save",
      },
      {
        name: "interview-heading-calendar",
        steps: [{ click: "button", text: "Edit details" }, { click: 'main form button[aria-label^="Date, "]' }],
        expect: "Mo",
      },
      {
        name: "delete-interview-page-confirmation",
        steps: [{ click: 'button[aria-label^="More actions"]', pointer: true }, { click: '[role="menuitem"]', text: "Delete Interview" }],
        expect: "with its Interview notes and Prep notes",
      },
      {
        // A completed Interview's Prep notes are folded to their first lines (BIG-180).
        name: "interview-prep-notes-open",
        steps: [{ click: "button", text: "Show Prep notes" }],
        expect: "Hide Prep notes",
      },
      {
        name: "interview-prep-notes-editing",
        steps: [{ click: "button", text: "Show Prep notes" }, { click: 'button[aria-label="Edit Prep notes"]' }],
        expect: "Done",
      },
      {
        // How it went over the limit (typed past the field's maxLength, as a paste could) fails its
        // check and are never sent, so they stay unsaved and leaving asks first. A save that went
        // through would let the job seeker leave before the prompt could be checked.
        name: "interview-unsaved-changes-prompt",
        steps: [
          { click: 'button[aria-label="Edit Interview notes"]' },
          { fill: 'textarea[id^="how_it_went-"]', value: "x".repeat(20_001) },
          // "← Vercel", back to the Interview's Application page (BIG-166).
          { click: "main a", text: "Vercel" },
        ],
        expect: "You have unsaved changes.",
      },
    ],
  },
  {
    // A completed Interview whose takeaway shows on the prep for Figma's next Interview and for the
    // next Technical elsewhere (BIG-181).
    path: "/applications/[id]/interviews/[interviewId]",
    signedIn: true,
    application: "Figma",
    interview: "Technical",
    expect: "Shows on your next Technical",
  },
  {
    // An upcoming Interview (BIG-180): the Before card with its Prep notes, the takeaways that
    // apply and They asked last time (BIG-181), and the After card waiting for how it went.
    path: "/applications/[id]/interviews/[interviewId]",
    signedIn: true,
    application: "Datadog",
    interview: "Technical",
    expect: "They asked last time",
    states: [
      {
        name: "interview-add-interview-notes",
        steps: [{ click: "button", text: "Add Interview notes" }],
        expect: "Done",
      },
    ],
  },
  {
    // A deleted Interview, a malformed id and another job seeker's Interview look the same.
    path: "/applications/[id]/interviews/[interviewId]",
    signedIn: true,
    params: { id: "not-an-application", interviewId: "not-an-interview" },
    expect: "Interview not found",
  },
  { path: "/applications/new", signedIn: false, redirect: "/sign-in" },
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
      {
        // Adding opens the new Application's page, which asks for its first Interview (BIG-130).
        name: "application-added",
        steps: [
          { fill: 'input[id$="-company"]', value: "Acme" },
          { fill: 'input[id$="-title"]', value: "Frontend Engineer" },
          { click: 'button[type="submit"]', text: "Add Application" },
        ],
        expect: "Got an Interview lined up?",
      },
      {
        // Leaving with a detail typed asks first, in the page: Keep editing / Discard (BIG-125).
        name: "unsaved-changes-prompt",
        steps: [
          { fill: 'input[id$="-title"]', value: "Frontend Engineer" },
          { fill: 'input[id$="-company"]', value: "Acme" },
          { click: "main a", text: "Dashboard" },
        ],
        expect: "You have unsaved changes.",
      },
    ],
  },
  { path: "/interviews/new", signedIn: false, redirect: "/sign-in" },
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
  { path: "/account", signedIn: false, redirect: "/sign-in" },
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
      // Share links (BIG-196): the test job seeker has one, "Mom & Dad" (scripts/dev-applications.mjs).
      {
        name: "share-link-created",
        steps: [
          { click: "button", text: "Share with someone else" },
          { fill: 'input[name="label"]', value: "Uncle Sami" },
          { click: "button", text: "Suggest" },
          { click: "button", text: "Create link" },
        ],
        expect: "You’ll only see this passcode now.",
      },
      {
        name: "change-passcode",
        steps: [{ click: "button", text: "Change passcode" }],
        expect: "Anyone viewing this link is signed out",
      },
      {
        name: "stop-sharing-confirmation",
        steps: [{ click: "button", text: "Stop sharing" }],
        expect: "The link stops working straight away.",
      },
    ],
  },
];
