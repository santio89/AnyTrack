import type { Tracker } from "@/db/schema";
import type { LogRecord, TrackerRecord } from "@/types/tracker";

export function dbTrackerToRecord(tracker: Tracker): TrackerRecord {
  return {
    id: String(tracker.id),
    dbId: tracker.id,
    mode: "cloud",
    url: tracker.url,
    targetDescription: tracker.targetDescription,
    referenceImagePath: tracker.referenceImagePath,
    referenceImagePaths: tracker.referenceImagePaths,
    referenceImage: null,
    frequencyMinutes: tracker.frequencyMinutes,
    sortOrder: tracker.sortOrder,
    notifyOnChange: tracker.notifyOnChange,
    notificationEmail: tracker.notificationEmail,
    isActive: tracker.isActive,
    lastRunAt: tracker.lastRunAt,
    createdAt: tracker.createdAt,
    updatedAt: tracker.updatedAt,
  };
}

export function normalizeCloudTrackers(trackers: Tracker[]): TrackerRecord[] {
  return trackers.map((tracker) => ({
    ...dbTrackerToRecord(tracker),
    isActive: Boolean(tracker.isActive),
    notifyOnChange: Boolean(tracker.notifyOnChange),
    createdAt: new Date(tracker.createdAt),
    updatedAt: new Date(tracker.updatedAt),
    lastRunAt: tracker.lastRunAt ? new Date(tracker.lastRunAt) : null,
  }));
}

export function cloudLogToRecord(log: {
  id: number;
  trackerId: number;
  extractedValue: string | null;
  confidence: number | null;
  model: string | null;
  error: string | null;
  screenshotPath: string | null;
  createdAt: Date;
  trackerUrl: string | null;
  trackerDescription: string | null;
}): LogRecord {
  return {
    id: String(log.id),
    dbId: log.id,
    mode: "cloud",
    trackerId: String(log.trackerId),
    extractedValue: log.extractedValue,
    confidence: log.confidence,
    model: log.model,
    error: log.error,
    screenshotPath: log.screenshotPath,
    screenshotDataUrl: null,
    createdAt:
      log.createdAt instanceof Date
        ? log.createdAt.toISOString()
        : String(log.createdAt),
    trackerUrl: log.trackerUrl,
    trackerDescription: log.trackerDescription,
  };
}

export function trackersEqual(a: TrackerRecord[], b: TrackerRecord[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((tracker, index) => {
    const other = b[index];
    if (!other || tracker.id !== other.id) {
      return false;
    }

    return (
      tracker.isActive === other.isActive &&
      tracker.url === other.url &&
      tracker.targetDescription === other.targetDescription &&
      tracker.frequencyMinutes === other.frequencyMinutes &&
      tracker.sortOrder === other.sortOrder &&
      tracker.notifyOnChange === other.notifyOnChange &&
      tracker.notificationEmail === other.notificationEmail &&
      tracker.referenceImagePath === other.referenceImagePath &&
      tracker.referenceImagePaths === other.referenceImagePaths &&
      tracker.updatedAt.getTime() === other.updatedAt.getTime() &&
      (tracker.lastRunAt?.getTime() ?? 0) === (other.lastRunAt?.getTime() ?? 0)
    );
  });
}

export function trackerHasReference(tracker: TrackerRecord): boolean {
  return Boolean(tracker.referenceImage) || Boolean(tracker.referenceImagePath);
}
