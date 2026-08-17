import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addGuestPendingRun,
  getGuestPendingRuns,
  pruneExpiredGuestPendingRuns,
  removeGuestPendingRun,
} from "@/lib/guest/pending-runs";

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

describe("guest pending runs", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createStorage(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("tracks and clears pending runs in storage", () => {
    const trackerId = "guest-tracker-1";

    addGuestPendingRun({
      trackerId,
      startedAt: Date.now(),
    });

    expect(getGuestPendingRuns()).toHaveLength(1);
    expect(getGuestPendingRuns()[0]?.trackerId).toBe(trackerId);

    removeGuestPendingRun(trackerId);
    expect(getGuestPendingRuns()).toHaveLength(0);
  });

  it("drops expired pending runs", () => {
    addGuestPendingRun({
      trackerId: "guest-tracker-old",
      startedAt: Date.now() - 11 * 60 * 1000,
    });

    expect(pruneExpiredGuestPendingRuns()).toHaveLength(0);
  });
});
