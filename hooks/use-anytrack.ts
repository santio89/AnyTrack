"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useI18n } from "@/components/I18nProvider";
import type { Tracker } from "@/db/schema";
import {
  appendGuestLog,
  clearGuestData,
  clearGuestLogs,
  createGuestTracker,
  deleteGuestTracker,
  exportGuestTrackersForSync,
  hasGuestData,
  loadGuestLogs,
  loadGuestTrackers,
  reorderGuestTrackers,
  updateGuestTracker,
} from "@/lib/guest/storage";
import {
  addGuestPendingRun,
  removeGuestPendingRun,
} from "@/lib/guest/pending-runs";
import {
  clearGuestAiSettings,
  loadGuestAiSettings,
  saveGuestAiSettings,
  toGuestAiSettingsPublic,
} from "@/lib/guest/ai-settings";
import {
  cloudLogToRecord,
  normalizeCloudTrackers,
  trackersEqual,
} from "@/lib/tracker-records";
import type {
  UserAiProvider,
  UserAiSettingsPublic,
} from "@/types/ai-settings";
import type { LogRecord, ReferenceImageValue, TrackerRecord } from "@/types/tracker";

function extractApiError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}

export function useAnyTrack(logTrackerFilter: string) {
  const { t } = useI18n();
  const { isSignedIn, isLoaded } = useAuth();
  const isAuthenticated = isSignedIn === true;
  const isGuest = isLoaded && !isSignedIn;

  const [trackers, setTrackers] = useState<TrackerRecord[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [aiSettings, setAiSettings] = useState<UserAiSettingsPublic | null>(null);
  const [savingAiSettings, setSavingAiSettings] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncPromptChecked, setSyncPromptChecked] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const previousSignedIn = useRef<boolean | undefined>(undefined);

  const fetchData = useCallback(
    async (showRefresh = false) => {
      const refreshStartedAt = showRefresh ? Date.now() : 0;
      if (showRefresh) setRefreshing(true);

      try {
        if (isGuest) {
          const guestTrackers = loadGuestTrackers();
          const guestLogs = loadGuestLogs(
            logTrackerFilter === "all" ? undefined : logTrackerFilter,
          );
          const configRes = await fetch("/api/config");
          let hostedAiAvailable = false;

          if (configRes.ok) {
            const config = (await configRes.json()) as {
              aiConfigured?: boolean;
            };
            hostedAiAvailable = config.aiConfigured === true;
          }

          setTrackers(guestTrackers);
          setLogs(guestLogs);
          setAiSettings(
            toGuestAiSettingsPublic(loadGuestAiSettings(), hostedAiAvailable),
          );
        } else if (isAuthenticated) {
          const logsParams = new URLSearchParams({ limit: "50" });
          if (logTrackerFilter !== "all") {
            logsParams.set("trackerId", logTrackerFilter);
          }

          const [trackersRes, logsRes, configRes, aiSettingsRes] = await Promise.all([
            fetch("/api/trackers"),
            fetch(`/api/logs?${logsParams}`),
            fetch("/api/config"),
            fetch("/api/settings/ai"),
          ]);

          if (trackersRes.ok) {
            const trackersData = (await trackersRes.json()) as Tracker[];
            const normalized = normalizeCloudTrackers(trackersData);
            setTrackers((current) =>
              trackersEqual(current, normalized) ? current : normalized,
            );
          }

          if (logsRes.ok) {
            const logsData = (await logsRes.json()) as Array<{
              id: number;
              trackerId: number;
              extractedValue: string | null;
              confidence: number | null;
              model: string | null;
              error: string | null;
              screenshotPath: string | null;
              createdAt: string;
              trackerUrl: string | null;
              trackerDescription: string | null;
            }>;
            setLogs(
              logsData.map((log) =>
                cloudLogToRecord({
                  ...log,
                  createdAt: new Date(log.createdAt),
                }),
              ),
            );
          }

          if (configRes.ok) {
            const config = (await configRes.json()) as {
              emailConfigured?: boolean;
            };
            if (typeof config.emailConfigured === "boolean") {
              setEmailConfigured(config.emailConfigured);
            }
          }

          if (aiSettingsRes.ok) {
            setAiSettings((await aiSettingsRes.json()) as UserAiSettingsPublic);
          }
        }
      } finally {
        setLoading(false);
        if (showRefresh) {
          const elapsed = Date.now() - refreshStartedAt;
          const minSpinMs = 650;
          if (elapsed < minSpinMs) {
            await new Promise((resolve) => setTimeout(resolve, minSpinMs - elapsed));
          }
          setRefreshing(false);
        }
      }
    },
    [isAuthenticated, isGuest, logTrackerFilter],
  );

  useEffect(() => {
    if (!isLoaded) return;

    const authChanged =
      previousSignedIn.current !== undefined &&
      previousSignedIn.current !== isSignedIn;
    previousSignedIn.current = isSignedIn;

    if (authChanged) {
      setLoading(true);
      setTrackers([]);
      setLogs([]);
    }

    void fetchData();
  }, [fetchData, isLoaded, isSignedIn, logTrackerFilter]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setSyncPromptChecked(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isAuthenticated || syncPromptChecked) {
      return;
    }

    setSyncPromptChecked(true);
    if (hasGuestData()) {
      setSyncDialogOpen(true);
    }
  }, [isAuthenticated, isLoaded, syncPromptChecked]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const interval = setInterval(() => void fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData, isAuthenticated]);

  const createTracker = useCallback(
    async (input: {
      url: string;
      targetDescription: string;
      frequencyMinutes: number;
      notifyOnChange: boolean;
      notificationEmail: string;
      referenceImage: ReferenceImageValue | null;
    }) => {
      if (isGuest) {
        createGuestTracker({
          url: input.url,
          targetDescription: input.targetDescription,
          frequencyMinutes: input.frequencyMinutes,
          notifyOnChange: false,
          notificationEmail: null,
          referenceImage: input.referenceImage,
        });
        await fetchData();
        return { ok: true as const };
      }

      const response = await fetch("/api/trackers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: input.url,
          targetDescription: input.targetDescription,
          frequencyMinutes: input.frequencyMinutes,
          notifyOnChange: input.notifyOnChange,
          notificationEmail: input.notifyOnChange ? input.notificationEmail : undefined,
          referenceImage: input.referenceImage ?? undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        return {
          ok: false as const,
          error: extractApiError(payload, "Failed to create tracker"),
        };
      }

      await fetchData();
      return { ok: true as const };
    },
    [fetchData, isGuest],
  );

  const updateTracker = useCallback(
    async (
      tracker: TrackerRecord,
      input: {
        url: string;
        targetDescription: string;
        frequencyMinutes: number;
        notifyOnChange: boolean;
        notificationEmail: string;
        referenceImage: ReferenceImageValue | null;
        removeReferenceImage: boolean;
      },
    ) => {
      if (tracker.mode === "guest") {
        updateGuestTracker(tracker.id, {
          url: input.url,
          targetDescription: input.targetDescription,
          frequencyMinutes: input.frequencyMinutes,
          referenceImage: input.referenceImage,
          removeReferenceImage: input.removeReferenceImage,
        });
        await fetchData();
        return { ok: true as const };
      }

      const response = await fetch(`/api/trackers/${tracker.dbId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: input.url,
          targetDescription: input.targetDescription,
          frequencyMinutes: input.frequencyMinutes,
          notifyOnChange: input.notifyOnChange,
          notificationEmail: input.notifyOnChange ? input.notificationEmail : null,
          referenceImage: input.referenceImage ?? undefined,
          removeReferenceImage:
            input.removeReferenceImage && !input.referenceImage ? true : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        return {
          ok: false as const,
          error: extractApiError(payload, "Failed to update tracker"),
        };
      }

      await fetchData();
      return { ok: true as const };
    },
    [fetchData],
  );

  const deleteTracker = useCallback(
    async (tracker: TrackerRecord, options?: { clearLogs?: boolean }) => {
      const clearLogs = options?.clearLogs !== false;

      if (tracker.mode === "guest") {
        deleteGuestTracker(tracker.id, { clearLogs });
        await fetchData();
        return { ok: true as const, keptLogs: !clearLogs };
      }

      const response = await fetch(`/api/trackers/${tracker.dbId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearLogs }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        return {
          ok: false as const,
          error: extractApiError(payload, "Failed to delete tracker"),
        };
      }

      const payload = (await response.json().catch(() => ({}))) as {
        keptLogs?: boolean;
      };

      await fetchData();
      return { ok: true as const, keptLogs: payload.keptLogs === true };
    },
    [fetchData],
  );

  const toggleTracker = useCallback(
    async (tracker: TrackerRecord) => {
      if (tracker.mode === "guest") {
        return { ok: true as const, unsupported: true as const };
      }

      const nextIsActive = !tracker.isActive;
      setTrackers((current) =>
        current.map((item) =>
          item.id === tracker.id ? { ...item, isActive: nextIsActive } : item,
        ),
      );

      const response = await fetch(`/api/trackers/${tracker.dbId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        await fetchData();
        return {
          ok: false as const,
          error: extractApiError(payload, "Failed to update tracker"),
        };
      }

      await fetchData();
      return { ok: true as const };
    },
    [fetchData],
  );

  const reorderTrackers = useCallback(
    async (newOrder: TrackerRecord[]) => {
      setTrackers(newOrder);

      if (isGuest) {
        reorderGuestTrackers(newOrder.map((tracker) => tracker.id));
        return { ok: true as const };
      }

      const response = await fetch("/api/trackers/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedIds: newOrder.map((tracker) => tracker.dbId),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        await fetchData();
        return {
          ok: false as const,
          error: extractApiError(payload, "Failed to reorder trackers"),
        };
      }

      return { ok: true as const };
    },
    [fetchData, isGuest],
  );

  const runTracker = useCallback(
    async (tracker: TrackerRecord, headed = false) => {
      if (tracker.mode === "guest") {
        addGuestPendingRun({
          trackerId: tracker.id,
          headed,
          startedAt: Date.now(),
        });

        const guestAi = loadGuestAiSettings();
        const response = await fetch("/api/guest/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: tracker.url,
            targetDescription: tracker.targetDescription,
            headed,
            referenceImage: tracker.referenceImage ?? undefined,
            aiSettings:
              guestAi.provider && guestAi.apiKey
                ? {
                    provider: guestAi.provider,
                    apiKey: guestAi.apiKey,
                    fallbackEnabled: guestAi.fallbackEnabled,
                  }
                : undefined,
          }),
        });

        const payload = (await response.json()) as {
          extractedValue?: string;
          confidence?: number;
          model?: string;
          error?: string;
          screenshotDataUrl?: string | null;
        };

        appendGuestLog({
          trackerId: tracker.id,
          extractedValue: payload.extractedValue ?? null,
          confidence: payload.confidence ?? null,
          model: payload.model ?? null,
          error: payload.error ?? (response.ok ? null : "Scrape failed"),
          screenshotDataUrl: payload.screenshotDataUrl ?? null,
        });

        removeGuestPendingRun(tracker.id);
        await fetchData(true);

        if (!response.ok) {
          return {
            ok: false as const,
            error: payload.error ?? "Scrape failed",
          };
        }

        return { ok: true as const };
      }

      const response = await fetch(`/api/trackers/${tracker.dbId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headed }),
      });

      if (response.status === 409) {
        await fetchData(true);
        return {
          ok: false as const,
          error: t("toast.trackerAlreadyRunning"),
          alreadyRunning: true as const,
        };
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        await fetchData(true);
        return {
          ok: false as const,
          error: extractApiError(payload, "Scrape failed to start"),
        };
      }

      await fetchData(true);
      return { ok: true as const };
    },
    [fetchData, t],
  );

  const clearLogsAction = useCallback(
    async (trackerId?: string) => {
      if (isGuest) {
        clearGuestLogs(trackerId);
        await fetchData(true);
        return { ok: true as const };
      }

      const url =
        trackerId != null
          ? `/api/logs?trackerId=${trackerId}`
          : "/api/logs";
      const response = await fetch(url, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        return {
          ok: false as const,
          error: extractApiError(payload, "Failed to clear logs"),
        };
      }

      await fetchData(true);
      return { ok: true as const };
    },
    [fetchData, isGuest],
  );

  const syncGuestTrackers = useCallback(async () => {
    const payload = exportGuestTrackersForSync();
    if (payload.length === 0) {
      setSyncDialogOpen(false);
      return { ok: true as const };
    }

    setSyncing(true);
    try {
      const response = await fetch("/api/trackers/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackers: payload }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as unknown;
        return {
          ok: false as const,
          error: extractApiError(body, "Failed to sync local trackers"),
        };
      }

      clearGuestData();
      setSyncDialogOpen(false);
      await fetchData(true);
      return { ok: true as const };
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  const dismissGuestSync = useCallback(() => {
    setSyncDialogOpen(false);
  }, []);

  const saveAiSettings = useCallback(
    async (input: {
      provider: UserAiProvider | null;
      apiKey: string;
      fallbackEnabled: boolean;
      clearApiKey?: boolean;
    }) => {
      setSavingAiSettings(true);

      try {
        if (isGuest) {
          if (input.clearApiKey) {
            clearGuestAiSettings();
          } else {
            const current = loadGuestAiSettings();
            const nextKey = input.apiKey.trim() || current.apiKey;

            if (!input.provider || !nextKey) {
              return {
                ok: false as const,
                error: t("aiSettings.missingKey"),
              };
            }

            saveGuestAiSettings({
              provider: input.provider,
              apiKey: nextKey,
              fallbackEnabled: input.fallbackEnabled,
            });
          }

          const configRes = await fetch("/api/config");
          let hostedAiAvailable = false;

          if (configRes.ok) {
            const config = (await configRes.json()) as {
              aiConfigured?: boolean;
            };
            hostedAiAvailable = config.aiConfigured === true;
          }

          setAiSettings(
            toGuestAiSettingsPublic(loadGuestAiSettings(), hostedAiAvailable),
          );

          return { ok: true as const };
        }

        const response = await fetch("/api/settings/ai", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: input.provider,
            apiKey: input.apiKey.trim() || undefined,
            fallbackEnabled: input.fallbackEnabled,
            clearApiKey: input.clearApiKey === true,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          return {
            ok: false as const,
            error: extractApiError(payload, t("aiSettings.saveFailed")),
          };
        }

        setAiSettings((await response.json()) as UserAiSettingsPublic);
        return { ok: true as const };
      } finally {
        setSavingAiSettings(false);
      }
    },
    [isGuest, t],
  );

  const clearAiSettings = useCallback(async () => {
    return saveAiSettings({
      provider: null,
      apiKey: "",
      fallbackEnabled: true,
      clearApiKey: true,
    });
  }, [saveAiSettings]);

  const getGuestAiSettingsPayload = useCallback(() => {
    const guestAi = loadGuestAiSettings();

    if (!guestAi.provider || !guestAi.apiKey) {
      return undefined;
    }

    return {
      provider: guestAi.provider,
      apiKey: guestAi.apiKey,
      fallbackEnabled: guestAi.fallbackEnabled,
    };
  }, []);

  return {
    isAuthenticated,
    isGuest,
    authLoading: !isLoaded,
    trackers,
    logs,
    loading,
    refreshing,
    emailConfigured,
    aiSettings,
    savingAiSettings,
    syncDialogOpen,
    syncing,
    fetchData,
    createTracker,
    updateTracker,
    deleteTracker,
    toggleTracker,
    reorderTrackers,
    runTracker,
    clearLogs: clearLogsAction,
    syncGuestTrackers,
    dismissGuestSync,
    saveAiSettings,
    clearAiSettings,
    getGuestAiSettingsPayload,
  };
}

export { extractApiError };
