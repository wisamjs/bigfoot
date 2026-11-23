#!/usr/bin/env node
// Accessibility check: loads each page in scripts/pages.mjs in headless Chrome, in light and dark colour schemes,
// runs axe-core's WCAG 2.2 A and AA rules plus its best practices (one h1, no skipped heading levels,
// landmarks), and fails on any violation. Then, at 320px wide (WCAG reflow, the same as 1280px at
// 400% zoom), each page must not scroll sideways, and its first Tab must reach the skip link. On a
// phone (375×812, touch), every page and state must have no interactive element under 44×44px
// (inline text links excepted) and no text cut off by an ellipsis (docs/guidelines/mobile.md).
// Last, runs axe on each page's `states` (dialogs, toggles), and uses each open dialog by keyboard
// (focus stays inside, Escape closes it, focus returns to its opener), signed in as its own job
// seeker holding the Applications from scripts/dev-applications.mjs, emptied again afterwards
// (or, for states with `applications: "none"`, as one holding none).
// Uses this checkout's dev server (A11Y_URL, default http://localhost:3300) and API
// (API_URL, default http://localhost:8000) like smoke does. CHROME_PATH picks Chrome.
// A11Y_SHARD=1/2 checks only the first of two shards of the pages, with their states
// (scripts/a11y-shard.mjs), as CI's accessibility jobs do; unset, every page is checked.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parseShard, shardPages } from "./a11y-shard.mjs";
import { dialogKeyboardProblems, enterState, launchChrome, openPage, skipLinkProblems } from "./chrome.mjs";
import { withNoApplications, withTestApplications } from "./dev-applications.mjs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";
import { clippedTextProblems, touchTargetProblems, emulateDesktop, emulatePhone } from "./mobile-checks.mjs";
import { pagePath } from "./page-path.mjs";
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
const SHARD = parseShard(process.env.A11Y_SHARD);

// Every page that renders (not redirects), signed out and signed in. A page with an `application` needs
// the Applications from scripts/dev-applications.mjs, so it is checked with the `states` below.
// A shard keeps its share of them, each with its states.
const rendered = shardPages(
  PAGES.filter((page) => !page.redirect),
  SHARD,
);
if (SHARD.total > 1) console.log(`Shard ${SHARD.index} of ${SHARD.total}: ${rendered.length} pages\n`);
const pages = rendered.filter((page) => !page.application);
const dataPages = rendered.filter((page) => page.application);

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

