#!/usr/bin/env node
// Accessibility check: loads each page in scripts/pages.mjs in headless Chrome, in light and dark colour schemes,
// runs axe-core's WCAG 2.2 A and AA rules plus its best practices (one h1, no skipped heading levels,
// landmarks), and fails on any violation. Then, at 320px wide (WCAG reflow, the same as 1280px at
// 400% zoom), each page must not scroll sideways, and its first Tab must reach the skip link.
// Last, runs axe on each page's `states` (dialogs, toggles), and uses each open dialog by keyboard
// (focus stays inside, Escape closes it, focus returns to its opener), signed in as its own job
// seeker holding the Applications from scripts/dev-applications.mjs, emptied again afterwards
// (or, for states with `applications: "none"`, as one holding none).
// Uses this checkout's dev server (A11Y_URL, default http://localhost:3300) and API
// (API_URL, default http://localhost:8000) like smoke does. CHROME_PATH picks Chrome.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dialogKeyboardProblems, enterState, launchChrome, openPage, skipLinkProblems } from "./chrome.mjs";
import { withNoApplications, withTestApplications } from "./dev-applications.mjs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";
import { PAGES } from "./pages.mjs";
import { ensureServers } from "./servers.mjs";

const { base } = await ensureServers(
  process.env.A11Y_URL ?? "http://localhost:3300",
  process.env.API_URL ?? "http://localhost:8000",
);
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];
const DESKTOP = { width: 1440, height: 990 };
const REFLOW_WIDTH = 320;
// Not the dev-session test user, so whatever that user has stays as it was.
const STATES_JOB_SEEKER_ID = "a11y-user";
const EMPTY_JOB_SEEKER_ID = "a11y-empty-user";
const SCHEMES = ["light", "dark"];

// Every page that renders (not redirects), signed out and signed in.
const pages = PAGES.filter((page) => !page.redirect);

/** axe violations on the page as it stands, one line per failing element. */
async function violations(chrome, where) {
  await chrome.send("Runtime.evaluate", { expression: AXE_SOURCE });
  // Colours are measured at rest: a button re-enabled by a save fades back in over .btn's
  // transition, and mid-fade it fails contrast. Animations (spinners, "Saved" fading out) run on.
  await chrome.send("Runtime.evaluate", {
    expression: `Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {})))`,
    awaitPromise: true,
  });
  const { result, exceptionDetails } = await chrome.send("Runtime.evaluate", {
    expression: `axe.run(document, { runOnly: { type: "tag", values: ${JSON.stringify(AXE_TAGS)} } }).then((r) =>
      r.violations.flatMap((v) => v.nodes.map((n) => \`\${v.id} (\${v.impact}): \${n.target.join(" ")}: \${n.failureSummary.split("\\n").slice(1).join(" ").trim()}\`)))`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(`axe failed on ${where}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  return result.value;
}

/** Elements wider than the viewport when the page scrolls sideways, else nothing. */
async function reflowProblems(chrome) {
  const { result } = await chrome.send("Runtime.evaluate", {
    expression: `(() => {
      const width = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth <= width) return [];
      const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".") : "");
      const wide = [...document.body.querySelectorAll("*")].filter((el) => el.getBoundingClientRect().right > width + 1);
      // Report the outermost offenders only: their children overflow because they do.
      return wide.filter((el) => !wide.includes(el.parentElement)).slice(0, 5)
        .map((el) => \`scrolls sideways at ${REFLOW_WIDTH}px: \${name(el)} ends at \${Math.round(el.getBoundingClientRect().right)}px\`);
    })()`,
    returnByValue: true,
  });
  return result.value;
}

async function setWidth(chrome, { width, height }) {
  await chrome.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

let failed = 0;

function report(label, found) {
  if (found.length === 0) {
    console.log(`✓ ${label}`);
    return;
  }
  failed += found.length;
  console.error(`✗ ${label}`);
  for (const line of found) console.error(`    ${line}`);
}

async function signIn(chrome, jobSeekerId) {
  await chrome.send("Network.clearBrowserCookies");
  if (jobSeekerId !== null) {
    await chrome.send("Network.setCookie", { name: SESSION_COOKIE, value: await createTestSession(jobSeekerId), url: base });
  }
}

async function setScheme(chrome, scheme) {
  await chrome.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
}

const chrome = await launchChrome();
try {
  await chrome.send("Page.enable");
  await setWidth(chrome, DESKTOP);
  for (const scheme of SCHEMES) {
    await setScheme(chrome, scheme);
    for (const page of pages) {
      await signIn(chrome, page.signedIn ? undefined : null);
      await openPage(chrome, `${base}${page.path}`, page.expect);
      report(`${page.path} (${page.signedIn ? "signed in" : "signed out"}, ${scheme})`, await violations(chrome, page.path));
    }
  }

  // Layout and keyboard don't depend on the colour scheme, so check reflow and the skip link once.
  await setWidth(chrome, { width: REFLOW_WIDTH, height: 640 });
  for (const page of pages) {
    const label = `${page.path} (${page.signedIn ? "signed in" : "signed out"})`;
    await signIn(chrome, page.signedIn ? undefined : null);
    await openPage(chrome, `${base}${page.path}`, page.expect);
    report(`${label} at ${REFLOW_WIDTH}px`, await reflowProblems(chrome));
    report(`${label} skip link`, await skipLinkProblems(chrome));
  }
  await setWidth(chrome, DESKTOP);

  const withStates = pages.filter((page) => page.states?.length);
  const empty = (state) => state.applications === "none";

  /** Runs axe on each state `pick` keeps, signed in as `jobSeekerId`, and uses any open dialog by keyboard. */
  async function checkStates(jobSeekerId, pick) {
    for (const scheme of SCHEMES) {
      await setScheme(chrome, scheme);
      for (const page of withStates) {
        const states = page.states.filter(pick);
        if (!states.length) continue;
        await signIn(chrome, page.signedIn ? jobSeekerId : null);
        for (const state of states) {
          await openPage(chrome, `${base}${page.path}`, page.expect);
          await enterState(chrome, state);
          report(`${page.path} ${state.name} (${scheme})`, await violations(chrome, `${page.path} ${state.name}`));
          // Keyboard behaviour doesn't depend on the colour scheme, so check it once. Last: it closes the dialog.
          if (scheme === SCHEMES[0]) report(`${page.path} ${state.name} keyboard`, await dialogKeyboardProblems(chrome));
        }
      }
    }
  }

  const states = withStates.flatMap((page) => page.states);
  if (states.some((s) => !empty(s))) {
    await withTestApplications(STATES_JOB_SEEKER_ID, () => checkStates(STATES_JOB_SEEKER_ID, (s) => !empty(s)));
  }
  if (states.some(empty)) {
    await withNoApplications(EMPTY_JOB_SEEKER_ID, () => checkStates(EMPTY_JOB_SEEKER_ID, empty));
  }
} finally {
  await chrome.close();
}

// Exit explicitly: the servers' output pipes would otherwise keep Node running. The exit
// handler in scripts/servers.mjs stops the servers this run started.
if (failed) {
  console.error(`\n${failed} accessibility violation(s)`);
  process.exit(1);
}
console.log("\nNo accessibility violations");
process.exit(0);
