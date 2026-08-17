import fs from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { trackers } from "@/db/schema";
import { db, initDb } from "@/lib/db";
import {
  getCurrentUserId,
  unauthorizedResponse,
} from "@/lib/auth/session";
import {
  parseReferenceImagePaths,
  resolveReferenceImagePath,
} from "@/lib/reference-images";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    initDb();
    const userId = await getCurrentUserId();

    if (userId == null) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const trackerId = Number(id);

    if (Number.isNaN(trackerId)) {
      return NextResponse.json({ error: "Invalid tracker ID" }, { status: 400 });
    }

    const [tracker] = await db
      .select({
        referenceImagePath: trackers.referenceImagePath,
        referenceImagePaths: trackers.referenceImagePaths,
      })
      .from(trackers)
      .where(and(eq(trackers.id, trackerId), eq(trackers.userId, userId)))
      .limit(1);

    const referenceImagePath =
      parseReferenceImagePaths(
        tracker?.referenceImagePaths,
        tracker?.referenceImagePath,
      )[0] ?? tracker?.referenceImagePath;

    if (!referenceImagePath) {
      return NextResponse.json({ error: "Reference image not found" }, { status: 404 });
    }

    const filePath = resolveReferenceImagePath(referenceImagePath);
    const file = await fs.readFile(filePath);
    const extension = referenceImagePath.split(".").pop()?.toLowerCase();

    const contentType =
      extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : extension === "gif"
            ? "image/gif"
            : "image/jpeg";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load reference image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
