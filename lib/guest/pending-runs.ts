export type GuestPendingRun = {
  trackerId: string;
  startedAt: number;
};

const STORAGE_KEY = "anytrack-pending-runs";
const PENDING_RUN_TTL_MS = 10 * 60 * 1000;

function getLocalStorage(): Storage | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage;
}

function readRuns(): GuestPendingRun[] {
  const storage = getLocalStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as GuestPendingRun[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRuns(runs: GuestPendingRun[]) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export function pruneExpiredGuestPendingRuns() {
  const now = Date.now();
  const active = readRuns().filter(
    (run) => now - run.startedAt < PENDING_RUN_TTL_MS,
  );

  writeRuns(active);
  return active;
}

export function getGuestPendingRuns(): GuestPendingRun[] {
  return pruneExpiredGuestPendingRuns();
}

export function addGuestPendingRun(run: GuestPendingRun) {
  const runs = readRuns().filter((entry) => entry.trackerId !== run.trackerId);
  runs.push(run);
  writeRuns(runs);
}

export function removeGuestPendingRun(trackerId: string) {
  writeRuns(readRuns().filter((run) => run.trackerId !== trackerId));
}
