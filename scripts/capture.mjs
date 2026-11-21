#!/usr/bin/env node
// Captures a page from scripts/pages.mjs at any width, in light and dark, to see a UI change the
// way job seekers do: narrow columns, wrapping labels, dark-mode contrast. Signed in, it uses its
// own job seeker holding the Applications from scripts/dev-applications.mjs, emptied afterwards
// (none, for a state with `applications: "none"`).
//   npm run capture -- /dashboard --width 1000 --selector 'section[aria-labelledby="pipeline-title"]'
//   npm run capture -- /dashboard --state application-panel --selector '[role=dialog][data-state=open]' --theme dark
// Options:
//   --width <px>      viewport width (default 1440)
//   --theme <name>    light, dark or both (default both)
//   --selector <css>  capture only the first matching element (default: the full page)
//   --state <name>    enter one of the page's `states` from scripts/pages.mjs first
//   --signed-out      capture the signed-out page
//   --out <dir>       where to write (default .next/captures)
// Prints each image's path. Uses this checkout's servers like smoke does (CAPTURE_URL, API_URL).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { enterState, launchChrome, openPage } from "./chrome.mjs";
import { withNoApplications, withTestApplications } from "./dev-applications.mjs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";
import { PAGES } from "./pages.mjs";
import { ensureServers } from "./servers.mjs";

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    width: { type: "string", default: "1440" },
    theme: { type: "string", default: "both" },
    selector: { type: "string" },
    state: { type: "string" },
    "signed-out": { type: "boolean", default: false },
    out: { type: "string", default: ".next/captures" },
  },
});
const path = positionals[0] ?? "/dashboard";
const signedIn = !options["signed-out"];
const width = Number(options.width);
const themes = options.theme === "both" ? ["light", "dark"] : [options.theme];

const page = PAGES.find((p) => p.path === path && p.signedIn === signedIn && !p.redirect);
if (!page) {
  console.error(`No page ${path} (${signedIn ? "signed in" : "signed out"}) in scripts/pages.mjs`);
  process.exit(1);
}
const state = options.state && page.states?.find((s) => s.name === options.state);
if (options.state && !state) {
  const names = (page.states ?? []).map((s) => s.name).join(", ") || "none";
  console.error(`No state "${options.state}" on ${path}; its states: ${names}`);
  process.exit(1);
}
if (!Number.isInteger(width) || width < 320 || !themes.every((t) => t === "light" || t === "dark")) {
  console.error("--width must be a whole number from 320, and --theme light, dark or both");
  process.exit(1);
}

const { base } = await ensureServers(
  process.env.CAPTURE_URL ?? "http://localhost:3300",
  process.env.API_URL ?? "http://localhost:8000",
);
// Not the dev-session test user, so whatever that user has stays as it was.
const CAPTURE_JOB_SEEKER_ID = "capture-user";
const CAPTURE_EMPTY_JOB_SEEKER_ID = "capture-empty-user";
const slug = [path.replaceAll("/", "-").replace(/^-/, "") || "home", state?.name, width].filter(Boolean).join("-");
mkdirSync(options.out, { recursive: true });

/** The clip for `selector` (its whole box, even below the fold), or the full page. */
async function clip(chrome) {
  const { result } = await chrome.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const el = ${options.selector ? `document.querySelector(${JSON.stringify(options.selector)})` : "document.documentElement"};
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: ${options.selector ? "r.height" : "el.scrollHeight"} };
    })()`,
  });
  if (!result.value) throw new Error(`Nothing matches --selector ${options.selector}`);
  return { ...result.value, scale: 1 };
}

async function captureAll(chrome) {
  for (const theme of themes) {
    await chrome.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
    await openPage(chrome, `${base}${path}`, page.expect);
    if (state) await enterState(chrome, state);
    const { data } = await chrome.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: await clip(chrome),
    });
    const out = resolve(join(options.out, `${slug}-${theme}.png`));
    writeFileSync(out, Buffer.from(data, "base64"));
    console.log(out);
  }
}

const chrome = await launchChrome();
try {
  await chrome.send("Page.enable");
  await chrome.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 2, mobile: false });
  if (signedIn) {
    const [jobSeekerId, holding] =
      state?.applications === "none"
        ? [CAPTURE_EMPTY_JOB_SEEKER_ID, withNoApplications]
        : [CAPTURE_JOB_SEEKER_ID, withTestApplications];
    await holding(jobSeekerId, async () => {
      await chrome.send("Network.setCookie", {
        name: SESSION_COOKIE,
        value: await createTestSession(jobSeekerId),
        url: base,
      });
      await captureAll(chrome);
    });
  } else {
    await captureAll(chrome);
  }
} finally {
  await chrome.close();
}

// Exit explicitly: started servers' output pipes would otherwise keep Node running.
process.exit(0);
