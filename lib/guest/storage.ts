import type { LogRecord, ReferenceImageValue, TrackerRecord } from "@/types/tracker";

const TRACKERS_KEY = "anytrack-guest-trackers";
const LOGS_KEY = "anytrack-guest-logs";
const MAX_GUEST_LOGS = 100;

type StoredGuestTracker = {
  id: string;
  url: string;
  targetDescription: string;
  frequencyMinutes: number;
  sortOrder: number;
  notifyOnChange: boolean;
  notifyOnFailure?: boolean;
  notificationEmail: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  referenceImage: ReferenceImageValue | null;
  deletedAt?: string | null;
};

type StoredGuestLog = {
  id: string;
  trackerId: string;
  extractedValue: string | null;
  confidence: number | null;
  model: string | null;
  error: string | null;
  screenshotDataUrl: string | null;
  createdAt: string;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function toTrackerRecord(tracker: StoredGuestTracker): TrackerRecord {
  return {
    id: tracker.id,
    mode: "guest",
    url: tracker.url,
    targetDescription: tracker.targetDescription,
    referenceImagePath: null,
    referenceImagePaths: null,
    referenceImage: tracker.referenceImage,
    frequencyMinutes: tracker.frequencyMinutes,
    sortOrder: tracker.sortOrder,
    notifyOnChange: tracker.notifyOnChange,
    notifyOnFailure: tracker.notifyOnFailure ?? false,
    notificationEmail: tracker.notificationEmail,
    isActive: tracker.isActive,
    lastRunAt: tracker.lastRunAt ? new Date(tracker.lastRunAt) : null,
    createdAt: new Date(tracker.createdAt),
    updatedAt: new Date(tracker.updatedAt),
  };
}

function toLogRecord(
  log: StoredGuestLog,
  tracker?: StoredGuestTracker,
): LogRecord {
  return {
    id: log.id,
    mode: "guest",
    trackerId: log.trackerId,
    extractedValue: log.extractedValue,
    confidence: log.confidence,
    model: log.model ?? null,
    error: log.error,
    screenshotPath: null,
    screenshotDataUrl: log.screenshotDataUrl,
    createdAt: log.createdAt,
    trackerUrl: tracker?.url ?? null,
    trackerDescription: tracker?.targetDescription ?? null,
  };
}

export function loadGuestTrackers(): TrackerRecord[] {
  const trackers = readJson<StoredGuestTracker[]>(TRACKERS_KEY, []);
  return trackers
    .filter((tracker) => !tracker.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toTrackerRecord);
}

export function loadGuestLogs(trackerId?: string): LogRecord[] {
  const trackers = readJson<StoredGuestTracker[]>(TRACKERS_KEY, []);
  const trackerMap = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const logs = readJson<StoredGuestLog[]>(LOGS_KEY, []);

  return logs
    .filter((log) => (trackerId ? log.trackerId === trackerId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)
    .map((log) => toLogRecord(log, trackerMap.get(log.trackerId)));
}

export function hasGuestData() {
  const trackers = readJson<StoredGuestTracker[]>(TRACKERS_KEY, []);
  return trackers.some((tracker) => !tracker.deletedAt);
}

export function clearGuestData() {
  window.localStorage.removeItem(TRACKERS_KEY);
  window.localStorage.removeItem(LOGS_KEY);
}

export function createGuestTracker(input: {
  url: string;
  targetDescription: string;
  frequencyMinutes: number;
  notifyOnChange: boolean;
  notifyOnFailure?: boolean;
  notificationEmail: string | null;
  referenceImage: ReferenceImageValue | null;
}): TrackerRecord {
  const trackers = readJson<StoredGuestTracker[]>(TRACKERS_KEY, []);
  const now = new Date().toISOString();

  const tracker: StoredGuestTracker = {
    id: createId(),
    url: input.url.trim(),
    targetDescription: input.targetDescription.trim(),
    frequencyMinutes: input.frequencyMinutes,
    sortOrder: 0,
    notifyOnChange: input.notifyOnChange,
    notifyOnFailure: input.notifyOnFailure ?? false,
    notificationEmail: input.notificationEmail,
    isActive: true,
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
    referenceImage: input.referenceImage,
  };

  const shifted = trackers.map((item) => ({
    ...item,
    sortOrder: item.sortOrder + 1,
  }));

  writeJson(TRACKERS_KEY, [tracker, ...shifted]);
  return toTrackerRecord(tracker);
}

export function updateGuestTracker(
  trackerId: string,
  input: Partial<{
    url: string;
    targetDescription: string;
    frequencyMinutes: number;
    notifyOnChange: boolean;
    notifyOnFailure: boolean;
    notificationEmail: string | null;
    isActive: boolean;
    referenceImage: ReferenceImageValue | null;
    removeReferenceImage: boolean;
  }>,
): TrackerRecord | null {
  const trackers = readJson<StoredGuestTracker[]>(TRACKERS_KEY, []);
  const index = trackers.findIndex((tracker) => tracker.id === trackerId);

  if (index === -1) {
    return null;
  }

  const current = trackers[index];
  const next: StoredGuestTracker = {
    ...current,
    url: input.url?.trim() ?? current.url,
    targetDescription: input.targetDescription?.trim() ?? current.targetDescription,
    frequencyMinutes: input.frequencyMinutes ?? current.frequencyMinutes,
    notifyOnChange: input.notifyOnChange ?? current.notifyOnChange,
    notifyOnFailure: input.notifyOnFailure ?? current.notifyOnFailure ?? false,
    notificationEmail:
      input.notificationEmail !== undefined
        ? input.notificationEmail
        : current.notificationEmail,
    isActive: input.isActive ?? current.isActive,
    referenceImage: input.removeReferenceImage
      ? null
      : input.referenceImage ?? current.referenceImage,
    updatedAt: new Date().toISOString(),
  };

  trackers[index] = next;
  writeJson(TRACKERS_KEY, trackers);
  return toTrackerRecord(next);
}

export function deleteGuestTracker(
  trackerId: string,
  options?: { clearLogs?: boolean },
) {
  const clearLogs = options?.clearLogs !== false;
  const trackers = readJson<StoredGuestTracker[]>(TRACKERS_KEY, []);

  if (clearLogs) {
    writeJson(
      TRACKERS_KEY,
      trackers.filter((tracker) => tracker.id !== trackerId),
    );

    const logs = readJson<StoredGuestLog[]>(LOGS_KEY, []);
    writeJson(
      LOGS_KEY,
      logs.filter((log) => log.trackerId !== trackerId),
    );
    return;
  }

  const index = trackers.findIndex((tracker) => tracker.id === trackerId);

  if (index === -1) {
    return;
  }

  trackers[index] = {
    ...trackers[index],
    isActive: false,
    deletedAt: new Date().toISOString(),
    referenceImage: null,
    updatedAt: new Date().toISOString(),
  };
  writeJson(TRACKERS_KEY, trackers);
}

export function reorderGuestTrackers(orderedIds: string[]) {
  const trackers = readJson<StoredGuestTracker[]>(TRACKERS_KEY, []);
  const map = new Map(trackers.map((tracker) => [tracker.id, tracker]));

  const reordered = orderedIds
    .map((id, index) => {
      const tracker = map.get(id);
      if (!tracker) {
        return null;
      }

      return { ...tracker, sortOrder: index, updatedAt: new Date().toISOString() };
    })
    .filter((tracker): tracker is StoredGuestTracker => tracker !== null);

  writeJson(TRACKERS_KEY, reordered);
  return reordered.map(toTrackerRecord);
}

export function appendGuestLog(input: {
  trackerId: string;
  extractedValue?: string | null;
  confidence?: number | null;
  model?: string | null;
  error?: string | null;
  screenshotDataUrl?: string | null;
}) {
  const logs = readJson<StoredGuestLog[]>(LOGS_KEY, []);
  const log: StoredGuestLog = {
    id: createId(),
    trackerId: input.trackerId,
    extractedValue: input.extractedValue ?? null,
    confidence: input.confidence ?? null,
    model: input.model ?? null,
    error: input.error ?? null,
    screenshotDataUrl: input.screenshotDataUrl ?? null,
    createdAt: new Date().toISOString(),
  };

  const nextLogs = [log, ...logs].slice(0, MAX_GUEST_LOGS);
  writeJson(LOGS_KEY, nextLogs);

  const trackers = readJson<StoredGuestTracker[]>(TRACKERS_KEY, []);
  const index = trackers.findIndex((tracker) => tracker.id === input.trackerId);

  if (index !== -1) {
    trackers[index] = {
      ...trackers[index],
      lastRunAt: log.createdAt,
      updatedAt: log.createdAt,
    };
    writeJson(TRACKERS_KEY, trackers);
  }

  return toLogRecord(log, trackers[index]);
}

export function clearGuestLogs(trackerId?: string) {
  const logs = readJson<StoredGuestLog[]>(LOGS_KEY, []);

  if (trackerId) {
    writeJson(
      LOGS_KEY,
      logs.filter((log) => log.trackerId !== trackerId),
    );
    return logs.filter((log) => log.trackerId === trackerId).length;
  }

  writeJson(LOGS_KEY, []);
  return logs.length;
}

export function exportGuestTrackersForSync() {
  return readJson<StoredGuestTracker[]>(TRACKERS_KEY, [])
    .filter((tracker) => !tracker.deletedAt)
    .map((tracker) => ({
    url: tracker.url,
    targetDescription: tracker.targetDescription,
    frequencyMinutes: tracker.frequencyMinutes,
    notifyOnChange: tracker.notifyOnChange,
    notifyOnFailure: tracker.notifyOnFailure ?? false,
    notificationEmail: tracker.notificationEmail,
    isActive: tracker.isActive,
    sortOrder: tracker.sortOrder,
    referenceImage: tracker.referenceImage,
  }));
}
