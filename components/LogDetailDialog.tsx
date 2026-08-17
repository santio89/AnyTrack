"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink, ImageIcon } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAiModelWithProvider } from "@/lib/ai";
import { formatDate } from "@/lib/i18n/format";
import { formatScrapeErrorMessage } from "@/lib/scrape-hints";
import { cn } from "@/lib/utils";
import type { LogRecord } from "@/types/tracker";

type LogDetailDialogProps = {
  log: LogRecord | null;
  onClose: () => void;
};

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function LogDetailDialog({ log, onClose }: LogDetailDialogProps) {
  const { t, locale } = useI18n();
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  if (!log) {
    return null;
  }

  const status = log.error
    ? { label: t("status.error"), variant: "destructive" as const }
    : log.extractedValue
      ? { label: t("status.success"), variant: "success" as const }
      : { label: t("status.noData"), variant: "warning" as const };

  const screenshotSrc =
    log.screenshotDataUrl ??
    (log.screenshotPath ? `/api/logs/${log.id}/screenshot` : null);
  const trackerLabel =
    log.trackerDescription ??
    t("common.trackerNumber", { id: log.trackerId });

  return (
    <Dialog open={log !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle>{t("dashboard.logs.detailTitle")}</DialogTitle>
              <DialogDescription>{trackerLabel}</DialogDescription>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-5">
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailField label={t("dashboard.logs.time")}>
              {formatDate(new Date(log.createdAt), locale)}
            </DetailField>
            <DetailField label={t("dashboard.logs.storage")}>
              {log.mode === "guest"
                ? t("dashboard.logs.storageGuest")
                : t("dashboard.logs.storageCloud")}
            </DetailField>
            <DetailField label={t("dashboard.logs.target")}>
              {trackerLabel}
            </DetailField>
            <DetailField label={t("dashboard.logs.trackerUrl")}>
              {log.trackerUrl ? (
                <a
                  href={log.trackerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                >
                  {log.trackerUrl}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                t("common.dash")
              )}
            </DetailField>
            <div className="sm:col-span-2">
              <DetailField label={t("dashboard.logs.extractedValue")}>
                {log.error ? (
                  <span className="text-destructive">{t("common.dash")}</span>
                ) : log.extractedValue ? (
                  <p className="whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/20 px-3 py-2 font-medium">
                    {log.extractedValue}
                  </p>
                ) : (
                  t("common.dash")
                )}
              </DetailField>
            </div>
            <DetailField label={t("dashboard.logs.model")}>
              {log.model
                ? formatAiModelWithProvider(log.model, (model, provider) =>
                    t("dashboard.logs.modelWithProvider", { model, provider }),
                  )
                : t("common.dash")}
            </DetailField>
            <DetailField label={t("dashboard.logs.logId")}>{log.id}</DetailField>
            {log.error && (
              <div className="sm:col-span-2">
                <DetailField label={t("dashboard.logs.error")}>
                  <p className="whitespace-pre-wrap break-words rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                    {formatScrapeErrorMessage(log.error)}
                  </p>
                </DetailField>
              </div>
            )}
          </dl>

          {screenshotSrc && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                {t("dashboard.logs.screenshot")}
              </div>
              <button
                type="button"
                onClick={() => setScreenshotOpen(true)}
                className={cn(
                  "group relative h-24 w-40 overflow-hidden rounded-lg border border-border/60 bg-muted/20",
                  "cursor-pointer transition-colors hover:border-primary/40 hover:ring-2 hover:ring-primary/20",
                )}
                aria-label={t("dashboard.logs.viewScreenshot", {
                  label: trackerLabel,
                })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotSrc}
                  alt={t("dashboard.logs.screenshotFor", { label: trackerLabel })}
                  className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
                />
              </button>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.logs.clickToEnlarge")}
              </p>

              <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
                <DialogContent
                  className="max-w-4xl gap-0 overflow-hidden p-0"
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  <DialogHeader className="border-b border-border/60 px-6 py-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      {t("dashboard.logs.scrapeScreenshot")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="relative max-h-[75vh] w-full overflow-auto bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotSrc}
                      alt={t("dashboard.logs.fullScreenshotFor", {
                        label: trackerLabel,
                      })}
                      className="h-auto w-full"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
