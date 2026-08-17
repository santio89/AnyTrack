"use client";

import * as React from "react";
import {
  createSyncedStorageStore,
  useSyncedStorage,
} from "@/lib/hooks/use-synced-storage";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = React.createContext<ThemeProviderState>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyThemeClass(nextTheme: Theme) {
  const root = document.documentElement;
  root.classList.add("disable-transitions");
  root.classList.toggle("dark", nextTheme === "dark");

  // Force the browser to paint the new theme before re-enabling transitions.
  void root.getBoundingClientRect();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("disable-transitions");
    });
  });
}

function createThemeStore(storageKey: string, defaultTheme: Theme) {
  return createSyncedStorageStore<Theme>(
    storageKey,
    (stored) => (stored === "light" || stored === "dark" ? stored : null),
    defaultTheme,
  );
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "anytrack-theme",
}: ThemeProviderProps) {
  const themeStore = React.useMemo(
    () => createThemeStore(storageKey, defaultTheme),
    [defaultTheme, storageKey],
  );
  const [theme, setThemeState] = useSyncedStorage(themeStore);

  React.useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      applyThemeClass(nextTheme);
    },
    [setThemeState],
  );

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeProviderContext);
}
