// Headless Chrome over the DevTools protocol, shared by scripts/screenshots.mjs and
// scripts/a11y.mjs. CHROME_PATH picks the binary (default: macOS Google Chrome; CI sets it).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Starts headless Chrome and returns a DevTools client for its first tab. */
export async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "bigfoot-chrome-"));
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
