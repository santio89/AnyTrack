"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Loader2,
  Plus,
  Radar,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useI18n } from "@/components/I18nProvider";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GuestModeBanner } from "@/components/GuestModeBanner";
import { LogDetailDialog } from "@/components/LogDetailDialog";
import { LogScreenshot } from "@/components/LogScreenshot";
import {
  ReferenceImageInput,
  type ReferenceImageValue,
} from "@/components/ReferenceImageInput";
import { SyncGuestDialog } from "@/components/SyncGuestDialog";
import { TrackerCarousel } from "@/components/TrackerCarousel";
import { useToast } from "@/components/ToastProvider";
import { extractApiError, useAnyTrack } from "@/hooks/use-anytrack";
import { useRunningTrackers } from "@/hooks/use-running-trackers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatScrapeErrorMessage } from "@/lib/scrape-hints";
import { formatDate, getFrequencyOptions } from "@/lib/i18n/format";
import { trackerHasReference } from "@/lib/tracker-records";
import { cn } from "@/lib/utils";
import type { LogRecord, TrackerRecord } from "@/types/tracker";

type DashboardLogEntry =
  | {
      kind: "running";
      id: string;
      trackerId: string;
      startedAt: number;
      trackerDescription: string | null;
    }
  | {
      kind: "log";
      log: LogRecord;
    };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};


