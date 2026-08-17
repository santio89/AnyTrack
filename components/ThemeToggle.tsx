"use client";

import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: ButtonProps["variant"];
}) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          onClick={toggleTheme}
          aria-label={t("theme.toggle")}
          className={cn(className)}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
      </TooltipContent>
    </Tooltip>
  );
}
