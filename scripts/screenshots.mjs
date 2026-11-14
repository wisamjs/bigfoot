#!/usr/bin/env node
// Retakes the README screenshots in docs/screenshots/ from the running dev server and API:
//   landing.png    signed out, 1440×990 viewport at 2x
//   dashboard.png  signed in as its own screenshot user, full page at 1440px wide and 2x,
//                  filled with scripts/dev-applications.mjs and emptied again afterwards.
//                  The dev-session test user's Applications are never touched.
// Uses headless Chrome from scripts/chrome.mjs (CHROME_PATH, default: macOS Google Chrome).
// Uses this checkout's dev server (SCREENSHOT_URL, default http://localhost:3300) and API
// (API_URL, default http://localhost:8000) like smoke does.
import { writeFileSync } from "node:fs";
import { launchChrome, openPage } from "./chrome.mjs";
import { withTestApplications } from "./dev-applications.mjs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";
import { PAGES } from "./pages.mjs";
import { ensureServers } from "./servers.mjs";

const { base } = await ensureServers(
  process.env.SCREENSHOT_URL ?? "http://localhost:3300",
  process.env.API_URL ?? "http://localhost:8000",
);
const WIDTH = 1440;
const HEIGHT = 990;
// Not the dev-session test user, so whatever that user has stays as it was.
const SCREENSHOT_JOB_SEEKER_ID = "screenshot-user";

/** The text scripts/pages.mjs expects on `path`, so a screenshot is never of an error page. */
function expected(path, signedIn) {
  return PAGES.find((p) => p.path === path && p.signedIn === signedIn).expect;
}

async function screenshot(chrome, path, out, { signedIn, fullPage = false }) {
  await openPage(chrome, `${base}${path}`, expected(path, signedIn));
  let clip;
  if (fullPage) {
    const { cssContentSize } = await chrome.send("Page.getLayoutMetrics");
    clip = { x: 0, y: 0, width: WIDTH, height: Math.ceil(cssContentSize.height), scale: 1 };
  }
  const { data } = await chrome.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage, clip });
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(`Wrote ${out}`);
}

const chrome = await launchChrome();
try {
  await chrome.send("Page.enable");
  await chrome.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: false });
  await chrome.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });

  await screenshot(chrome, "/", "docs/screenshots/landing.png", { signedIn: false });

  await withTestApplications(SCREENSHOT_JOB_SEEKER_ID, async () => {
    await chrome.send("Network.setCookie", {
      name: SESSION_COOKIE,
      value: await createTestSession(SCREENSHOT_JOB_SEEKER_ID),
      url: base,
    });
    await screenshot(chrome, "/dashboard", "docs/screenshots/dashboard.png", { signedIn: true, fullPage: true });
  });
} finally {
  await chrome.close();
}

// Exit explicitly: started servers' output pipes would otherwise keep Node running. The exit
// handler in scripts/servers.mjs stops them.
process.exit(0);
