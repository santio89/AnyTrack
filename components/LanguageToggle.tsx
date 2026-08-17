"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

type LanguageToggleProps = {
  className?: string;
  variant?: "outline" | "ghost";
  compact?: boolean;
};

export function LanguageToggle({
  className,
  variant = "outline",
  compact = false,
}: LanguageToggleProps) {
  const { locale, setLocale, t } = useI18n();

  function toggleLocale() {
    const next: Locale = locale === "en" ? "es" : "en";
    setLocale(next);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={compact ? "sm" : "default"}
          onClick={toggleLocale}
          aria-label={t("language.label")}
          className={cn(
            compact ? "h-8 gap-1.5 px-2 text-xs" : "gap-2",
            className,
          )}
        >
          <Languages className="h-4 w-4" />
          <span className="font-medium uppercase">{locale}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {locale === "en" ? t("language.spanish") : t("language.english")}
      </TooltipContent>
    </Tooltip>
  );
}
