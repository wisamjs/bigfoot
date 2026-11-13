// Makes sure this checkout's dev server and API are serving, for scripts/smoke.mjs,
// scripts/a11y.mjs and scripts/screenshots.mjs. Servers already running from this checkout are
// reused. A server on the usual port from another checkout (say the main checkout while you work
// in a worktree) is left alone, and this checkout's own start on free ports instead, so a check
// never passes against someone else's code. Servers this run starts stop when it exits.
// The API it starts reads the test schema (TEST_SCHEMA, default `bigfoot_test`), which
// `npm run test:api` creates.
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

export async function reachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

const started = [];

/**
 * Stops a server and everything it spawned. `npx` and `uv run` launch the real server
 * (next-server, uvicorn) as a child that can outlive them, so kill the whole process group.
 */
function stop(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
}

// Runs on every exit, including when a server fails to start, so no server outlives the script.
process.on("exit", () => started.forEach(stop));

async function start(url, command, args, options = {}) {
  // detached: the server leads its own process group, which stop() kills as one.
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], detached: true, ...options });
  started.push(child);
  let output = "";
  let exited = false;
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  child.on("exit", () => (exited = true));
  for (let i = 0; i < 120; i++) {
    if (await reachable(url)) return child;
    // e.g. `next dev` quits at once when another dev server for this checkout runs on another port.
    if (exited) throw new Error(`${command} ${args.join(" ")} exited before serving ${url}\n${output}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${command} ${args.join(" ")} did not start on ${url}\n${output}`);
}

/** The dev server, talking to the API at `apiBase` whatever .env.local says. */
function startServer(base, apiBase) {
  return start(base, "npx", ["next", "dev", "-p", new URL(base).port || "3300"], {
    env: { ...process.env, API_URL: apiBase },
  });
}

function startApi(apiBase) {
  const port = new URL(apiBase).port || "8000";
  return start(`${apiBase}/health`, "uv", ["run", "uvicorn", "--factory", "app.main:create_app", "--port", port], {
    cwd: resolve(ROOT, "api"),
    env: { ...process.env, DB_SCHEMA: process.env.TEST_SCHEMA ?? "bigfoot_test" },
  });
}

/** The working directory of the process listening on `url`'s port, or null when unknown. */
function listenerDirectory(url) {
  try {
    const port = new URL(url).port;
    const pid = execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).split("\n")[0];
    const out = execFileSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], { encoding: "utf8" });
    return out.match(/^n(.+)$/m)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** `url` with its port swapped for one nothing listens on. */
async function withFreePort(url) {
  const port = await new Promise((done, fail) => {
    const server = createServer();
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => done(port));
    });
  });
  const free = new URL(url);
  free.port = String(port);
  return free.origin;
}

/** Reuse when this checkout serves `url`; start on a free port when another process holds it. */
async function plan(url, health, directory) {
  if (!(await reachable(health))) return { url, reuse: false };
  if (listenerDirectory(url) === directory) return { url, reuse: true };
  return { url: await withFreePort(url), reuse: false };
}

/**
 * Makes sure this checkout's Next.js dev server and API are serving, and returns where:
 * `base` and `apiBase` when they are free or already this checkout's, otherwise free ports.
 * A running dev server of this checkout points at `apiBase`, so it can't be reused when another
 * checkout's API holds that port. Also sets API_URL, which scripts/dev-applications.mjs reads.
 */
export async function ensureServers(base, apiBase) {
  const api = await plan(apiBase, `${apiBase}/health`, resolve(ROOT, "api"));
  const app = await plan(base, base, ROOT);
  if (app.reuse && api.url !== apiBase) {
    // Next runs one dev server per checkout, so a second can't start here pointed at our API.
    throw new Error(
      `This checkout's dev server at ${base} may be talking to another checkout's API, since ${apiBase} ` +
        "isn't this checkout's. Stop the dev server and rerun; this script then starts one pointed at its own API.",
    );
  }
  if (!api.reuse) await startApi(api.url);
  if (!app.reuse) await startServer(app.url, api.url);
  if (app.url !== base || api.url !== apiBase) {
    console.log(`Using this checkout's servers: ${app.url} (app), ${api.url} (API)\n`);
  }
  process.env.API_URL = api.url;
  return { base: app.url, apiBase: api.url };
}
