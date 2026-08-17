import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { trackers } from "@/db/schema";
import { db, initDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";

export async function PUT(request: Request) {
  try {
    initDb();
    const userId = await requireUserId();
    const body = (await request.json()) as { orderedIds?: number[] };

    if (!body.orderedIds?.length) {
      return NextResponse.json(
        { error: "orderedIds is required" },
        { status: 400 },
      );
    }

    const now = new Date();

    for (const [index, id] of body.orderedIds.entries()) {
      await db
        .update(trackers)
        .set({ sortOrder: index, updatedAt: now })
        .where(and(eq(trackers.id, id), eq(trackers.userId, userId)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reorder trackers";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
