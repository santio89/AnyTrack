import { en } from "./messages/en";
import { es } from "./messages/es";
import type { Locale } from "./types";

const catalogs = { en, es } as const;

type NestedValue = string | { [key: string]: NestedValue };

function getNestedValue(
  source: NestedValue,
  path: string[],
): string | undefined {
  let current: NestedValue | undefined = source;

  for (const segment of path) {
    if (!current || typeof current === "string") {
      return undefined;
    }

    current = current[segment];
  }

  return typeof current === "string" ? current : undefined;
}

export function createTranslator(locale: Locale) {
  const catalog = catalogs[locale];

  return function t(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const value =
      getNestedValue(catalog, key.split(".")) ??
      getNestedValue(en, key.split(".")) ??
      key;

    if (!params) {
      return value;
    }

    return Object.entries(params).reduce(
      (result, [paramKey, paramValue]) =>
        result.replaceAll(`{{${paramKey}}}`, String(paramValue)),
      value,
    );
  };
}

export { en, es };
