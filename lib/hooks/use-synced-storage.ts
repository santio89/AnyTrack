"use client";

import { useCallback, useSyncExternalStore } from "react";

type StorageStore<T extends string> = {
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  subscribe: (onStoreChange: () => void) => () => void;
  setValue: (value: T) => void;
};

export function createSyncedStorageStore<T extends string>(
  key: string,
  parse: (raw: string | null) => T | null,
  fallback: T,
): StorageStore<T> {
  const eventName = `anytrack-storage:${key}`;

  function readValue(): T {
    if (typeof window === "undefined") {
      return fallback;
    }

    return parse(localStorage.getItem(key)) ?? fallback;
  }

  function subscribe(onStoreChange: () => void) {
    const onChange = () => onStoreChange();

    window.addEventListener("storage", onChange);
    window.addEventListener(eventName, onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(eventName, onChange);
    };
  }

  function setValue(value: T) {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(eventName));
  }

  return {
    getSnapshot: readValue,
    getServerSnapshot: () => fallback,
    subscribe,
    setValue,
  };
}

export function useSyncedStorage<T extends string>(store: StorageStore<T>) {
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const setValue = useCallback(
    (nextValue: T) => {
      store.setValue(nextValue);
    },
    [store],
  );

  return [value, setValue] as const;
}
