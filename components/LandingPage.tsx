"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  LayoutDashboard,
  Radar,
  ScanEye,
  Sparkles,
  Timer,
} from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/components/I18nProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PREVIEW_EXAMPLE_IDS = ["google", "amazon", "wsj", "apple"] as const;

const features = [
  { icon: ScanEye, key: "landing.featureVision" as const },
  { icon: Timer, key: "landing.featureSchedule" as const },
  { icon: Bell, key: "landing.featureAlerts" as const },
];

const heroStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function RadarPulse({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return (
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
        <Radar className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-2xl border border-primary/40"
        animate={{ scale: [1, 1.35], opacity: [0.45, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.span
        className="absolute inset-0 rounded-2xl border border-violet-400/25"
        animate={{ scale: [1, 1.55], opacity: [0.3, 0] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0.5,
        }}
      />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 shadow-[0_0_40px_-8px_hsl(var(--primary)/0.8)] backdrop-blur-sm">
        <Radar className="h-8 w-8 text-primary" />
      </div>
    </div>
  );
}

function PreviewCard({
  reducedMotion,
  t,
}: {
  reducedMotion: boolean;
  t: (key: string) => string;
}) {
  const previewSteps = [
    t("landing.previewScreenshot"),
    t("landing.previewExtract"),
    t("landing.previewAlert"),
  ];

  const examples = useMemo(
    () =>
      PREVIEW_EXAMPLE_IDS.map((id) => ({
        id,
        domain: t(`landing.previewExamples.${id}.domain`),
        value: t(`landing.previewExamples.${id}.value`),
      })),
    [t],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const intervalMs = reducedMotion ? 5000 : 4200;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % examples.length);
      setActiveStep(1);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [examples.length, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const stepTimer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % previewSteps.length);
    }, 1400);

    return () => window.clearInterval(stepTimer);
  }, [previewSteps.length, reducedMotion, activeIndex]);

  const activeExample = examples[activeIndex] ?? examples[0];

  return (
    <motion.div
      animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
      transition={
        reducedMotion
          ? undefined
          : {
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut" as const,
            }
      }
      className="neo-glass-panel relative mx-auto w-full max-w-md overflow-hidden p-5"
    >
      <div className="neo-scanline pointer-events-none absolute inset-0 opacity-40" />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />
          <span className="text-xs font-medium text-muted-foreground">
            {t("landing.previewLive")}
          </span>
        </div>
        <Badge variant="success" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">
          {t("landing.previewSuccess")}
        </Badge>
      </div>
      <div className="space-y-3 rounded-xl border border-border/50 bg-background/40 p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeExample.id}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{activeExample.domain}</span>
              <span>{t("landing.previewJustNow")}</span>
            </div>
            <p className="text-sm font-medium leading-snug text-foreground">
              {activeExample.value}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>gpt-4o</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {previewSteps.map((step, index) => (
          <div
            key={step}
            className={cn(
              "rounded-lg border px-2 py-2 text-center text-[10px] font-medium transition-colors duration-300",
              index === activeStep
                ? "border-primary/35 bg-primary/10 text-primary"
                : "border-border/50 bg-muted/20 text-muted-foreground",
            )}
          >
            {step}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {examples.map((example, index) => (
          <span
            key={example.id}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === activeIndex
                ? "w-4 bg-primary"
                : "w-1.5 bg-muted-foreground/30",
            )}
            aria-hidden
          />
        ))}
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-[32rem] w-[32rem] rounded-full bg-fuchsia-600/15 blur-[130px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="neo-grid-bg absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_72%)]" />
      </div>

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.7)]">
            <Radar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">AnyTrack</p>
            <p className="text-xs text-muted-foreground">{t("landing.webMonitor")}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={200}>
            <LanguageToggle variant="outline" className="h-9" />
            <ThemeToggle variant="outline" className="h-9 w-9" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  asChild
                  aria-label={t("landing.openDashboard")}
                >
                  <Link href="/dashboard" prefetch>
                    <LayoutDashboard className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("landing.openDashboard")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-6xl flex-col justify-center px-6 pb-12 pt-4 lg:min-h-[calc(100vh-6rem)]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <motion.div
            variants={heroStagger}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div variants={heroItem}>
              <RadarPulse reducedMotion={Boolean(reducedMotion)} />
            </motion.div>

            <motion.div variants={heroItem} className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t("landing.badge")}
              </span>
              <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]">
                {t("landing.titleBefore")}{" "}
                <span className="neo-gradient-text">{t("landing.titleHighlight")}</span>
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("landing.description")}
              </p>
            </motion.div>

            <motion.div
              variants={heroItem}
              className="flex flex-wrap items-center gap-3"
            >
              <Button
                asChild
                size="lg"
                className="neo-cta-glow h-11 rounded-full px-7 text-sm font-semibold"
              >
                <Link href="/dashboard" prefetch>
                  {t("landing.openDashboard")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              variants={heroItem}
              className="flex flex-wrap gap-2 pt-1"
            >
              {features.map(({ icon: Icon, key }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {t(key)}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-fuchsia-500/10 blur-2xl" />
            <PreviewCard reducedMotion={Boolean(reducedMotion)} t={t} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
