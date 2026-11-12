#!/usr/bin/env node
// Accessibility check: loads each page in scripts/pages.mjs in headless Chrome, in light and dark colour schemes,
// runs axe-core's WCAG 2.2 A and AA rules, and fails on any violation.
// Reuses or starts the dev server (A11Y_URL, default http://localhost:3300) and the API
// (API_URL, default http://localhost:8000) like smoke does. CHROME_PATH picks Chrome.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { launchChrome, sleep } from "./chrome.mjs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";
import { PAGES } from "./pages.mjs";
import { ensureServers } from "./servers.mjs";

const base = process.env.A11Y_URL ?? "http://localhost:3300";
const apiBase = process.env.API_URL ?? "http://localhost:8000";
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

// Every page that renders (not redirects), signed out and signed in.
const pages = PAGES.filter((page) => !page.redirect);

/** axe violations on `path`, one line per failing element. */
async function violations(chrome, path, expect) {
  const loaded = chrome.nextEvent("Page.loadEventFired");
  await chrome.send("Page.navigate", { url: `${base}${path}` });
  await loaded;
  // Let fonts and client components settle.
  await sleep(1500);
  const { result: text } = await chrome.send("Runtime.evaluate", { expression: "document.body.innerText" });
  if (!text.value?.includes(expect)) throw new Error(`${path} did not show "${expect}"`);
  // The Next.js dev tools badge only exists in development.
  await chrome.send("Runtime.evaluate", { expression: `document.querySelectorAll("nextjs-portal").forEach((e) => e.remove())` });
  await chrome.send("Runtime.evaluate", { expression: AXE_SOURCE });
  const { result, exceptionDetails } = await chrome.send("Runtime.evaluate", {
    expression: `axe.run(document, { runOnly: { type: "tag", values: ${JSON.stringify(WCAG_TAGS)} } }).then((r) =>
      r.violations.flatMap((v) => v.nodes.map((n) => \`\${v.id} (\${v.impact}): \${n.target.join(" ")}: \${n.failureSummary.split("\\n").slice(1).join(" ").trim()}\`)))`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(`axe failed on ${path}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  return result.value;
}

await ensureServers(base, apiBase);
const chrome = await launchChrome();
let failed = 0;
try {
  await chrome.send("Page.enable");
  await chrome.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 990, deviceScaleFactor: 1, mobile: false });
  for (const scheme of ["light", "dark"]) {
    await chrome.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
    for (const page of pages) {
      await chrome.send("Network.clearBrowserCookies");
      if (page.signedIn) {
        await chrome.send("Network.setCookie", { name: SESSION_COOKIE, value: await createTestSession(), url: base });
      }
      const label = `${page.path} (${page.signedIn ? "signed in" : "signed out"}, ${scheme})`;
      const found = await violations(chrome, page.path, page.expect);
      if (found.length === 0) {
        console.log(`✓ ${label}`);
      } else {
        failed += found.length;
        console.error(`✗ ${label}`);
        for (const line of found) console.error(`    ${line}`);
      }
    }
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
