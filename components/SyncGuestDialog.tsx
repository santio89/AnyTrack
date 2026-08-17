"use client";

import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SyncGuestDialogProps = {
  open: boolean;
  syncing: boolean;
  onSync: () => void;
  onDismiss: () => void;
};

export function SyncGuestDialog({
  open,
  syncing,
  onSync,
  onDismiss,
}: SyncGuestDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("guest.syncTitle")}</DialogTitle>
          <DialogDescription>{t("guest.syncDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDismiss} disabled={syncing}>
            {t("guest.notNow")}
          </Button>
          <Button type="button" onClick={onSync} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("guest.syncing")}
              </>
            ) : (
              t("guest.import")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