async function setWidth(chrome, size) {
  await emulateDesktop(chrome, size);
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

/** The phone rules on the page as it stands: hit areas and clipped text. */
async function phoneProblems(chrome) {
  return [...(await touchTargetProblems(chrome)), ...(await clippedTextProblems(chrome))];
}

/**
 * Compiles every route before checking. Each CI shard starts its dev server cold, and a state can
 * open a page another shard checks (adding an Application opens its page): a first compile inside
 * a state's 15s wait made `application-added` time out. Requests run together; errors are left to
 * the checks below.
 */
async function warmUp() {
  const cookie = `${SESSION_COOKIE}=${await createTestSession()}`;
  const routes = PAGES.filter((page) => !page.redirect && !page.application);
  await Promise.all(
    routes.map(async (page) => {
      const headers = page.signedIn ? { cookie } : {};
      await fetch(`${base}${await pagePath(page)}`, { headers, signal: AbortSignal.timeout(60_000) })
        .then((response) => response.text())
        .catch(() => {});
    }),
  );
}

await warmUp();
const chrome = await launchChrome();
try {
  await chrome.send("Page.enable");
  await setWidth(chrome, DESKTOP);
  for (const scheme of SCHEMES) {
    await setScheme(chrome, scheme);
    for (const page of pages) {
      await signIn(chrome, page.signedIn ? undefined : null);
      await openPage(chrome, `${base}${await pagePath(page)}`, page.expect);
      report(`${page.path} (${page.signedIn ? "signed in" : "signed out"}, ${scheme})`, await violations(chrome, page.path));
    }
  }

  // Layout and keyboard don't depend on the colour scheme, so check reflow and the skip link once.
  await setWidth(chrome, { width: REFLOW_WIDTH, height: 640 });
  for (const page of pages) {
    const label = `${page.path} (${page.signedIn ? "signed in" : "signed out"})`;
    await signIn(chrome, page.signedIn ? undefined : null);
    await openPage(chrome, `${base}${await pagePath(page)}`, page.expect);
    report(`${label} at ${REFLOW_WIDTH}px`, await reflowProblems(chrome));
    report(`${label} skip link`, await skipLinkProblems(chrome));
  }

  // Layout and hit areas don't depend on the colour scheme either, so check them on a phone once.
  await setScheme(chrome, SCHEMES[0]);
  await emulatePhone(chrome);
  for (const page of pages) {
    await signIn(chrome, page.signedIn ? undefined : null);
    await openPage(chrome, `${base}${await pagePath(page)}`, page.expect);
    report(`${page.path} (${page.signedIn ? "signed in" : "signed out"}) on a phone`, await phoneProblems(chrome));
  }
  await setWidth(chrome, DESKTOP);

  const withStates = rendered.filter((page) => page.states?.length);
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
          await openPage(chrome, `${base}${await pagePath(page, jobSeekerId)}`, page.expect);
          await enterState(chrome, state);
          report(`${page.path} ${state.name} (${scheme})`, await violations(chrome, `${page.path} ${state.name}`));
          // Keyboard behaviour doesn't depend on the colour scheme, so check it once. Last: it closes the dialog.
          if (scheme === SCHEMES[0]) report(`${page.path} ${state.name} keyboard`, await dialogKeyboardProblems(chrome));
        }
      }
    }
  }

  /** The states `pick` keeps on a phone, signed in as `jobSeekerId`. */
  async function checkPhoneStates(jobSeekerId, pick) {
    await setScheme(chrome, SCHEMES[0]);
    await emulatePhone(chrome);
    for (const page of withStates) {
      const states = page.states.filter(pick);
      if (!states.length) continue;
      await signIn(chrome, page.signedIn ? jobSeekerId : null);
      for (const state of states) {
        await openPage(chrome, `${base}${await pagePath(page, jobSeekerId)}`, page.expect);
        await enterState(chrome, state);
        report(`${page.path} ${state.name} on a phone`, await phoneProblems(chrome));
      }
    }
    await setWidth(chrome, DESKTOP);
  }

  /** The pages that need Applications, as the pages above are checked: colours, reflow and the skip link. */
  async function checkDataPages(jobSeekerId) {
    for (const scheme of SCHEMES) {
      await setScheme(chrome, scheme);
      for (const page of dataPages) {
        await signIn(chrome, jobSeekerId);
        await openPage(chrome, `${base}${await pagePath(page, jobSeekerId)}`, page.expect);
        report(`${page.path} (signed in, ${scheme})`, await violations(chrome, page.path));
      }
    }
    await setWidth(chrome, { width: REFLOW_WIDTH, height: 640 });
    for (const page of dataPages) {
      await signIn(chrome, jobSeekerId);
      await openPage(chrome, `${base}${await pagePath(page, jobSeekerId)}`, page.expect);
      report(`${page.path} (signed in) at ${REFLOW_WIDTH}px`, await reflowProblems(chrome));
      report(`${page.path} (signed in) skip link`, await skipLinkProblems(chrome));
    }
    await emulatePhone(chrome);
    for (const page of dataPages) {
      await signIn(chrome, jobSeekerId);
      await openPage(chrome, `${base}${await pagePath(page, jobSeekerId)}`, page.expect);
      report(`${page.path} (signed in) on a phone`, await phoneProblems(chrome));
    }
    await setWidth(chrome, DESKTOP);
  }

  const states = withStates.flatMap((page) => page.states);
  if (dataPages.length || states.some((s) => !empty(s))) {
    await withTestApplications(STATES_JOB_SEEKER_ID, async () => {
      await checkDataPages(STATES_JOB_SEEKER_ID);
      await checkStates(STATES_JOB_SEEKER_ID, (s) => !empty(s));
      await checkPhoneStates(STATES_JOB_SEEKER_ID, (s) => !empty(s));
    });
  }
  if (states.some(empty)) {
    await withNoApplications(EMPTY_JOB_SEEKER_ID, async () => {
      await checkStates(EMPTY_JOB_SEEKER_ID, empty);
      await checkPhoneStates(EMPTY_JOB_SEEKER_ID, empty);
    });
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
