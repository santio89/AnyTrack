import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import {
  getCurrentUserId,
  requireUserId,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { clearLogs, getRecentLogs } from "@/lib/worker";

export async function GET(request: Request) {
  try {
    await initDb();
    const userId = await getCurrentUserId();

    if (userId == null) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const trackerIdParam = searchParams.get("trackerId");
    const trackerId =
      trackerIdParam && !Number.isNaN(Number(trackerIdParam))
        ? Number(trackerIdParam)
        : undefined;

    const recentLogs = await getRecentLogs(
      userId,
      Number.isNaN(limit) ? 50 : Math.min(limit, 200),
      trackerId,
    );

    return NextResponse.json(recentLogs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDb();
    const userId = await requireUserId();
    const trackerIdParam = new URL(request.url).searchParams.get("trackerId");
    const trackerId =
      trackerIdParam && !Number.isNaN(Number(trackerIdParam))
        ? Number(trackerIdParam)
        : undefined;

    const deletedCount = await clearLogs(userId, trackerId);

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear logs";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
