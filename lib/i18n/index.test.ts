import { describe, expect, it } from "vitest";
import { createTranslator } from "@/lib/i18n";

describe("i18n", () => {
  it("translates keys and interpolates params", () => {
    const t = createTranslator("en");

    expect(t("common.save")).toBe("Save");
    expect(t("dashboard.logs.modelWithProvider", {
      model: "gpt-4o",
      provider: "OpenAI",
    })).toBe("gpt-4o (via OpenAI)");
  });

  it("falls back to English for missing Spanish keys", () => {
    const t = createTranslator("es");

    expect(t("language.english")).toBe("English");
    expect(t("dashboard.logs.modelWithProvider", {
      model: "gpt-4o",
      provider: "OpenAI",
    })).toBe("gpt-4o (vía OpenAI)");
  });
});
