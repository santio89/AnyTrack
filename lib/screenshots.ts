import {
  deleteObject,
  deleteObjectsByPrefix,
  downloadObject,
  uploadObject,
} from "@/lib/object-storage";

function toObjectPath(relativePath: string) {
  return `screenshots/${relativePath}`;
}

export async function saveScreenshot(
  buffer: Buffer,
  trackerId: number,
): Promise<string> {
  const relativePath = `${trackerId}/${Date.now()}.jpg`;
  await uploadObject(toObjectPath(relativePath), buffer, "image/jpeg");
  return relativePath;
}

export async function readScreenshot(relativePath: string): Promise<Buffer> {
  return downloadObject(toObjectPath(relativePath));
}

export async function deleteScreenshotFile(relativePath: string | null | undefined) {
  if (!relativePath) {
    return;
  }

  await deleteObject(toObjectPath(relativePath));
}

export async function deleteTrackerScreenshots(trackerId: number) {
  await deleteObjectsByPrefix(`screenshots/${trackerId}`);
}
