"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LogScreenshotProps = {
  logId: string;
  screenshotPath: string | null;
  screenshotDataUrl?: string | null;
  label: string;
  onOpen?: () => void;
};

export function LogScreenshot({
  logId,
  screenshotPath,
  screenshotDataUrl,
  label,
  onOpen,
}: LogScreenshotProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!screenshotPath && !screenshotDataUrl) {
    return <span className="text-muted-foreground">{t("common.dash")}</span>;
  }

  const src = screenshotDataUrl ?? `/api/logs/${logId}/screenshot`;

  return (
    <>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onOpen?.();
          setOpen(true);
        }}
        className={cn(
          "group relative h-10 w-16 overflow-hidden rounded-md border border-border/60 bg-muted/30",
          "cursor-pointer transition-colors hover:border-primary/40 hover:ring-2 hover:ring-primary/20",
        )}
        aria-label={t("dashboard.logs.viewScreenshot", { label })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={t("dashboard.logs.screenshotFor", { label })}
          className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
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
              src={src}
              alt={t("dashboard.logs.fullScreenshotFor", { label })}
              className="h-auto w-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
