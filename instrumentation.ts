export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("./lib/db");
    const { startWorker } = await import("./lib/worker");

    await initDb();
    startWorker();
  }
}
