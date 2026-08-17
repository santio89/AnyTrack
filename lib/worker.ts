import cron from "node-cron";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { logs, trackers } from "@/db/schema";
import { db } from "@/lib/db";
import { sendTrackerChangeEmail, sendTrackerFailureEmail } from "@/lib/notifications";
import { scrapeTarget, ScrapeError } from "@/lib/scraper";
import { parseReferenceImagePaths } from "@/lib/reference-image-paths";
import { saveScreenshot, deleteScreenshotFile } from "@/lib/screenshots";
import { buildChangeSummary } from "@/lib/value-change";
import { getUserAiSettingsForUserId } from "@/lib/ai-user-settings";

let workerStarted = false;

type RunningTrackerMeta = {
  userId: number;
  headed: boolean;
  startedAt: number;
};

const runningTrackers = new Map<number, RunningTrackerMeta>();

type ProcessTrackerOptions = {
  headed?: boolean;
};

async function getPreviousExtractedValue(trackerId: number) {
  const [previousLog] = await db
    .select({ extractedValue: logs.extractedValue })
    .from(logs)
    .where(and(eq(logs.trackerId, trackerId), isNotNull(logs.extractedValue)))
    .orderBy(desc(logs.createdAt))
    .limit(1);

  return previousLog?.extractedValue ?? null;
}

async function maybeNotifyRunFailure(
  tracker: typeof trackers.$inferSelect,
  errorMessage: string,
) {
  if (!tracker.notifyOnFailure || !tracker.notificationEmail?.trim()) {
    return;
  }

  try {
    await sendTrackerFailureEmail({
      to: tracker.notificationEmail.trim(),
      trackerDescription: tracker.targetDescription,
      trackerUrl: tracker.url,
      errorMessage,
    });
    console.log(
      `[AnyTrack] Failure notification sent for tracker #${tracker.id} to ${tracker.notificationEmail}`,
    );
  } catch (error) {
    console.error(
      `[AnyTrack] Failed to send failure notification for tracker #${tracker.id}:`,
      error,
    );
  }
}

async function maybeNotifyValueChange(
  tracker: typeof trackers.$inferSelect,
  previousValue: string | null,
  currentValue: string,
) {
  if (!tracker.notifyOnChange || !tracker.notificationEmail?.trim()) {
    return;
  }

  if (!previousValue || previousValue === currentValue) {
    return;
  }

  try {
    await sendTrackerChangeEmail({
      to: tracker.notificationEmail.trim(),
      trackerDescription: tracker.targetDescription,
      trackerUrl: tracker.url,
      previousValue,
      currentValue,
      changeSummary: buildChangeSummary(
        previousValue,
        currentValue,
        tracker.targetDescription,
      ),
    });
    console.log(
      `[AnyTrack] Change notification sent for tracker #${tracker.id} to ${tracker.notificationEmail}`,
    );
  } catch (error) {
    console.error(
      `[AnyTrack] Failed to send change notification for tracker #${tracker.id}:`,
      error,
    );
  }
}

