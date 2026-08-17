"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getGuestPendingRuns,
  pruneExpiredGuestPendingRuns,
  removeGuestPendingRun,
} from "@/lib/guest/pending-runs";
import type { LogRecord } from "@/types/tracker";

export type RunningTrackerState = {
  id: string;
  headed: boolean;
  startedAt: number;
};

type UseRunningTrackersOptions = {
  isGuest: boolean;
  isAuthenticated: boolean;
  isLoaded: boolean;
  logs: LogRecord[];
  onPoll?: () => void | Promise<void>;
};

function mergeRunning(
  ...groups: RunningTrackerState[][]
): RunningTrackerState[] {
  const merged = new Map<string, RunningTrackerState>();

  for (const group of groups) {
    for (const entry of group) {
      merged.set(entry.id, entry);
    }
  }

  return Array.from(merged.values());
}

export function useRunningTrackers({
  isGuest,
  isAuthenticated,
  isLoaded,
  logs,
  onPoll,
}: UseRunningTrackersOptions) {
  const [localRunning, setLocalRunning] = useState<RunningTrackerState[]>([]);
  const [serverRunning, setServerRunning] = useState<RunningTrackerState[]>([]);

  const runningTrackers = useMemo(
    () => mergeRunning(localRunning, serverRunning),
    [localRunning, serverRunning],
  );

  const getTrackerRunningState = useCallback(
    (trackerId: string) =>
      runningTrackers.find((entry) => entry.id === trackerId) ?? null,
    [runningTrackers],
  );

  const syncServerRunning = useCallback(async () => {
    if (!isAuthenticated) {
      setServerRunning([]);
      return;
    }

    const response = await fetch("/api/trackers/running");

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      running?: Array<{ trackerId: number; headed: boolean; startedAt: number }>;
    };

    setServerRunning(
      (payload.running ?? []).map((entry) => ({
        id: String(entry.trackerId),
        headed: entry.headed,
        startedAt: entry.startedAt,
      })),
    );
  }, [isAuthenticated]);

  const syncGuestPending = useCallback(() => {
    if (!isGuest) {
      return;
    }

    pruneExpiredGuestPendingRuns();

    const pending = getGuestPendingRuns();
    const stillPending: RunningTrackerState[] = [];

    for (const run of pending) {
      const completed = logs.some(
        (log) =>
          log.trackerId === run.trackerId &&
          new Date(log.createdAt).getTime() >= run.startedAt,
      );

      if (completed) {
        removeGuestPendingRun(run.trackerId);
        continue;
      }

      stillPending.push({
        id: run.trackerId,
        headed: run.headed,
        startedAt: run.startedAt,
      });
    }

    setLocalRunning(stillPending);
  }, [isGuest, logs]);

  const syncRunningState = useCallback(async () => {
    await syncServerRunning();
    syncGuestPending();
  }, [syncGuestPending, syncServerRunning]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    queueMicrotask(() => {
      void syncRunningState();
    });
  }, [isLoaded, syncRunningState]);

  useEffect(() => {
    if (!isLoaded || runningTrackers.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        await syncRunningState();
        await onPoll?.();
      })();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [isLoaded, onPoll, runningTrackers.length, syncRunningState]);

  const markRunning = useCallback((trackerId: string, headed: boolean) => {
    setLocalRunning((current) => {
      const existing = current.find((entry) => entry.id === trackerId);

      return mergeRunning(current, [
        {
          id: trackerId,
          headed,
          startedAt: existing?.startedAt ?? Date.now(),
        },
      ]);
    });
  }, []);

  const clearRunning = useCallback((trackerId: string) => {
    setLocalRunning((current) =>
      current.filter((entry) => entry.id !== trackerId),
    );
    removeGuestPendingRun(trackerId);
  }, []);

  return {
    runningTrackers,
    getTrackerRunningState,
    markRunning,
    clearRunning,
    syncRunningState,
  };
}
