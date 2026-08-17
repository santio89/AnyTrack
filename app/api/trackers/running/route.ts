import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { getRunningTrackersForUser } from "@/lib/worker";

export async function GET() {
  try {
    await initDb();
    const userId = await requireUserId();

    return NextResponse.json({
      running: getRunningTrackersForUser(userId),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load running trackers";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
