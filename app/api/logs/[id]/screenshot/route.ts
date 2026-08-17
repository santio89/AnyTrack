import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { logs, trackers } from "@/db/schema";
import { db, initDb } from "@/lib/db";
import {
  getCurrentUserId,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { readScreenshot } from "@/lib/screenshots";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await initDb();
    const userId = await getCurrentUserId();

    if (userId == null) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const logId = Number(id);

    if (Number.isNaN(logId)) {
      return NextResponse.json({ error: "Invalid log id" }, { status: 400 });
    }

    const [log] = await db
      .select({ screenshotPath: logs.screenshotPath })
      .from(logs)
      .innerJoin(trackers, eq(logs.trackerId, trackers.id))
      .where(and(eq(logs.id, logId), eq(trackers.userId, userId)))
      .limit(1);

    if (!log?.screenshotPath) {
      return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
    }

    const file = await readScreenshot(log.screenshotPath);

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load screenshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
