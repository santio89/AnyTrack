"use client";

import { SignInButton } from "@clerk/nextjs";
import { CloudUpload, HardDrive } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";

type GuestModeBannerProps = {
  isGuest: boolean;
};

export function GuestModeBanner({ isGuest }: GuestModeBannerProps) {
  const { t } = useI18n();

  if (!isGuest) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-foreground">{t("guest.title")}</p>
            <p className="text-muted-foreground">{t("guest.description")}</p>
          </div>
        </div>
        <SignInButton mode="modal">
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-500/40 bg-background text-foreground hover:bg-amber-100/60 dark:hover:bg-amber-500/20"
          >
            <CloudUpload className="h-4 w-4" />
            {t("auth.signInToSync")}
          </Button>
        </SignInButton>
      </div>
    </div>
  );
}
