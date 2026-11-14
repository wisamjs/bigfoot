#!/usr/bin/env node
// Accessibility check: loads each page in scripts/pages.mjs in headless Chrome, in light and dark colour schemes,
// runs axe-core's WCAG 2.2 A and AA rules, and fails on any violation. Then does the same for each
// page's `states` (dialogs, toggles), signed in as its own job seeker holding the Applications from
// scripts/dev-applications.mjs, emptied again afterwards.
// Uses this checkout's dev server (A11Y_URL, default http://localhost:3300) and API
// (API_URL, default http://localhost:8000) like smoke does. CHROME_PATH picks Chrome.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { enterState, launchChrome, openPage } from "./chrome.mjs";
import { withTestApplications } from "./dev-applications.mjs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";
import { PAGES } from "./pages.mjs";
import { ensureServers } from "./servers.mjs";

const { base } = await ensureServers(
  process.env.A11Y_URL ?? "http://localhost:3300",
  process.env.API_URL ?? "http://localhost:8000",
);
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
// Not the dev-session test user, so whatever that user has stays as it was.
const STATES_JOB_SEEKER_ID = "a11y-user";
const SCHEMES = ["light", "dark"];

// Every page that renders (not redirects), signed out and signed in.
const pages = PAGES.filter((page) => !page.redirect);

/** axe violations on the page as it stands, one line per failing element. */
async function violations(chrome, where) {
  await chrome.send("Runtime.evaluate", { expression: AXE_SOURCE });
  const { result, exceptionDetails } = await chrome.send("Runtime.evaluate", {
    expression: `axe.run(document, { runOnly: { type: "tag", values: ${JSON.stringify(WCAG_TAGS)} } }).then((r) =>
      r.violations.flatMap((v) => v.nodes.map((n) => \`\${v.id} (\${v.impact}): \${n.target.join(" ")}: \${n.failureSummary.split("\\n").slice(1).join(" ").trim()}\`)))`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(`axe failed on ${where}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  return result.value;
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
  await chrome.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 990, deviceScaleFactor: 1, mobile: false });
  for (const scheme of SCHEMES) {
    await setScheme(chrome, scheme);
    for (const page of pages) {
      await signIn(chrome, page.signedIn ? undefined : null);
      await openPage(chrome, `${base}${page.path}`, page.expect);
      report(`${page.path} (${page.signedIn ? "signed in" : "signed out"}, ${scheme})`, await violations(chrome, page.path));
    }
  }

  const withStates = pages.filter((page) => page.states?.length);
  if (withStates.length) {
    await withTestApplications(STATES_JOB_SEEKER_ID, async () => {
      for (const scheme of SCHEMES) {
        await setScheme(chrome, scheme);
        for (const page of withStates) {
          await signIn(chrome, page.signedIn ? STATES_JOB_SEEKER_ID : null);
          for (const state of page.states) {
            await openPage(chrome, `${base}${page.path}`, page.expect);
            await enterState(chrome, state);
            report(`${page.path} ${state.name} (${scheme})`, await violations(chrome, `${page.path} ${state.name}`));
          }
        }
      }
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
