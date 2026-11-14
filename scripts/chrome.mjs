// Headless Chrome over the DevTools protocol, shared by scripts/screenshots.mjs, scripts/a11y.mjs
// and scripts/capture.mjs. CHROME_PATH picks the binary (default: macOS Google Chrome; CI sets it).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Loads `url`, waits for fonts and client components to settle, and fails unless the page shows
 * `expect` (so an error page is never checked or captured). Removes the Next.js dev tools badge.
 */
export async function openPage(chrome, url, expect) {
  const loaded = chrome.nextEvent("Page.loadEventFired");
  await chrome.send("Page.navigate", { url });
  await loaded;
  await sleep(2000);
  await expectText(chrome, expect, url);
  await chrome.send("Runtime.evaluate", { expression: `document.querySelectorAll("nextjs-portal").forEach((e) => e.remove())` });
}

async function expectText(chrome, expect, where) {
  const { result } = await chrome.send("Runtime.evaluate", { expression: "document.body.innerText" });
  if (!result.value?.includes(expect)) {
    throw new Error(`${where} did not show "${expect}"; see .next/dev/logs/next-development.log`);
  }
}

/**
 * Runs a page state's steps (scripts/pages.mjs): each clicks the first element matching `click`
 * whose text includes `text`. Then fails unless the page shows the state's `expect`.
 */
export async function enterState(chrome, state) {
  for (const step of state.steps) {
    const { result } = await chrome.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(step.click)})]
          .find((e) => e.textContent.includes(${JSON.stringify(step.text ?? "")}));
        el?.click();
        return Boolean(el);
      })()`,
    });
    if (!result.value) throw new Error(`State "${state.name}": nothing matches ${JSON.stringify(step)}`);
    await sleep(400);
  }
  await expectText(chrome, state.expect, `State "${state.name}"`);
}

/** Starts headless Chrome and returns a DevTools client for its first tab. */
export async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "bigfoot-chrome-"));
  const chrome = spawn(
    chromePath,
    ["--headless=new", `--remote-debugging-port=${PORT}`, "--hide-scrollbars", `--user-data-dir=${profile}`, "about:blank"],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  // Kept so a failed start can say why; Chrome logs harmless noise here on success.
  let stderr = "";
  chrome.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
  let exitCode = null;
  const exited = new Promise((resolve) => chrome.once("exit", (code) => resolve((exitCode = code))));
  // Chrome keeps writing to its profile until it exits, so remove the profile after that.
  const close = async () => {
    chrome.kill();
    await exited;
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  };
  let page;
  // Up to 30s: a cold CI runner can be slow to start Chrome.
  for (let i = 0; i < 150 && !page && exitCode === null; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      page = targets.find((t) => t.type === "page");
    } catch {}
    if (!page) await sleep(200);
  }
  if (!page) {
    await close();
    throw new Error(`Chrome did not start (CHROME_PATH=${chromePath}, exit code ${exitCode})\n${stderr}`);
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
