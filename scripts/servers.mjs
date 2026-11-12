// Reuses the dev server and API if they are running, otherwise starts them and stops them when
// the process exits. Shared by scripts/smoke.mjs and scripts/a11y.mjs.
// The API it starts reads the `bigfoot_test` schema (created by `npm run test:api`).
import { spawn } from "node:child_process";

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
    // e.g. `next dev` quits at once when another dev server for this project runs on another port.
    if (exited) throw new Error(`${command} ${args.join(" ")} exited before serving ${url}\n${output}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${command} ${args.join(" ")} did not start on ${url}\n${output}`);
}

function startServer(base) {
  return start(base, "npx", ["next", "dev", "-p", new URL(base).port || "3300"]);
}

function startApi(apiBase) {
  const port = new URL(apiBase).port || "8000";
  return start(`${apiBase}/health`, "uv", ["run", "uvicorn", "--factory", "app.main:create_app", "--port", port], {
    cwd: "api",
    env: { ...process.env, DB_SCHEMA: process.env.DB_SCHEMA ?? "bigfoot_test" },
  });
}

/** Makes sure the Next.js dev server at `base` and the API at `apiBase` are serving. */
export async function ensureServers(base, apiBase) {
  if (!(await reachable(`${apiBase}/health`))) await startApi(apiBase);
  if (!(await reachable(base))) await startServer(base);
}