async function processTracker(
  tracker: typeof trackers.$inferSelect,
  options: ProcessTrackerOptions = {},
) {
  if (runningTrackers.has(tracker.id)) {
    return;
  }

  if (!tracker.userId) {
    return;
  }

  runningTrackers.set(tracker.id, {
    userId: tracker.userId,
    headed: options.headed ?? false,
    startedAt: Date.now(),
  });

  try {
    const now = new Date();
    const previousValue = await getPreviousExtractedValue(tracker.id);

    const referenceImagePath =
      parseReferenceImagePaths(
        tracker.referenceImagePaths,
        tracker.referenceImagePath,
      )[0] ?? tracker.referenceImagePath;

    const userAi = tracker.userId
      ? await getUserAiSettingsForUserId(tracker.userId)
      : null;

    const result = await Promise.race([
      scrapeTarget(tracker.url, tracker.targetDescription, {
        headed: options.headed,
        referenceImagePath,
        userAi,
        sessionUserId: tracker.userId,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Scrape timed out after 5 minutes")),
          300_000,
        ),
      ),
    ]);
    const screenshotPath = await saveScreenshot(result.screenshot, tracker.id);

    await db.insert(logs).values({
      trackerId: tracker.id,
      extractedValue: result.extractedValue,
      confidence: result.confidence,
      model: result.model,
      screenshotPath,
    });

    await db
      .update(trackers)
      .set({ lastRunAt: now, updatedAt: now })
      .where(eq(trackers.id, tracker.id));

    await maybeNotifyValueChange(tracker, previousValue, result.extractedValue);

    console.log(
      `[AnyTrack] Tracker #${tracker.id} scraped: "${result.extractedValue}" (${result.model})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    let screenshotPath: string | undefined;

    if (error instanceof ScrapeError && error.screenshot) {
      screenshotPath = await saveScreenshot(error.screenshot, tracker.id);
    }

    await db.insert(logs).values({
      trackerId: tracker.id,
      error: message,
      screenshotPath,
    });

    await db
      .update(trackers)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(trackers.id, tracker.id));

    await maybeNotifyRunFailure(tracker, message);

    console.error(`[AnyTrack] Tracker #${tracker.id} failed:`, message);
  } finally {
    runningTrackers.delete(tracker.id);
  }
}

async function runScheduledTrackers() {
  const activeTrackers = await db
    .select()
    .from(trackers)
    .where(
      and(
        eq(trackers.isActive, true),
        isNotNull(trackers.userId),
        isNull(trackers.deletedAt),
      ),
    );

  const now = Date.now();

  for (const tracker of activeTrackers) {
    const frequencyMs = tracker.frequencyMinutes * 60 * 1000;
    const lastRun = tracker.lastRunAt?.getTime() ?? 0;

    if (now - lastRun >= frequencyMs) {
      void processTracker(tracker);
    }
  }
}

export function startWorker() {
  if (workerStarted) {
    return;
  }

  workerStarted = true;

  cron.schedule("* * * * *", () => {
    void runScheduledTrackers().catch((error) => {
      console.error("[AnyTrack] Worker tick failed:", error);
    });
  });

  console.log("[AnyTrack] Background worker started (cron: every minute)");

  void runScheduledTrackers().catch((error) => {
    console.error("[AnyTrack] Initial worker run failed:", error);
  });
}

export function getRunningTrackersForUser(userId: number) {
  return Array.from(runningTrackers.entries())
    .filter(([, meta]) => meta.userId === userId)
    .map(([trackerId, meta]) => ({
      trackerId,
      headed: meta.headed,
      startedAt: meta.startedAt,
    }));
}

export async function runTrackerNow(
  trackerId: number,
  userId: number,
  options: ProcessTrackerOptions = {},
) {
  if (runningTrackers.has(trackerId)) {
    throw new Error("Tracker is already running");
  }

  const [tracker] = await db
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

  if (!tracker) {
    throw new Error("Tracker not found");
  }

  await processTracker(tracker, options);
}

export async function clearLogs(userId: number, trackerId?: number) {
  const userTrackerIds = await db
    .select({ id: trackers.id })
    .from(trackers)
    .where(eq(trackers.userId, userId));

  const trackerIds = userTrackerIds.map((tracker) => tracker.id);

  if (trackerIds.length === 0) {
    return 0;
  }

  if (trackerId != null && !trackerIds.includes(trackerId)) {
    throw new Error("Tracker not found");
  }

  const targetTrackerIds =
    trackerId != null ? [trackerId] : trackerIds;

  const matchingLogs = await db
    .select({ screenshotPath: logs.screenshotPath })
    .from(logs)
    .where(inArray(logs.trackerId, targetTrackerIds));

  await db.delete(logs).where(inArray(logs.trackerId, targetTrackerIds));

  await Promise.all(
    matchingLogs.map((log) => deleteScreenshotFile(log.screenshotPath)),
  );

  return matchingLogs.length;
}

export async function getRecentLogs(
  userId: number,
  limit = 50,
  trackerId?: number,
) {
  const conditions = [eq(trackers.userId, userId)];

  if (trackerId != null) {
    conditions.push(eq(logs.trackerId, trackerId));
  }

  return db
    .select({
      id: logs.id,
      trackerId: logs.trackerId,
      extractedValue: logs.extractedValue,
      confidence: logs.confidence,
      model: logs.model,
      error: logs.error,
      screenshotPath: logs.screenshotPath,
      createdAt: logs.createdAt,
      trackerUrl: trackers.url,
      trackerDescription: trackers.targetDescription,
    })
    .from(logs)
    .innerJoin(trackers, eq(logs.trackerId, trackers.id))
    .where(and(...conditions))
    .orderBy(desc(logs.createdAt))
    .limit(limit);
}
