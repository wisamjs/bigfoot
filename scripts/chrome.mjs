// Headless Chrome over the DevTools protocol, shared by scripts/screenshots.mjs, scripts/a11y.mjs
// and scripts/capture.mjs. CHROME_PATH picks the binary (default: macOS Google Chrome, else the
// Linux one GitHub's runners have, which the unit tests use).
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chromePath = process.env.CHROME_PATH ?? (existsSync(MAC_CHROME) ? MAC_CHROME : "/usr/bin/google-chrome");

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
 * Runs a page state's steps (scripts/pages.mjs). A `click` step focuses and clicks the first element
 * matching it whose text includes `text`, as a pointer click in Chrome does, so a dialog it opens
 * knows where to return focus. With `pointer: true` it presses instead of clicking, for a Radix menu,
 * which opens on pointerdown. A `fill` step types `value` into the first element matching it, once React has hydrated it. Then
 * waits for the page to show the state's `expect`, failing if it never does.
 */
export async function enterState(chrome, state) {
  const filled = [];
  for (const step of state.steps) {
    // Before a click (say a submit), the values typed so far must still be React's: one typed while
    // the page hydrates can be lost to the controlled input's state (application-added on a cold
    // dev server).
    if (!step.fill) await refillLost(chrome, state, filled);
    await runStep(chrome, state, step);
    if (step.fill) filled.push(step);
    await sleep(400);
  }
  // Waits, not just checks: some states show text only once client components render, which a cold
  // server (CI) is slow to do.
  await expectText(chrome, state.expect, `State "${state.name}"`, PAGE_TEXT_TIMEOUT_MS);
}

/** The expression that runs one step, true when it matched an element. */
function stepExpression(step) {
  if (step.fill) {
    return `(() => {
        const el = document.querySelector(${JSON.stringify(step.fill)});
        // Not until React has hydrated the input: a value typed before then is lost to it.
        if (!el || !Object.keys(el).some((key) => key.startsWith("__reactProps$"))) return false;
        // Through the prototype's setter, so React sees the change on a controlled input.
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, ${JSON.stringify(step.value)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`;
  }
  return `(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(step.click)})]
          .find((e) => e.textContent.includes(${JSON.stringify(step.text ?? "")}));
        el?.focus();
        ${step.pointer ? 'el?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));' : "el?.click();"}
        (window.__clicked ??= []).push(el);
        return Boolean(el);
      })()`;
}

async function runStep(chrome, state, step) {
  const expression = stepExpression(step);
  // A fill step retries while the page hydrates; a click matches or doesn't.
  const attempts = step.fill ? PAGE_TEXT_TIMEOUT_MS / 250 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt) await sleep(250);
    if ((await chrome.send("Runtime.evaluate", { returnByValue: true, expression })).result.value) return;
  }
  throw new Error(`State "${state.name}": nothing matches ${JSON.stringify(step)}`);
}

/** Types each of `filled` again whose input no longer holds its value. */
async function refillLost(chrome, state, filled) {
  for (const step of filled) {
    // React's own props, so a value the input shows but React's state never took counts as lost.
    const expression = `(() => {
      const el = document.querySelector(${JSON.stringify(step.fill)});
      const props = el && el[Object.keys(el).find((key) => key.startsWith("__reactProps$"))];
      return (props && "value" in props ? props.value : el?.value) === ${JSON.stringify(step.value)};
    })()`;
    if ((await chrome.send("Runtime.evaluate", { returnByValue: true, expression })).result.value) continue;
    await runStep(chrome, state, step);
    await sleep(400);
  }
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
      // The topmost one: a popover such as the date picker's calendar can open over a dialog.
      const dialogs = document.querySelectorAll("[role=dialog][data-state=open]");
      const dialog = dialogs[dialogs.length - 1];
      const opener = (window.__clicked ?? []).findLast((c) => c.isConnected);
      const label = (el.getAttribute("aria-label") ?? el.textContent).trim().slice(0, 40);
      return {
        name: el === document.body ? "<body>" : \`<\${el.tagName.toLowerCase()}> "\${label}"\`,
        dialogOpen: Boolean(dialog),
        dialogs: dialogs.length,
        inDialog: Boolean(dialog?.contains(el)),
        onOpener: el === opener,
      };
    })()`,
  });
  return result.value;
}

/**
 * Keyboard use of the topmost open modal dialog, which unit tests can't check (their DOM has no focus
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
  if (after.dialogs >= start.dialogs) problems.push("Escape leaves the dialog open");
  else if (!after.onOpener) problems.push(`after Escape, focus is on ${after.name}, not the control that opened the dialog`);
  return problems;
}

// How long the page must go without changing for settled() to call it ready, and how long to wait for that.
const QUIET_MS = 300;
const SETTLE_TIMEOUT_MS = PAGE_TEXT_TIMEOUT_MS;

/**
 * The expression settled() runs: resolves true once React has hydrated <main> and nothing has been
 * added to or removed from the page for `quietMs`, or false after `timeoutMs`.
 */
function settledExpression(quietMs = QUIET_MS, timeoutMs = SETTLE_TIMEOUT_MS) {
  return `new Promise((resolve) => {
    const hydrated = () => {
      const main = document.querySelector("main");
      return !main || Object.keys(main).some((key) => key.startsWith("__reactProps$"));
    };
    let changed = performance.now();
    const observer = new MutationObserver(() => (changed = performance.now()));
    observer.observe(document.body, { childList: true, subtree: true });
    const start = performance.now();
    const check = () => {
      const now = performance.now();
      const ready = hydrated() && now - changed >= ${quietMs};
      if (ready || now - start >= ${timeoutMs}) {
        observer.disconnect();
        resolve(ready);
      } else setTimeout(check, 50);
    };
    check();
  })`;
}

/**
 * Waits until the page is ready for a key press to be judged: hydrated, and no longer swapping what
 * it shows (a client component replacing its server skeleton, as the Journey does once the browser
 * knows the Viewer's time zone). False if it never settles.
 */
async function settled(chrome) {
  const { result } = await chrome.send("Runtime.evaluate", {
    expression: settledExpression(),
    awaitPromise: true,
    returnByValue: true,
  });
  return result.value === true;
}

/**
 * The skip link on a freshly loaded page: the first Tab lands on it, and its target is the page's
 * one <main>. Pressing Enter on it scrolls there; Tab after that continues inside <main>.
 * Each press waits for the page to settle first, and each judgment after it, so a slow machine (CI)
 * judges the same page a fast one does, not one still swapping its skeleton for its content.
 * Returns one line per problem.
 */
export async function skipLinkProblems(chrome) {
  if (!(await settled(chrome))) return [`the page was still changing after ${SETTLE_TIMEOUT_MS / 1000}s, so the skip link wasn't checked`];
  await press(chrome, "Tab", 9);
  await settled(chrome);
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
  await settled(chrome);
  await press(chrome, "Tab", 9);
  await settled(chrome);
  const { result: after } = await chrome.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const main = document.querySelector("main");
      const el = document.activeElement;
      if (main.contains(el) || !main.querySelector("a, button, input, select, textarea, summary, [tabindex]")) return null;
      const label = (el.getAttribute("aria-label") ?? el.textContent).trim().slice(0, 40);
      return el === document.body ? "<body>" : \`<\${el.tagName.toLowerCase()}> "\${label}"\`;
    })()`,
  });
  return after.value ? [`after the skip link, Tab doesn't continue inside <main>; it lands on ${after.value}`] : [];
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
