import { spawn } from "node:child_process";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "localhost";
const baseUrl = `http://127.0.0.1:${port}`;

const nextArgs = ["dev", "-p", String(port)];
if (process.env.HOST) {
  nextArgs.push("-H", host);
}

const routesToWarm = [
  "/",
  "/dashboard",
  "/api/config",
  "/api/trackers",
  "/api/logs?limit=50",
  "/api/settings/ai",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(maxAttempts = 120) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
      if (response.ok || response.status === 307 || response.status === 308) {
        return true;
      }
    } catch {
      // Server not ready yet.
    }

    await sleep(500);
  }

  return false;
}

async function warmRoutes() {
  console.log("[anytrack] Warming routes and API handlers…");

  for (const route of routesToWarm) {
    try {
      const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
      console.log(`[anytrack] Warmed ${route} (${response.status})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[anytrack] Warm failed for ${route}: ${message}`);
    }
  }

  console.log("[anytrack] Dev warm-up complete.");
}

const child = spawn("next", nextArgs, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

let warming = false;

void (async () => {
  const ready = await waitForServer();
  if (!ready || warming) return;

  warming = true;
  await warmRoutes();
})();

function shutdown(signal) {
  child.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
