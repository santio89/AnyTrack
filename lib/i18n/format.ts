import type { Locale } from "./types";

const DATE_LOCALES: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
};

export function formatDate(
  date: Date | null | undefined,
  locale: Locale,
): string {
  if (!date) {
    return locale === "es" ? "Nunca" : "Never";
  }

  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFrequency(minutes: number, locale: Locale): string {
  if (minutes < 60) {
    return locale === "es"
      ? `Cada ${minutes} min`
      : `Every ${minutes} min`;
  }

  if (minutes === 60) {
    return locale === "es" ? "Cada hora" : "Every hour";
  }

  if (minutes < 1440) {
    const hours = minutes / 60;
    return locale === "es"
      ? `Cada ${hours} horas`
      : `Every ${hours} hours`;
  }

  return locale === "es" ? "Cada 24 horas" : "Every 24 hours";
}

export function getFrequencyOptions(locale: Locale) {
  const labels =
    locale === "es"
      ? {
          5: "Cada 5 minutos",
          15: "Cada 15 minutos",
          30: "Cada 30 minutos",
          60: "Cada hora",
          360: "Cada 6 horas",
          1440: "Cada 24 horas",
        }
      : {
          5: "Every 5 minutes",
          15: "Every 15 minutes",
          30: "Every 30 minutes",
          60: "Every hour",
          360: "Every 6 hours",
          1440: "Every 24 hours",
        };

  return [
    { label: labels[5], value: 5 },
    { label: labels[15], value: 15 },
    { label: labels[30], value: 30 },
    { label: labels[60], value: 60 },
    { label: labels[360], value: 360 },
    { label: labels[1440], value: 1440 },
  ] as const;
}
