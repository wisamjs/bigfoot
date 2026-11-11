#!/usr/bin/env node
// Retakes the README screenshots in docs/screenshots/ from the running dev server and API:
//   landing.png    signed out, 1440×990 viewport at 2x
//   dashboard.png  signed in as the dev-session test user, full page at 1440px wide and 2x,
//                  filled with scripts/dev-applications.mjs and emptied again afterwards
// Uses headless Chrome over the DevTools protocol (CHROME_PATH, default: macOS Google Chrome).
// Needs the dev server at SCREENSHOT_URL (default http://localhost:3300) and the API at
// API_URL (default http://localhost:8000).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTestApplications, removeTestApplications } from "./dev-applications.mjs";
import { createTestSession, SESSION_COOKIE } from "./dev-session.mjs";

const base = process.env.SCREENSHOT_URL ?? "http://localhost:3300";
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WIDTH = 1440;
const HEIGHT = 990;
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Starts headless Chrome and returns a DevTools client for its first tab. */
async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "bigfoot-screenshots-"));
  const chrome = spawn(
    chromePath,
    ["--headless=new", `--remote-debugging-port=${PORT}`, "--hide-scrollbars", `--user-data-dir=${profile}`, "about:blank"],
    { stdio: "ignore" },
  );
  const exited = new Promise((resolve) => chrome.once("exit", resolve));
  // Chrome keeps writing to its profile until it exits, so remove the profile after that.
  const close = async () => {
    chrome.kill();
    await exited;
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  };
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      page = targets.find((t) => t.type === "page");
    } catch {}
    if (!page) await sleep(200);
  }
  if (!page) {
    await close();
    throw new Error(`Chrome did not start (CHROME_PATH=${chromePath})`);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const replies = new Map();
  const listeners = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) replies.get(message.id)?.(message);
    else listeners.filter((l) => l.method === message.method).forEach((l) => l.resolve());
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      replies.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  const nextEvent = (method) => new Promise((resolve) => listeners.push({ method, resolve }));
  return {
    send,
    nextEvent,
    close: () => {
      ws.close();
      return close();
    },
  };
}

/** Captures `path` into `out`, failing instead of saving an error page when `expect` is missing. */
async function screenshot(chrome, path, out, { expect, fullPage = false }) {
  const loaded = chrome.nextEvent("Page.loadEventFired");
  await chrome.send("Page.navigate", { url: `${base}${path}` });
  await loaded;
  // Let fonts, images and client components settle.
  await sleep(2500);
  const { result } = await chrome.send("Runtime.evaluate", { expression: "document.body.innerText" });
  if (!result.value?.includes(expect)) {
    throw new Error(`${base}${path} did not show "${expect}"; see .next/dev/logs/next-development.log`);
  }
  // The Next.js dev tools badge only exists in development.
  await chrome.send("Runtime.evaluate", { expression: `document.querySelectorAll("nextjs-portal").forEach((e) => e.remove())` });
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
let added = false;
try {
  await chrome.send("Page.enable");
  await chrome.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: false });
  await chrome.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });

  await screenshot(chrome, "/", "docs/screenshots/landing.png", { expect: "Sign up" });

  await addTestApplications();
  added = true;
  await chrome.send("Network.setCookie", { name: SESSION_COOKIE, value: await createTestSession(), url: base });
  await screenshot(chrome, "/dashboard", "docs/screenshots/dashboard.png", { expect: "All applications", fullPage: true });
} finally {
  // Empty the test user first, so a failure closing Chrome never leaves Applications behind.
  if (added) await removeTestApplications();
  await chrome.close();
}
