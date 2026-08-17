"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReferenceImageValue = {
  data: string;
  mimeType: string;
  previewUrl: string;
};

type ReferenceImageInputProps = {
  value: ReferenceImageValue | null;
  onChange: (value: ReferenceImageValue | null) => void;
  existingSrc?: string | null;
  onClearExisting?: () => void;
  capturePaste?: boolean;
};

async function fileToReferenceValue(file: File): Promise<ReferenceImageValue> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

  return {
    data: dataUrl,
    mimeType: file.type || "image/png",
    previewUrl: dataUrl,
  };
}

function getImageFromClipboard(event: ClipboardEvent) {
  const items = event.clipboardData?.items;
  if (items) {
    const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();
    if (file) {
      return file;
    }
  }

  const files = event.clipboardData?.files;
  if (files?.length) {
    return Array.from(files).find((file) => file.type.startsWith("image/")) ?? null;
  }

  return null;
}

export function ReferenceImageInput({
  value,
  onChange,
  existingSrc = null,
  onClearExisting,
  capturePaste = false,
}: ReferenceImageInputProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const previewSrc = value?.previewUrl ?? existingSrc;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files).find((item) => item.type.startsWith("image/"));

      if (!file) {
        return;
      }

      if (existingSrc && !value) {
        onClearExisting?.();
      }

      onChange(await fileToReferenceValue(file));
    },
    [existingSrc, onChange, onClearExisting, value],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent | React.ClipboardEvent<HTMLDivElement>) => {
      const file = getImageFromClipboard(event as ClipboardEvent);

      if (!file) {
        return;
      }

      event.preventDefault();
      void handleFiles([file]);
    },
    [handleFiles],
  );

  useEffect(() => {
    if (!capturePaste) {
      return;
    }

    function onDocumentPaste(event: ClipboardEvent) {
      handlePaste(event);
    }

    document.addEventListener("paste", onDocumentPaste);
    return () => document.removeEventListener("paste", onDocumentPaste);
  }, [capturePaste, handlePaste]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium leading-none">
          {t("dashboard.referenceImage.label")}{" "}
          <span className="font-normal text-muted-foreground">
            {t("dashboard.referenceImage.optional")}
          </span>
        </span>
        {previewSrc && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            onClick={() => {
              if (value) {
                onChange(null);
              } else if (existingSrc) {
                onClearExisting?.();
              }
            }}
          >
            <X className="h-3.5 w-3.5" />
            {t("dashboard.referenceImage.remove")}
          </Button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={t("dashboard.referenceImage.pasteDropClick")}
        onPaste={capturePaste ? undefined : handlePaste}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) {
              void handleFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />

        {previewSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt={t("dashboard.referenceImage.previewAlt")}
              className="max-h-32 w-full rounded-md object-contain"
            />
            <p className="text-xs text-muted-foreground">
              {t("dashboard.referenceImage.clickToReplace")}
            </p>
          </>
        ) : (
          <>
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("dashboard.referenceImage.pasteDropClick")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
