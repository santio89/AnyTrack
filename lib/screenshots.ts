import fs from "node:fs/promises";
import path from "node:path";

export function resolveScreenshotsDir(): string {
  if (process.env.SCREENSHOTS_PATH) {
    return process.env.SCREENSHOTS_PATH;
  }

  return process.env.NODE_ENV === "production"
    ? "/var/data/screenshots"
    : path.join(process.cwd(), "data", "screenshots");
}

export async function saveScreenshot(
  buffer: Buffer,
  trackerId: number,
): Promise<string> {
  const dir = path.join(
    /*turbopackIgnore: true*/ resolveScreenshotsDir(),
    String(trackerId),
  );
  await fs.mkdir(dir, { recursive: true });

  const filename = `${Date.now()}.jpg`;
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buffer);

  return `${trackerId}/${filename}`;
}

export function resolveScreenshotPath(relativePath: string): string {
  const screenshotsDir = path.resolve(/*turbopackIgnore: true*/ resolveScreenshotsDir());
  const fullPath = path.resolve(screenshotsDir, relativePath);

  if (!fullPath.startsWith(screenshotsDir + path.sep) && fullPath !== screenshotsDir) {
    throw new Error("Invalid screenshot path");
  }

  return fullPath;
}

export async function deleteScreenshotFile(relativePath: string | null | undefined) {
  if (!relativePath) {
    return;
  }

  try {
    await fs.unlink(resolveScreenshotPath(relativePath));
  } catch {
    // File may already be gone.
  }
}

export async function deleteTrackerScreenshots(trackerId: number) {
  const dir = path.join(
    /*turbopackIgnore: true*/ resolveScreenshotsDir(),
    String(trackerId),
  );

  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Directory may already be gone.
  }
}
