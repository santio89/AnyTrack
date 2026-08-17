"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Plus, Settings } from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthButton } from "@/components/AuthButton";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  onAddTracker: () => void;
  onOpenSettings: () => void;
};

export function DashboardHeader({
  onAddTracker,
  onOpenSettings,
}: DashboardHeaderProps) {
  const { t } = useI18n();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled((prev) => {
      if (!prev && latest > 48) return true;
      if (prev && latest < 12) return false;
      return prev;
    });
  });

  return (
    <div
      className={cn(
        "sticky z-40 transition-[padding] duration-500 ease-out",
        scrolled ? "top-3 px-4 sm:px-6" : "top-0 px-0",
      )}
    >
      <motion.header
        layout
        initial={false}
        animate={{
          borderRadius: scrolled ? 16 : 0,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className={cn(
          "relative mx-auto flex items-center justify-between overflow-hidden transition-all duration-500 ease-out",
          scrolled
            ? "glass-header max-w-3xl px-4 py-2"
            : "max-w-7xl border-b-0 bg-transparent px-6 py-5",
        )}
      >
        {scrolled && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(263_70%_65%_/0.12),transparent_70%)]"
          />
        )}

        <Link
          href="/"
          className="relative z-10 flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <SiteLogo
            className={cn(
              "transition-colors duration-500",
              scrolled ? "h-7 w-7" : "h-9 w-9",
            )}
          />

          <div className="min-w-0">
            <motion.h1
              layout
              className={cn(
                "font-bold tracking-tight transition-all duration-300",
                scrolled ? "text-base" : "text-xl",
              )}
            >
              AnyTrack
            </motion.h1>
            <motion.p
              initial={false}
              animate={{
                opacity: scrolled ? 0 : 1,
                height: scrolled ? 0 : "auto",
                marginTop: scrolled ? 0 : 2,
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden text-xs text-muted-foreground"
            >
              {t("header.subtitle")}
            </motion.p>
          </div>
        </Link>

        <motion.div
          layout
          className="relative z-10 flex shrink-0 items-center gap-1.5 sm:gap-2"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={scrolled ? "ghost" : "outline"}
                size="icon"
                className={cn("relative transition-all duration-300", scrolled && "h-9 w-9")}
                onClick={onAddTracker}
                aria-label={t("header.addTracker")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("header.addTracker")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={scrolled ? "ghost" : "outline"}
                size="icon"
                className={cn("transition-all duration-300", scrolled && "h-9 w-9")}
                onClick={onOpenSettings}
                aria-label={t("header.settings")}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("header.settings")}</TooltipContent>
          </Tooltip>
          <ThemeToggle
            variant={scrolled ? "ghost" : "outline"}
            className={cn("transition-all duration-300", scrolled && "h-9 w-9")}
          />
          <AuthButton compact={scrolled} />
        </motion.div>
      </motion.header>
    </div>
  );
}
