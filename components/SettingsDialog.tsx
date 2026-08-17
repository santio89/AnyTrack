"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Moon, Sun } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import type { UserAiProvider, UserAiSettingsPublic } from "@/types/ai-settings";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: UserAiSettingsPublic | null;
  saving?: boolean;
  onSave: (input: {
    provider: UserAiProvider | null;
    apiKey: string;
    fallbackEnabled: boolean;
    clearApiKey?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onClear: () => Promise<{ ok: boolean; error?: string }>;
};

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

type SettingsDialogBodyProps = Omit<SettingsDialogProps, "open">;

function SettingsDialogBody({
  onOpenChange,
  settings,
  saving = false,
  onSave,
  onClear,
}: SettingsDialogBodyProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [provider, setProvider] = useState<UserAiProvider>(
    settings?.provider ?? "openai",
  );
  const [apiKey, setApiKey] = useState("");
  const [fallbackEnabled, setFallbackEnabled] = useState(
    settings?.fallbackEnabled ?? true,
  );

  async function handleSave() {
    const result = await onSave({
      provider,
      apiKey,
      fallbackEnabled,
    });

    if (result.ok) {
      setApiKey("");
    }
  }

  async function handleClear() {
    const result = await onClear();

    if (result.ok) {
      setApiKey("");
    }
  }

  const hasStoredKey = settings?.hasApiKey ?? false;
  const hostedAiAvailable = settings?.hostedAiAvailable ?? false;

  function languageButton(nextLocale: Locale, label: string) {
    const active = locale === nextLocale;

    return (
      <Button
        type="button"
        variant={active ? "default" : "outline"}
        size="sm"
        className="flex-1"
        onClick={() => setLocale(nextLocale)}
      >
        {label}
      </Button>
    );
  }

  return (
    <DialogContent className="max-h-[90vh] max-w-lg gap-0 overflow-hidden p-0">
      <DialogHeader className="border-b border-border/60 px-6 py-4">
        <DialogTitle>{t("settings.title")}</DialogTitle>
        <DialogDescription>{t("settings.description")}</DialogDescription>
      </DialogHeader>

      <div className="max-h-[calc(90vh-9rem)] space-y-6 overflow-y-auto px-6 py-5">
        <SettingsSection title={t("settings.language")}>
          <div className="flex gap-2">
            {languageButton("en", t("language.english"))}
            {languageButton("es", t("language.spanish"))}
          </div>
        </SettingsSection>

        <SettingsSection title={t("settings.appearance")}>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" />
              {t("settings.themeLight")}
            </Button>
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" />
              {t("settings.themeDark")}
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title={t("settings.ai")}>
          <div className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-4">
            <p className="text-xs text-muted-foreground">
              {t("aiSettings.description")}
            </p>

            <div className="grid gap-2">
              <Label htmlFor="ai-provider">{t("aiSettings.provider")}</Label>
              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as UserAiProvider)}
              >
                <SelectTrigger id="ai-provider">
                  <SelectValue placeholder={t("aiSettings.selectProvider")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">{t("aiSettings.openai")}</SelectItem>
                  <SelectItem value="openrouter">
                    {t("aiSettings.openrouter")}
                  </SelectItem>
                  <SelectItem value="gateway">{t("aiSettings.gateway")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(`aiSettings.providers.${provider}`)}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ai-api-key">
                {t("aiSettings.apiKey")}
                {hasStoredKey && (
                  <span className="font-normal text-primary">
                    {" "}
                    {t("aiSettings.savedSuffix")}
                  </span>
                )}
              </Label>
              <Input
                id="ai-api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  hasStoredKey
                    ? t("aiSettings.enterToReplace")
                    : t("aiSettings.pasteKey")
                }
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              {hasStoredKey && (
                <p className="text-xs text-muted-foreground">
                  {t("aiSettings.keepKeyHint")}
                </p>
              )}
            </div>

            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border border-border/60 px-3 py-3 text-sm",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                checked={fallbackEnabled}
                disabled={!hostedAiAvailable}
                onChange={(event) => setFallbackEnabled(event.target.checked)}
              />
              <span>
                <span className="font-medium text-foreground">
                  {t("aiSettings.fallback")}
                </span>
                <span className="mt-1 block text-muted-foreground">
                  {hostedAiAvailable
                    ? t("aiSettings.fallbackConfigured")
                    : t("aiSettings.fallbackNotConfigured")}
                </span>
              </span>
            </label>
          </div>
        </SettingsSection>
      </div>

      <DialogFooter className="flex-col gap-2 border-t border-border/60 px-6 py-4 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={saving || !hasStoredKey}
          onClick={() => void handleClear()}
        >
          {t("aiSettings.removeKey")}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={saving || (!apiKey.trim() && !hasStoredKey)}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.saving")}
              </>
            ) : (
              t("common.save")
            )}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  saving = false,
  onSave,
  onClear,
}: SettingsDialogProps) {
  const settingsKey = [
    settings?.provider ?? "openai",
    settings?.hasApiKey ? "1" : "0",
    settings?.fallbackEnabled ? "1" : "0",
  ].join("-");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SettingsDialogBody
          key={settingsKey}
          onOpenChange={onOpenChange}
          settings={settings}
          saving={saving}
          onSave={onSave}
          onClear={onClear}
        />
      ) : null}
    </Dialog>
  );
}
