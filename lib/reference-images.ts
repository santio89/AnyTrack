import path from "node:path";
import {
  deleteObject,
  downloadObject,
  uploadObject,
} from "@/lib/object-storage";

export {
  parseReferenceImagePaths,
  serializeReferenceImagePaths,
} from "@/lib/reference-image-paths";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function toObjectPath(relativePath: string) {
  return `reference-images/${relativePath}`;
}

export function parseReferenceImageInput(input: {
  data: string;
  mimeType?: string;
}): { buffer: Buffer; mimeType: string } {
  const trimmed = input.data.trim();
  let mimeType = input.mimeType ?? "image/png";
  let base64 = trimmed;

  const dataUrlMatch = trimmed.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    base64 = dataUrlMatch[2];
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Reference image must be JPEG, PNG, WebP, or GIF");
  }

  const buffer = Buffer.from(base64, "base64");
  const maxBytes = 5 * 1024 * 1024;

  if (!buffer.length) {
    throw new Error("Reference image is empty");
  }

  if (buffer.length > maxBytes) {
    throw new Error("Reference image must be 5 MB or smaller");
  }

  return { buffer, mimeType };
}

export async function saveReferenceImage(
  trackerId: number,
  buffer: Buffer,
  mimeType = "image/jpeg",
  slot = 0,
): Promise<string> {
  const extension = EXTENSION_BY_MIME[mimeType] ?? "jpg";
  const filename = `${trackerId}-${slot}.${extension}`;
  await uploadObject(toObjectPath(filename), buffer, mimeType);

  return filename;
}

function mimeTypeFromPath(relativePath: string) {
  const extension = path.extname(relativePath).slice(1).toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "image/jpeg";
}

export async function loadReferenceImage(
  relativePath: string | null | undefined,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!relativePath) {
    return null;
  }

  const buffer = await downloadObject(toObjectPath(relativePath));

  return {
    buffer,
    mimeType: mimeTypeFromPath(relativePath),
  };
}

export async function loadReferenceImages(
  relativePaths: string[] | null | undefined,
): Promise<Array<{ buffer: Buffer; mimeType: string }>> {
  if (!relativePaths?.length) {
    return [];
  }

  const images = await Promise.all(
    relativePaths.map((relativePath) => loadReferenceImage(relativePath)),
  );
  return images.filter((image): image is { buffer: Buffer; mimeType: string } => image !== null);
}

export async function deleteReferenceImage(relativePath: string | null | undefined) {
  if (!relativePath) {
    return;
  }

  await deleteObject(toObjectPath(relativePath));
}

export async function deleteReferenceImages(relativePaths: string[] | null | undefined) {
  if (!relativePaths?.length) {
    return;
  }

  await Promise.all(relativePaths.map((relativePath) => deleteReferenceImage(relativePath)));
}