function TruncatedWithTooltip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("block truncate", className)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-sm whitespace-pre-wrap break-words text-left"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function Dashboard() {
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const frequencyOptions = useMemo(
    () => getFrequencyOptions(locale),
    [locale],
  );
  const [logTrackerFilter, setLogTrackerFilter] = useState<string>("all");
  const {
    isGuest,
    isAuthenticated,
    authLoading,
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
    clearLogs,
    syncGuestTrackers,
    dismissGuestSync,
    saveAiSettings,
    clearAiSettings,
    getGuestAiSettingsPayload,
  } = useAnyTrack(logTrackerFilter);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const pollDashboardData = useCallback(() => fetchData(true), [fetchData]);
  const {
    runningTrackers,
    getTrackerRunningState,
    markRunning,
    clearRunning,
    syncRunningState,
  } = useRunningTrackers({
    isGuest,
    isAuthenticated,
    isLoaded: !authLoading,
    logs,
    onPoll: pollDashboardData,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [url, setUrl] = useState("");
  const [targetDescription, setTargetDescription] = useState("");
  const [frequencyMinutes, setFrequencyMinutes] = useState("60");
  const [notifyOnChange, setNotifyOnChange] = useState(false);
  const [notifyOnFailure, setNotifyOnFailure] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [referenceImage, setReferenceImage] = useState<ReferenceImageValue | null>(
    null,
  );
  const [clearLogsOpen, setClearLogsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [trackerPendingDelete, setTrackerPendingDelete] =
    useState<TrackerRecord | null>(null);
  const [deleteClearLogs, setDeleteClearLogs] = useState(true);
  const [deletingTracker, setDeletingTracker] = useState(false);
  const [editingTracker, setEditingTracker] = useState<TrackerRecord | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editTargetDescription, setEditTargetDescription] = useState("");
  const [editFrequencyMinutes, setEditFrequencyMinutes] = useState("60");
  const [editNotifyOnChange, setEditNotifyOnChange] = useState(false);
  const [editNotifyOnFailure, setEditNotifyOnFailure] = useState(false);
  const [editNotificationEmail, setEditNotificationEmail] = useState("");
  const [editReferenceImage, setEditReferenceImage] =
    useState<ReferenceImageValue | null>(null);
  const [removeEditReference, setRemoveEditReference] = useState(false);
  const [updatingTracker, setUpdatingTracker] = useState(false);
  const [suggestingTargets, setSuggestingTargets] = useState(false);
  const [targetSuggestions, setTargetSuggestions] = useState<string[]>([]);

  async function handleCreateTracker(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const result = await createTracker({
        url,
        targetDescription,
        frequencyMinutes: Number(frequencyMinutes),
        notifyOnChange,
        notifyOnFailure,
        notificationEmail,
        referenceImage,
      });

      if (result.ok) {
        setUrl("");
        setTargetDescription("");
        setFrequencyMinutes("60");
        setNotifyOnChange(false);
        setNotifyOnFailure(false);
        setNotificationEmail("");
        setReferenceImage(null);
        setTargetSuggestions([]);
        setDialogOpen(false);
        toast(t("toast.trackerCreated"), "success");
      } else {
        toast(result.error, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleTracker(tracker: TrackerRecord) {
    const result = await toggleTracker(tracker);

    if (result.ok && "unsupported" in result) {
      toast(t("toast.signInForScheduling"), "info");
      return;
    }

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }

    toast(
      tracker.isActive ? t("toast.trackerPaused") : t("toast.trackerResumed"),
      "success",
    );
  }

  async function confirmDeleteTracker() {
    if (!trackerPendingDelete) {
      return;
    }

    setDeletingTracker(true);
    try {
      const result = await deleteTracker(trackerPendingDelete, {
        clearLogs: deleteClearLogs,
      });
      if (result.ok) {
        if (deleteClearLogs && logTrackerFilter === trackerPendingDelete.id) {
          setLogTrackerFilter("all");
        }
        setTrackerPendingDelete(null);
        setDeleteClearLogs(true);
        toast(
          deleteClearLogs
            ? t("toast.trackerDeleted")
            : t("toast.trackerArchived"),
          "success",
        );
      } else {
        toast(result.error, "error");
      }
    } finally {
      setDeletingTracker(false);
    }
  }

  async function handleClearLogs() {
    setClearingLogs(true);
    try {
      const result = await clearLogs(
        logTrackerFilter === "all" ? undefined : logTrackerFilter,
      );
      if (result.ok) {
        setClearLogsOpen(false);
        toast(t("toast.logsCleared"), "success");
      } else {
        toast(result.error, "error");
      }
    } finally {
      setClearingLogs(false);
    }
  }

  const logFilterTrackers = useMemo(() => {
    const options = new Map<string, string>();

    for (const tracker of trackers) {
      options.set(tracker.id, tracker.targetDescription);
    }

    for (const log of logs) {
      if (!options.has(log.trackerId)) {
        options.set(
          log.trackerId,
          log.trackerDescription ?? t("common.trackerNumber", { id: log.trackerId }),
        );
      }
    }

    return Array.from(options.entries())
      .map(([id, targetDescription]) => ({ id, targetDescription }))
      .sort((a, b) => a.targetDescription.localeCompare(b.targetDescription));
  }, [trackers, logs, t]);

  const selectedLogTracker =
    logTrackerFilter === "all"
      ? null
      : logFilterTrackers.find((tracker) => tracker.id === logTrackerFilter) ??
        null;

  function openEditTracker(tracker: TrackerRecord) {
    setEditingTracker(tracker);
    setEditUrl(tracker.url);
    setEditTargetDescription(tracker.targetDescription);
    setEditFrequencyMinutes(String(tracker.frequencyMinutes));
    setEditNotifyOnChange(tracker.notifyOnChange);
    setEditNotifyOnFailure(tracker.notifyOnFailure);
    setEditNotificationEmail(tracker.notificationEmail ?? "");
    setEditReferenceImage(null);
    setRemoveEditReference(false);
  }

  function closeEditTracker() {
    setEditingTracker(null);
    setEditReferenceImage(null);
    setRemoveEditReference(false);
  }

  async function handleUpdateTracker(event: React.FormEvent) {
    event.preventDefault();
    if (!editingTracker) {
      return;
    }

    setUpdatingTracker(true);

    try {
      const result = await updateTracker(editingTracker, {
        url: editUrl,
        targetDescription: editTargetDescription,
        frequencyMinutes: Number(editFrequencyMinutes),
        notifyOnChange: editNotifyOnChange,
        notifyOnFailure: editNotifyOnFailure,
        notificationEmail: editNotificationEmail,
        referenceImage: editReferenceImage,
        removeReferenceImage: removeEditReference,
      });

      if (result.ok) {
        closeEditTracker();
        toast(t("toast.trackerUpdated"), "success");
      } else {
        toast(result.error, "error");
      }
    } finally {
      setUpdatingTracker(false);
    }
  }

  async function handleReorder(newOrder: TrackerRecord[]) {
    const result = await reorderTrackers(newOrder);
    if (!result.ok) {
      toast(result.error, "error");
    }
  }

  async function handleRunTracker(tracker: TrackerRecord, headed = false) {
    markRunning(tracker.id, headed);
    let keepRunning = false;

    try {
      const result = await runTracker(tracker, headed);

      if (result.ok) {
        toast(
          headed ? t("toast.visibleScrapeFinished") : t("toast.scrapeFinished"),
          "success",
        );
      } else if ("alreadyRunning" in result && result.alreadyRunning) {
        keepRunning = true;
        await syncRunningState();
      } else {
        toast(result.error, "error");
      }
    } finally {
      if (!keepRunning) {
        clearRunning(tracker.id);
      }
      await pollDashboardData();
    }
  }

  async function suggestTargets() {
    if (!url.trim()) {
      toast(t("toast.enterUrlFirst"), "error");
      return;
    }

    setSuggestingTargets(true);
    setTargetSuggestions([]);

    try {
      const response = await fetch("/api/ai/suggest-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          aiSettings: getGuestAiSettingsPayload(),
        }),
      });

      const payload = (await response.json()) as {
        suggestions?: string[];
        metadataLimited?: boolean;
        error?: string;
      };

      if (!response.ok) {
        toast(extractApiError(payload, t("toast.suggestFailed")), "error");
        return;
      }

      setTargetSuggestions(payload.suggestions ?? []);
      if (payload.metadataLimited) {
        toast(t("toast.suggestBlocked"), "info");
      } else if (!payload.suggestions?.length) {
        toast(t("toast.noSuggestions"), "info");
      }
    } catch {
      toast(t("toast.suggestFailed"), "error");
    } finally {
      setSuggestingTargets(false);
    }
  }

  const activeCount = isGuest
    ? trackers.length
    : trackers.filter((tracker) => tracker.isActive).length;
  const successRate =
    logs.length > 0
      ? Math.round(
          (logs.filter((log) => !log.error && log.extractedValue).length /
            logs.length) *
            100,
        )
      : null;
  const dataLoading = loading;
  const dash = t("common.dash");
  const formatCount = (count: number) => (count === 0 ? dash : count);
  const logTableEntries = useMemo((): DashboardLogEntry[] => {
    const trackerById = new Map(trackers.map((tracker) => [tracker.id, tracker]));

    const runningEntries: DashboardLogEntry[] = runningTrackers
      .filter(
        (run) =>
          logTrackerFilter === "all" || run.id === logTrackerFilter,
      )
      .map((run) => ({
        kind: "running" as const,
        id: `running-${run.id}`,
        trackerId: run.id,
        startedAt: run.startedAt,
        trackerDescription:
          trackerById.get(run.id)?.targetDescription ?? null,
      }));

    const completedEntries: DashboardLogEntry[] = logs.map((log) => ({
      kind: "log" as const,
      log,
    }));

    return [...runningEntries, ...completedEntries];
  }, [logTrackerFilter, logs, runningTrackers, trackers]);
  const hasLogTableEntries = logTableEntries.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-violet-600/20 blur-[128px]" />
        <div className="absolute -right-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-purple-600/20 blur-[128px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="neo-grid-bg absolute inset-0 opacity-60" />
      </div>

      <DashboardHeader
        onAddTracker={() => setDialogOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="relative mx-auto max-w-7xl space-y-8 px-6 py-8">
        <GuestModeBanner isGuest={isGuest && !dataLoading} />
        <SyncGuestDialog
          open={syncDialogOpen}
          syncing={syncing}
          onSync={() => void syncGuestTrackers().then((result) => {
            if (result.ok) {
              toast(t("guest.imported"), "success");
            } else {
              toast(result.error, "error");
            }
          })}
          onDismiss={dismissGuestSync}
        />
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-3"
        >
          {[
            {
              label: t("dashboard.stats.activeTrackers"),
              value: formatCount(activeCount),
              icon: Activity,
              color: "text-primary",
            },
            {
              label: t("dashboard.stats.totalTrackers"),
              value: formatCount(trackers.length),
              icon: Radar,
              color: "text-primary/80",
            },
            {
              label: t("dashboard.stats.successRate"),
              value: successRate != null ? `${successRate}%` : dash,
              icon: RefreshCw,
              color: "text-primary/60",
            },
          ].map((stat) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-200 ease-in-out hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-md bg-primary/10 p-3 ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="flex min-h-8 items-center text-2xl font-bold">
                      {dataLoading ? dash : stat.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("dashboard.trackers.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.trackers.subtitle")}
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setReferenceImage(null);
                setTargetSuggestions([]);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("dashboard.trackers.addTracker")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={(e) => void handleCreateTracker(e)}>
                  <DialogHeader>
                    <DialogTitle>{t("dashboard.trackers.createTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("dashboard.trackers.createDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="url">{t("dashboard.trackers.targetUrl")}</Label>
                      <Input
                        id="url"
                        type="url"
                        placeholder={t("dashboard.trackers.urlPlaceholder")}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="description">{t("dashboard.trackers.whatToExtract")}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          disabled={!url.trim() || suggestingTargets}
                          onClick={() => void suggestTargets()}
                        >
                          {suggestingTargets ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {t("dashboard.trackers.aiSuggest")}
                        </Button>
                      </div>
                      <Input
                        id="description"
                        placeholder={t("dashboard.trackers.extractPlaceholder")}
                        value={targetDescription}
                        onChange={(e) => setTargetDescription(e.target.value)}
                        required
                      />
                      {targetSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {targetSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
                              onClick={() => setTargetDescription(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <ReferenceImageInput
                      value={referenceImage}
                      onChange={setReferenceImage}
                      capturePaste={dialogOpen}
                    />
                    <div className="grid gap-2">
                      <Label>{t("dashboard.trackers.checkFrequency")}</Label>
                      {isGuest ? (
                        <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                          {t("dashboard.trackers.guestFrequency")}
                        </p>
                      ) : (
                        <Select
                          value={frequencyMinutes}
                          onValueChange={setFrequencyMinutes}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencyOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={String(option.value)}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {!isGuest && (
                    <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-border"
                          checked={notifyOnChange}
                          disabled={!emailConfigured}
                          onChange={(event) => setNotifyOnChange(event.target.checked)}
                        />
                        <span>
                          <span className="font-medium">{t("dashboard.notifications.emailOnChange")}</span>
                          <span className="mt-1 block text-muted-foreground">
                            {emailConfigured
                              ? t("dashboard.notifications.emailOnChangeHint")
                              : t("dashboard.notifications.emailNotConfigured")}
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-border"
                          checked={notifyOnFailure}
                          disabled={!emailConfigured}
                          onChange={(event) => setNotifyOnFailure(event.target.checked)}
                        />
                        <span>
                          <span className="font-medium">{t("dashboard.notifications.emailOnFailure")}</span>
                          <span className="mt-1 block text-muted-foreground">
                            {t("dashboard.notifications.emailOnFailureHint")}
                          </span>
                        </span>
                      </label>
                      {(notifyOnChange || notifyOnFailure) && (
                        <div className="grid gap-2">
                          <Label htmlFor="notification-email">{t("dashboard.notifications.notificationEmail")}</Label>
                          <Input
                            id="notification-email"
                            type="email"
                            placeholder={t("dashboard.notifications.emailPlaceholder")}
                            value={notificationEmail}
                            onChange={(event) => setNotificationEmail(event.target.value)}
                            required
                          />
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                  <DialogFooter className="gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={submitting}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("common.creating")}
                        </>
                      ) : (
                        t("dashboard.trackers.createTracker")
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {dataLoading ? (
            <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : trackers.length === 0 ? (
            <Card className="border border-dashed border-border/60 bg-card/30">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Radar className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">{t("dashboard.trackers.emptyTitle")}</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {t("dashboard.trackers.emptyDescription")}
                </p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t("dashboard.trackers.addTracker")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TrackerCarousel
              trackers={trackers}
              getTrackerRunningState={getTrackerRunningState}
              onReorder={handleReorder}
              onToggle={(item) => void handleToggleTracker(item)}
              onRun={(tracker, headed) => void handleRunTracker(tracker, headed)}
              onEdit={openEditTracker}
              onDelete={(tracker) => {
                setDeleteClearLogs(true);
                setTrackerPendingDelete(tracker);
              }}
            />
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{t("dashboard.logs.title")}</CardTitle>
                  <CardDescription>{t("dashboard.logs.subtitle")}</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={logTrackerFilter} onValueChange={setLogTrackerFilter}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                      <SelectValue placeholder={t("dashboard.logs.allTrackers")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.logs.allTrackers")}</SelectItem>
                      {logFilterTrackers.map((tracker) => (
                        <SelectItem key={tracker.id} value={String(tracker.id)}>
                          {tracker.targetDescription}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        disabled={refreshing}
                        onClick={() => void fetchData(true)}
                        aria-label={t("dashboard.logs.refresh")}
                      >
                        <motion.span
                          className="flex items-center justify-center"
                          animate={{ rotate: refreshing ? 360 : 0 }}
                          transition={
                            refreshing
                              ? { repeat: Infinity, duration: 0.65, ease: "linear" }
                              : { duration: 0 }
                          }
                        >
                          <RefreshCw className="h-4 w-4" />
                        </motion.span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("dashboard.logs.refresh")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        disabled={logs.length === 0}
                        onClick={() => setClearLogsOpen(true)}
                        aria-label={t("dashboard.logs.clearLogs")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("dashboard.logs.clearLogs")}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent
              className={cn(
                "transition-opacity duration-200",
                refreshing && "pointer-events-none opacity-60",
              )}
            >
              {dataLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !hasLogTableEntries ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {logTrackerFilter === "all"
                    ? t("dashboard.logs.emptyAll")
                    : t("dashboard.logs.emptyFiltered")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboard.logs.time")}</TableHead>
                      <TableHead>{t("dashboard.logs.screenshot")}</TableHead>
                      <TableHead>{t("dashboard.logs.target")}</TableHead>
                      <TableHead>{t("dashboard.logs.extractedValue")}</TableHead>
                      <TableHead>{t("dashboard.logs.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logTableEntries.map((entry) => {
                      if (entry.kind === "running") {
                        return (
                          <TableRow key={entry.id} className="bg-muted/20">
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDate(new Date(entry.startedAt), locale)}
                            </TableCell>
                            <TableCell>{dash}</TableCell>
                            <TableCell className="max-w-[200px]">
                              <TruncatedWithTooltip
                                text={
                                  entry.trackerDescription ??
                                  t("common.trackerNumber", {
                                    id: entry.trackerId,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell className="max-w-[240px] font-medium text-muted-foreground">
                              {dash}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {t("status.running")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      const log = entry.log;

                      return (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer"
                          tabIndex={0}
                          role="button"
                          onClick={() => setSelectedLog(log)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedLog(log);
                            }
                          }}
                        >
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(new Date(log.createdAt), locale)}
                          </TableCell>
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <LogScreenshot
                              logId={log.id}
                              screenshotPath={log.screenshotPath}
                              screenshotDataUrl={log.screenshotDataUrl}
                              label={
                                log.trackerDescription ??
                                t("common.trackerNumber", { id: log.trackerId })
                              }
                              onOpen={() => setSelectedLog(null)}
                            />
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <TruncatedWithTooltip
                              text={
                                log.trackerDescription ??
                                t("common.trackerNumber", { id: log.trackerId })
                              }
                            />
                          </TableCell>
                          <TableCell className="max-w-[240px] font-medium">
                            {log.error ? (
                              <span className="text-destructive">{t("common.dash")}</span>
                            ) : log.extractedValue ? (
                              <TruncatedWithTooltip text={log.extractedValue} />
                            ) : (
                              t("common.dash")
                            )}
                          </TableCell>
                          <TableCell>
                            {log.error ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="destructive"
                                    className="cursor-help"
                                  >
                                    {t("status.error")}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-sm whitespace-pre-wrap break-words text-left"
                                >
                                  {formatScrapeErrorMessage(log.error)}
                                </TooltipContent>
                              </Tooltip>
                            ) : log.extractedValue ? (
                              <Badge variant="success">{t("status.success")}</Badge>
                            ) : (
                              <Badge variant="warning">{t("status.noData")}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.section>

        <LogDetailDialog
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />

        <Dialog
          open={editingTracker !== null}
          onOpenChange={(open) => {
            if (!open) {
              closeEditTracker();
            }
          }}
        >
          <DialogContent>
            <form onSubmit={(e) => void handleUpdateTracker(e)}>
              <DialogHeader>
                <DialogTitle>{t("dashboard.trackers.editTitle")}</DialogTitle>
                <DialogDescription>
                  {t("dashboard.trackers.editDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-url">{t("dashboard.trackers.targetUrl")}</Label>
                  <Input
                    id="edit-url"
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">{t("dashboard.trackers.whatToExtract")}</Label>
                  <Input
                    id="edit-description"
                    value={editTargetDescription}
                    onChange={(e) => setEditTargetDescription(e.target.value)}
                    required
                  />
                </div>
                <ReferenceImageInput
                  value={editReferenceImage}
                  onChange={setEditReferenceImage}
                  existingSrc={
                    editingTracker &&
                    trackerHasReference(editingTracker) &&
                    !removeEditReference &&
                    !editReferenceImage
                      ? editingTracker.mode === "guest" &&
                        editingTracker.referenceImage
                        ? `data:${editingTracker.referenceImage.mimeType};base64,${editingTracker.referenceImage.data}`
                        : `/api/trackers/${editingTracker.dbId}/reference`
                      : null
                  }
                  onClearExisting={() => setRemoveEditReference(true)}
                  capturePaste={editingTracker !== null}
                />
                <div className="grid gap-2">
                  <Label>{t("dashboard.trackers.checkFrequency")}</Label>
                  {isGuest ? (
                    <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      {t("dashboard.trackers.guestFrequency")}
                    </p>
                  ) : (
                    <Select
                      value={editFrequencyMinutes}
                      onValueChange={setEditFrequencyMinutes}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {!isGuest && (
                <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      checked={editNotifyOnChange}
                      disabled={!emailConfigured}
                      onChange={(event) => setEditNotifyOnChange(event.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{t("dashboard.notifications.emailOnChange")}</span>
                      <span className="mt-1 block text-muted-foreground">
                        {emailConfigured
                          ? t("dashboard.notifications.emailOnChangeHint")
                          : t("dashboard.notifications.emailNotConfigured")}
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      checked={editNotifyOnFailure}
                      disabled={!emailConfigured}
                      onChange={(event) => setEditNotifyOnFailure(event.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{t("dashboard.notifications.emailOnFailure")}</span>
                      <span className="mt-1 block text-muted-foreground">
                        {t("dashboard.notifications.emailOnFailureHint")}
                      </span>
                    </span>
                  </label>
                  {(editNotifyOnChange || editNotifyOnFailure) && (
                    <div className="grid gap-2">
                      <Label htmlFor="edit-notification-email">{t("dashboard.notifications.notificationEmail")}</Label>
                      <Input
                        id="edit-notification-email"
                        type="email"
                        placeholder={t("dashboard.notifications.emailPlaceholder")}
                        value={editNotificationEmail}
                        onChange={(event) => setEditNotificationEmail(event.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditTracker}
                  disabled={updatingTracker}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={updatingTracker}>
                  {updatingTracker ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.saving")}
                    </>
                  ) : (
                    t("dashboard.trackers.saveChanges")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={trackerPendingDelete !== null}
          onOpenChange={(open) => {
            if (!open) {
              setTrackerPendingDelete(null);
              setDeleteClearLogs(true);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dashboard.delete.title")}</DialogTitle>
              <DialogDescription>
                {deleteClearLogs ? (
                  <>
                    {t("dashboard.delete.withLogsBefore")}{" "}
                    <span className="font-medium text-foreground">
                      {trackerPendingDelete?.targetDescription}
                    </span>{" "}
                    {t("dashboard.delete.withLogsAfter")}
                  </>
                ) : (
                  <>
                    {t("dashboard.delete.keepLogsBefore")}{" "}
                    <span className="font-medium text-foreground">
                      {trackerPendingDelete?.targetDescription}
                    </span>{" "}
                    {t("dashboard.delete.keepLogsAfter")}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 px-3 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                checked={deleteClearLogs}
                onChange={(event) => setDeleteClearLogs(event.target.checked)}
              />
              <span>
                <span className="font-medium text-foreground">
                  {t("dashboard.delete.alsoDeleteLogs")}
                </span>
                <span className="mt-1 block text-muted-foreground">
                  {t("dashboard.delete.keepHistoryHint")}
                </span>
              </span>
            </label>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTrackerPendingDelete(null)}
                disabled={deletingTracker}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => void confirmDeleteTracker()}
                disabled={deletingTracker}
              >
                {deletingTracker ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.deleting")}
                  </>
                ) : (
                  t("dashboard.delete.deleteTracker")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={clearLogsOpen} onOpenChange={setClearLogsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedLogTracker
                  ? t("dashboard.logs.clearTrackerTitle", {
                      name: selectedLogTracker.targetDescription,
                    })
                  : t("dashboard.logs.clearAllTitle")}
              </DialogTitle>
              <DialogDescription>
                {selectedLogTracker
                  ? t("dashboard.logs.clearTrackerDescription")
                  : t("dashboard.logs.clearAllDescription")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setClearLogsOpen(false)}
                disabled={clearingLogs}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleClearLogs()}
                disabled={clearingLogs}
              >
                {clearingLogs ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.clearing")}
                  </>
                ) : selectedLogTracker ? (
                  t("dashboard.logs.clearTracker")
                ) : (
                  t("dashboard.logs.clearAll")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={aiSettings}
          saving={savingAiSettings}
          onSave={async (input) => {
            const result = await saveAiSettings(input);

            if (result.ok) {
              toast(t("aiSettings.saved"), "success");
            } else {
              toast(result.error ?? t("aiSettings.saveFailed"), "error");
            }

            return result;
          }}
          onClear={async () => {
            const result = await clearAiSettings();

            if (result.ok) {
              toast(t("aiSettings.keyRemoved"), "success");
            } else {
              toast(result.error ?? t("aiSettings.removeFailed"), "error");
            }

            return result;
          }}
        />
      </main>
    </div>
    </TooltipProvider>
  );
}
