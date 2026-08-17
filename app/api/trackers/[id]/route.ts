import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { trackers } from "@/db/schema";
import { db, initDb } from "@/lib/db";
import { getTrackerForUser } from "@/lib/auth/trackers";
import {
  requireUserId,
} from "@/lib/auth/session";
import {
  deleteReferenceImage,
  parseReferenceImageInput,
  parseReferenceImagePaths,
  saveReferenceImage,
} from "@/lib/reference-images";
import { runTrackerNow, abortTrackerRun } from "@/lib/worker";
import { deleteTrackerScreenshots } from "@/lib/screenshots";
import { validatePublicHttpUrl } from "@/lib/http-url";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await initDb();
    const userId = await requireUserId();
    const { id } = await context.params;
    const trackerId = Number(id);

    if (Number.isNaN(trackerId)) {
      return NextResponse.json({ error: "Invalid tracker ID" }, { status: 400 });
    }

    const tracker = await getTrackerForUser(trackerId, userId);

    if (!tracker) {
      return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
    }

    return NextResponse.json(tracker);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tracker";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await initDb();
    const userId = await requireUserId();
    const { id } = await context.params;
    const trackerId = Number(id);

    if (Number.isNaN(trackerId)) {
      return NextResponse.json({ error: "Invalid tracker ID" }, { status: 400 });
    }

    const existing = await getTrackerForUser(trackerId, userId);

    if (!existing) {
      return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      url?: string;
      targetDescription?: string;
      frequencyMinutes?: number;
      isActive?: boolean;
      notifyOnChange?: boolean;
      notifyOnFailure?: boolean;
      notificationEmail?: string | null;
      referenceImage?: {
        data: string;
        mimeType?: string;
      };
      removeReferenceImage?: boolean;
    };

    const nextNotificationEmail =
      body.notificationEmail !== undefined
        ? body.notificationEmail?.trim() || null
        : existing.notificationEmail;

    const nextNotifyOnChange =
      body.notifyOnChange !== undefined
        ? body.notifyOnChange === true && Boolean(nextNotificationEmail)
        : existing.notifyOnChange;

    const nextNotifyOnFailure =
      body.notifyOnFailure !== undefined
        ? body.notifyOnFailure === true && Boolean(nextNotificationEmail)
        : existing.notifyOnFailure;

    if ((body.notifyOnChange || body.notifyOnFailure) && !nextNotificationEmail) {
      return NextResponse.json(
        { error: "Notification email is required when alerts are enabled" },
        { status: 400 },
      );
    }

    const nextUrl = body.url?.trim() ?? existing.url;
    if (body.url !== undefined) {
      const urlError = validatePublicHttpUrl(nextUrl);
      if (urlError) {
        return NextResponse.json({ error: urlError }, { status: 400 });
      }
    }

    const existingPaths = parseReferenceImagePaths(
      existing.referenceImagePaths,
      existing.referenceImagePath,
    );
    let referenceImagePath: string | null =
      existingPaths[0] ?? existing.referenceImagePath;

    if (body.removeReferenceImage) {
      for (const path of existingPaths) {
        await deleteReferenceImage(path);
      }
      referenceImagePath = null;
    }

    if (body.referenceImage?.data) {
      const { buffer, mimeType } = parseReferenceImageInput(body.referenceImage);
      for (const path of existingPaths) {
        await deleteReferenceImage(path);
      }
      referenceImagePath = await saveReferenceImage(trackerId, buffer, mimeType);
    }

    const [updated] = await db
      .update(trackers)
      .set({
        url: nextUrl,
        targetDescription: body.targetDescription?.trim() ?? existing.targetDescription,
        frequencyMinutes: body.frequencyMinutes ?? existing.frequencyMinutes,
        isActive: body.isActive ?? existing.isActive,
        notifyOnChange: nextNotifyOnChange,
        notifyOnFailure: nextNotifyOnFailure,
        notificationEmail: nextNotificationEmail,
        referenceImagePath,
        referenceImagePaths: null,
        updatedAt: new Date(),
      })
      .where(and(eq(trackers.id, trackerId), eq(trackers.userId, userId)))
      .returning();

    if (body.isActive === false) {
      abortTrackerRun(trackerId);
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tracker";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await initDb();
    const userId = await requireUserId();
    const { id } = await context.params;
    const trackerId = Number(id);

    if (Number.isNaN(trackerId)) {
      return NextResponse.json({ error: "Invalid tracker ID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      clearLogs?: boolean;
    };
    const clearLogs = body.clearLogs !== false;

    const [existing] = await db
      .select()
      .from(trackers)
      .where(
        and(
          eq(trackers.id, trackerId),
          eq(trackers.userId, userId),
          isNull(trackers.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
    }

    const paths = parseReferenceImagePaths(
      existing.referenceImagePaths,
      existing.referenceImagePath,
    );
    for (const path of paths) {
      await deleteReferenceImage(path);
    }

    if (clearLogs) {
      const [deleted] = await db
        .delete(trackers)
        .where(and(eq(trackers.id, trackerId), eq(trackers.userId, userId)))
        .returning();

      if (!deleted) {
        return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
      }

      await deleteTrackerScreenshots(trackerId);

      return NextResponse.json({ success: true, keptLogs: false });
    }

    const [archived] = await db
      .update(trackers)
      .set({
        isActive: false,
        deletedAt: new Date(),
        referenceImagePath: null,
        referenceImagePaths: null,
        updatedAt: new Date(),
      })
      .where(and(eq(trackers.id, trackerId), eq(trackers.userId, userId)))
      .returning();

    if (!archived) {
      return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, keptLogs: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete tracker";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await initDb();
    const userId = await requireUserId();
    const { id } = await context.params;
    const trackerId = Number(id);

    if (Number.isNaN(trackerId)) {
      return NextResponse.json({ error: "Invalid tracker ID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      headed?: boolean;
    };

    await runTrackerNow(trackerId, userId, { headed: body.headed === true });

    return NextResponse.json({ success: true, message: "Tracker scrape triggered" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run tracker";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Tracker not found"
          ? 404
          : message === "Tracker is already running"
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
