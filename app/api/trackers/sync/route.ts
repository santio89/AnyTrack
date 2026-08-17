import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { trackers } from "@/db/schema";
import { db, initDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { validatePublicHttpUrl } from "@/lib/http-url";
import {
  parseReferenceImageInput,
  saveReferenceImage,
} from "@/lib/reference-images";

const MAX_SYNC_TRACKERS = 100;

type SyncTrackerInput = {
  url: string;
  targetDescription: string;
  frequencyMinutes: number;
  notifyOnChange: boolean;
  notificationEmail: string | null;
  isActive: boolean;
  sortOrder: number;
  referenceImage?: {
    data: string;
    mimeType?: string;
  } | null;
};

export async function POST(request: Request) {
  try {
    await initDb();
    const userId = await requireUserId();
    const body = (await request.json()) as { trackers?: SyncTrackerInput[] };
    const incoming = body.trackers ?? [];

    if (incoming.length === 0) {
      return NextResponse.json({ imported: 0, trackers: [] });
    }

    if (incoming.length > MAX_SYNC_TRACKERS) {
      return NextResponse.json(
        { error: `You can sync up to ${MAX_SYNC_TRACKERS} trackers at once` },
        { status: 400 },
      );
    }

    const now = new Date();
    const created = [];

    for (const [index, item] of incoming.entries()) {
      const url = item.url?.trim() ?? "";
      const targetDescription = item.targetDescription?.trim() ?? "";
      const urlError = validatePublicHttpUrl(url);

      if (urlError) {
        return NextResponse.json(
          { error: `Tracker ${index + 1}: ${urlError}` },
          { status: 400 },
        );
      }

      if (!targetDescription) {
        return NextResponse.json(
          { error: `Tracker ${index + 1}: Target description is required` },
          { status: 400 },
        );
      }

      const [tracker] = await db
        .insert(trackers)
        .values({
          userId,
          url,
          targetDescription,
          frequencyMinutes: item.frequencyMinutes ?? 60,
          sortOrder: item.sortOrder ?? index,
          notifyOnChange: item.notifyOnChange,
          notificationEmail: item.notificationEmail,
          isActive: item.isActive,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (item.referenceImage?.data) {
        const { buffer, mimeType } = parseReferenceImageInput(item.referenceImage);
        const referenceImagePath = await saveReferenceImage(
          tracker.id,
          buffer,
          mimeType,
        );

        const [updated] = await db
          .update(trackers)
          .set({ referenceImagePath, updatedAt: new Date() })
          .where(eq(trackers.id, tracker.id))
          .returning();

        created.push(updated);
      } else {
        created.push(tracker);
      }
    }

    return NextResponse.json({
      imported: created.length,
      trackers: created,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync trackers";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
