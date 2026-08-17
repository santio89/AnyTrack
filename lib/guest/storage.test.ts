import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createGuestTracker,
  deleteGuestTracker,
  hasGuestData,
} from "@/lib/guest/storage";

function createStorage() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("guest storage", () => {
  beforeEach(() => {
    const storage = createStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("reports guest data only when importable trackers exist", () => {
    const tracker = createGuestTracker({
      url: "https://example.com",
      targetDescription: "Example",
      frequencyMinutes: 60,
      notifyOnChange: false,
      notifyOnFailure: false,
      notificationEmail: null,
      referenceImage: null,
    });

    expect(hasGuestData()).toBe(true);

    deleteGuestTracker(tracker.id, { clearLogs: true });
    expect(hasGuestData()).toBe(false);
  });

  it("does not report guest data for soft-deleted trackers or leftover logs", () => {
    const tracker = createGuestTracker({
      url: "https://example.com",
      targetDescription: "Example",
      frequencyMinutes: 60,
      notifyOnChange: false,
      notifyOnFailure: false,
      notificationEmail: null,
      referenceImage: null,
    });

    deleteGuestTracker(tracker.id, { clearLogs: false });
    expect(hasGuestData()).toBe(false);
  });
});
