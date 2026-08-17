import { describe, expect, it } from "vitest";
import { formatDate, formatFrequency, getFrequencyOptions } from "@/lib/i18n/format";

describe("i18n format", () => {
  it("formats short frequencies in minutes", () => {
    expect(formatFrequency(15, "en")).toBe("Every 15 min");
    expect(formatFrequency(15, "es")).toBe("Cada 15 min");
  });

  it("formats hourly and daily frequencies", () => {
    expect(formatFrequency(60, "en")).toBe("Every hour");
    expect(formatFrequency(1440, "en")).toBe("Every 24 hours");
    expect(formatFrequency(60, "es")).toBe("Cada hora");
    expect(formatFrequency(1440, "es")).toBe("Cada 24 horas");
  });

  it("formats missing dates", () => {
    expect(formatDate(null, "en")).toBe("Never");
    expect(formatDate(null, "es")).toBe("Nunca");
  });

  it("returns localized frequency options", () => {
    expect(getFrequencyOptions("en")[0]?.label).toBe("Every 5 minutes");
    expect(getFrequencyOptions("es")[0]?.label).toBe("Cada 5 minutos");
  });
});
