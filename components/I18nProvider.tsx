"use client";

import * as React from "react";
import { createTranslator } from "@/lib/i18n";
import {
  createSyncedStorageStore,
  useSyncedStorage,
} from "@/lib/hooks/use-synced-storage";
import type { Locale } from "@/lib/i18n/types";

const STORAGE_KEY = "anytrack-locale";

const localeStore = createSyncedStorageStore<Locale>(
  STORAGE_KEY,
  (stored) => {
    if (stored === "en" || stored === "es") {
      return stored;
    }

    return null;
  },
  "en",
);

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof createTranslator>;
};

const I18nContext = React.createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: createTranslator("en"),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useSyncedStorage(localeStore);

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback(
    (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      document.documentElement.lang = nextLocale;
    },
    [setLocaleState],
  );

  const t = React.useMemo(() => createTranslator(locale), [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return React.useContext(I18nContext);
}
