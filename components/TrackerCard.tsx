"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExternalLink,
  GripVertical,
  Loader2,
  Monitor,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import type { TrackerRecord } from "@/types/tracker";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate, formatFrequency } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

type TrackerCardProps = {
  tracker: TrackerRecord;
  runningState: { id: string; headed: boolean } | null;
  onToggle: (tracker: TrackerRecord) => void;
  onRun: (tracker: TrackerRecord, headed?: boolean) => void;
  onEdit: (tracker: TrackerRecord) => void;
  onDelete: (tracker: TrackerRecord) => void;
};

export function TrackerCard({
  tracker,
  runningState,
  onToggle,
  onRun,
  onEdit,
  onDelete,
}: TrackerCardProps) {
  const { t, locale } = useI18n();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tracker.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "h-full w-full",
        isDragging && "z-10 scale-[1.02] shadow-lg shadow-primary/10",
      )}
    >
      <Card className="group h-full min-w-0 cursor-default overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-200 ease-in-out hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-2">
            <button
              ref={setActivatorNodeRef}
              type="button"
              className="swiper-no-swiping mt-0.5 shrink-0 cursor-grab touch-none rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
              aria-label={t("dashboard.trackers.dragToReorder")}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="truncate text-base">
                  {tracker.targetDescription}
                </CardTitle>
                <Badge
                  variant={
                    tracker.mode === "guest"
                      ? "secondary"
                      : tracker.isActive
                        ? "success"
                        : "secondary"
                  }
                >
                  {tracker.mode === "guest"
                    ? t("dashboard.trackers.local")
                    : tracker.isActive
                      ? t("dashboard.trackers.active")
                      : t("dashboard.trackers.paused")}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                <a
                  href={tracker.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="swiper-no-swiping flex min-w-0 items-center gap-1 truncate transition-colors hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{tracker.url}</span>
                </a>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("dashboard.trackers.frequency")}
            </span>
            <span className="font-medium">
              {tracker.mode === "guest"
                ? t("dashboard.trackers.manualOnly")
                : formatFrequency(tracker.frequencyMinutes, locale)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">
              {t("dashboard.trackers.lastRun")}
            </span>
            <span className="truncate font-medium">
              {formatDate(tracker.lastRunAt, locale)}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1 pt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="swiper-no-swiping h-8 w-full"
                  onClick={() => onToggle(tracker)}
                  disabled={tracker.mode === "guest"}
                  aria-label={
                    tracker.isActive
                      ? t("dashboard.trackers.pauseTracker")
                      : t("dashboard.trackers.resumeTracker")
                  }
                >
                  {tracker.isActive ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {tracker.mode === "guest"
                  ? t("dashboard.trackers.schedulingRequiresSignIn")
                  : tracker.isActive
                    ? t("dashboard.trackers.pause")
                    : t("dashboard.trackers.resume")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="swiper-no-swiping h-8 w-full"
                  onClick={() => onRun(tracker, false)}
                  disabled={runningState !== null}
                  aria-label={t("dashboard.trackers.runNow")}
                >
                  {runningState && !runningState.headed ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("dashboard.trackers.runNow")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="swiper-no-swiping h-8 w-full"
                  onClick={() => onRun(tracker, true)}
                  disabled={runningState !== null}
                  aria-label={t("dashboard.trackers.runVisibleBrowser")}
                >
                  {runningState && runningState.headed ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Monitor className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("dashboard.trackers.runVisibleBrowser")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="swiper-no-swiping h-8 w-full"
                  onClick={() => onEdit(tracker)}
                  aria-label={t("dashboard.trackers.editTracker")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("dashboard.trackers.editTracker")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="swiper-no-swiping h-8 w-full"
                  onClick={() => onDelete(tracker)}
                  aria-label={t("dashboard.trackers.deleteTracker")}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("dashboard.trackers.deleteTracker")}</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
