import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { trackers } from "@/db/schema";
import { db, initDb } from "@/lib/db";
import {
  getCurrentUserId,
  requireUserId,
  unauthorizedResponse,
} from "@/lib/auth/session";
import {
  parseReferenceImageInput,
  saveReferenceImage,
} from "@/lib/reference-images";
import { validatePublicHttpUrl } from "@/lib/http-url";

export async function GET() {
  try {
    await initDb();
    const userId = await getCurrentUserId();

    if (userId == null) {
      return unauthorizedResponse();
    }

    const allTrackers = await db
      .select()
      .from(trackers)
      .where(and(eq(trackers.userId, userId), isNull(trackers.deletedAt)))
      .orderBy(asc(trackers.sortOrder), desc(trackers.createdAt));

    return NextResponse.json(allTrackers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch trackers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const userId = await requireUserId();
    const body = (await request.json()) as {
      url?: string;
      targetDescription?: string;
      frequencyMinutes?: number;
      isActive?: boolean;
      notifyOnChange?: boolean;
      notificationEmail?: string;
      referenceImage?: {
        data: string;
        mimeType?: string;
      };
    };

    const url = body.url?.trim() ?? "";
    const urlError = validatePublicHttpUrl(url);
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 });
    }

    if (!body.targetDescription?.trim()) {
      return NextResponse.json(
        { error: "Target description is required" },
        { status: 400 },
      );
    }

    const notificationEmail = body.notificationEmail?.trim() || null;
    const notifyOnChange = body.notifyOnChange === true && Boolean(notificationEmail);

    if (body.notifyOnChange && !notificationEmail) {
      return NextResponse.json(
        { error: "Notification email is required when alerts are enabled" },
        { status: 400 },
      );
    }

    const now = new Date();

    await db
      .update(trackers)
      .set({ sortOrder: sql`${trackers.sortOrder} + 1`, updatedAt: now })
      .where(eq(trackers.userId, userId));

    const [tracker] = await db
      .insert(trackers)
      .values({
        userId,
        url,
        targetDescription: body.targetDescription.trim(),
        frequencyMinutes: body.frequencyMinutes ?? 60,
        sortOrder: 0,
        notifyOnChange,
        notificationEmail,
        isActive: body.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (body.referenceImage?.data) {
      const { buffer, mimeType } = parseReferenceImageInput(body.referenceImage);
      const referenceImagePath = await saveReferenceImage(tracker.id, buffer, mimeType);

      const [updated] = await db
        .update(trackers)
        .set({ referenceImagePath, updatedAt: new Date() })
        .where(eq(trackers.id, tracker.id))
        .returning();

      return NextResponse.json(updated, { status: 201 });
    }

    return NextResponse.json(tracker, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tracker";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
