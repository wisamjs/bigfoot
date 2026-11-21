// Headless Chrome over the DevTools protocol, shared by scripts/screenshots.mjs, scripts/a11y.mjs
// and scripts/capture.mjs. CHROME_PATH picks the binary (default: macOS Google Chrome; CI sets it).
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * The DevTools port Chrome picked, from the file it writes into its profile; undefined until then.
 * Chrome picks a free port (--remote-debugging-port=0) so checks running at once in several git
 * checkouts never connect to each other's browser.
 */
function devToolsPort(profile) {
  try {
    return readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0] || undefined;
  } catch {
    return undefined;
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Long enough for `next dev` to compile a page on first request, which a cold server (CI) does.
const PAGE_TEXT_TIMEOUT_MS = 15_000;

/**
 * Loads `url`, waits until the page shows `expect` (so an error page is never checked or
 * captured) and its fonts have loaded. Removes the Next.js dev tools badge.
 */
export async function openPage(chrome, url, expect) {
  const loaded = chrome.nextEvent("Page.loadEventFired");
  await chrome.send("Page.navigate", { url });
  await loaded;
  await expectText(chrome, expect, url, PAGE_TEXT_TIMEOUT_MS);
  await chrome.send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
  await chrome.send("Runtime.evaluate", { expression: `document.querySelectorAll("nextjs-portal").forEach((e) => e.remove())` });
}

/** How a failed wait quotes the page: enough of its text to tell what it was showing. */
export function seenText(text) {
  const seen = (text ?? "").replace(/\s+/g, " ").trim();
  if (!seen) return "nothing";
  return seen.length > 300 ? `"${seen.slice(0, 300)}…"` : `"${seen}"`;
}

/** Polls the page's text until it includes `expect`; after `timeoutMs`, fails with the last text seen. */
async function expectText(chrome, expect, where, timeoutMs = 0) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { result } = await chrome.send("Runtime.evaluate", { expression: "document.body?.innerText" });
    if (result.value?.includes(expect)) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `${where} did not show "${expect}"${timeoutMs ? ` within ${timeoutMs / 1000}s` : ""}; ` +
          `it showed ${seenText(result.value)}. See .next/dev/logs/next-development.log`,
      );
    }
    await sleep(250);
  }
}

/**
 * Runs a page state's steps (scripts/pages.mjs): each focuses and clicks the first element matching
 * `click` whose text includes `text`, as a pointer click in Chrome does, so a dialog it opens knows
 * where to return focus. Then fails unless the page shows the state's `expect`.
 */
export async function enterState(chrome, state) {
  for (const step of state.steps) {
    const { result } = await chrome.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(step.click)})]
          .find((e) => e.textContent.includes(${JSON.stringify(step.text ?? "")}));
        el?.focus();
        el?.click();
        (window.__clicked ??= []).push(el);
        return Boolean(el);
      })()`,
    });
    if (!result.value) throw new Error(`State "${state.name}": nothing matches ${JSON.stringify(step)}`);
    await sleep(400);
  }
  await expectText(chrome, state.expect, `State "${state.name}"`);
}

async function press(chrome, key, keyCode) {
  for (const type of ["keyDown", "keyUp"]) {
    await chrome.send("Input.dispatchKeyEvent", { type, key, code: key, windowsVirtualKeyCode: keyCode });
  }
}

/**
 * Where focus is, relative to the open dialog and its opener: the control enterState last clicked
 * that's still on the page. A dialog opened from inside another (Delete application) outlives its
 * opener, so focus belongs back on the control that opened the first one.
 */
async function focus(chrome) {
  const { result } = await chrome.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const el = document.activeElement;
      const dialog = document.querySelector("[role=dialog][data-state=open]");
      const opener = (window.__clicked ?? []).findLast((c) => c.isConnected);
      const label = (el.getAttribute("aria-label") ?? el.textContent).trim().slice(0, 40);
      return {
        name: el === document.body ? "<body>" : \`<\${el.tagName.toLowerCase()}> "\${label}"\`,
        dialogOpen: Boolean(dialog),
        inDialog: Boolean(dialog?.contains(el)),
        onOpener: el === opener,
      };
    })()`,
  });
  return result.value;
}

/**
 * Keyboard use of an open modal dialog, which unit tests can't check (their DOM has no focus
 * model): focus starts inside it, Tab never reaches the page behind it, Escape closes it, and focus
 * returns to the control that opened it. Returns one line per problem; none when no dialog is open.
 */
export async function dialogKeyboardProblems(chrome) {
  const start = await focus(chrome);
  if (!start.dialogOpen) return [];
  const problems = [];
  if (!start.inDialog) problems.push(`focus starts outside the dialog, on ${start.name}`);
  // Enough presses to cycle through the largest dialog more than once.
  for (let i = 1; i <= 40; i++) {
    await press(chrome, "Tab", 9);
    const now = await focus(chrome);
    // Tab may leave for the browser's own UI (focus shows as <body>), but never for the page.
    if (!now.inDialog && now.name !== "<body>") {
      problems.push(`Tab ${i} leaves the dialog for ${now.name}`);
      break;
    }
  }
  await press(chrome, "Escape", 27);
  await sleep(400);
  const after = await focus(chrome);
  if (after.dialogOpen) problems.push("Escape leaves the dialog open");
  else if (!after.onOpener) problems.push(`after Escape, focus is on ${after.name}, not the control that opened the dialog`);
  return problems;
}

/**
 * The skip link on a freshly loaded page: the first Tab lands on it, and its target is the page's
 * one <main>. Pressing Enter on it scrolls there; Tab after that continues inside <main>.
 * Returns one line per problem.
 */
export async function skipLinkProblems(chrome) {
  await press(chrome, "Tab", 9);
  const { result } = await chrome.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const el = document.activeElement;
      const mains = document.querySelectorAll("main");
      const problems = [];
      if (el.getAttribute("href") !== "#main") problems.push(\`the first Tab lands on <\${el.tagName.toLowerCase()}> "\${el.textContent.trim().slice(0, 40)}", not the skip link\`);
      if (mains.length !== 1 || mains[0].id !== "main") problems.push(\`the skip link needs exactly one <main id="main">; found \${mains.length} <main>\`);
      return problems;
    })()`,
  });
  if (result.value.length) return result.value;
  await press(chrome, "Enter", 13);
  await press(chrome, "Tab", 9);
  const { result: after } = await chrome.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `document.querySelector("main").contains(document.activeElement) || !document.querySelector("main").querySelector("a, button, input, select, textarea, summary, [tabindex]")`,
  });
  return after.value ? [] : ["after the skip link, Tab doesn't continue inside <main>"];
}

/** Starts headless Chrome and returns a DevTools client for its first tab. */
export async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "bigfoot-chrome-"));
  const chrome = spawn(
    chromePath,
    ["--headless=new", "--remote-debugging-port=0", "--hide-scrollbars", `--user-data-dir=${profile}`, "about:blank"],
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
      const port = devToolsPort(profile);
      const targets = port ? await (await fetch(`http://127.0.0.1:${port}/json`)).json() : [];
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
