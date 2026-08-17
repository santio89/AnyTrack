import { describe, expect, it } from "vitest";
import {
  buildAiAttemptChain,
  encodeLogModel,
  formatAiModelLabel,
  formatAiModelWithProvider,
  getPrimaryAiProvider,
  isFreeFallbackEnabled,
  parseLogModel,
  resolveFreeModel,
  resolveModelForProvider,
  resolveModelForUserProvider,
  shouldFallbackToOpenRouter,
  TEXT_MODEL,
  VISION_MODEL,
} from "@/lib/ai";

describe("ai providers", () => {
  it("prefers openrouter when AI_PRIMARY_PROVIDER=openrouter", () => {
    process.env.AI_GATEWAY_API_KEY = "gateway-key";
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    process.env.AI_PRIMARY_PROVIDER = "openrouter";

    expect(getPrimaryAiProvider()).toBe("openrouter");

    delete process.env.AI_PRIMARY_PROVIDER;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  it("falls back on credit and auth errors", () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    expect(
      shouldFallbackToOpenRouter(
        Object.assign(new Error("Insufficient credits"), { status: 402 }),
      ),
    ).toBe(true);

    expect(
      shouldFallbackToOpenRouter(new Error("You have run out of credits")),
    ).toBe(true);

    delete process.env.OPENROUTER_API_KEY;
  });

  it("does not fall back when openrouter is not configured", () => {
    delete process.env.OPENROUTER_API_KEY;

    expect(
      shouldFallbackToOpenRouter(
        Object.assign(new Error("Unauthorized"), { status: 401 }),
      ),
    ).toBe(false);
  });

  it("uses openrouter model overrides when configured", () => {
    process.env.OPENROUTER_VISION_MODEL = "google/gemini-2.0-flash";

    expect(resolveModelForProvider(VISION_MODEL, "openrouter")).toBe(
      "google/gemini-2.0-flash",
    );

    delete process.env.OPENROUTER_VISION_MODEL;
  });

  it("adds a third free-model attempt when openrouter is configured", () => {
    process.env.AI_GATEWAY_API_KEY = "gateway-key";
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    process.env.AI_PRIMARY_PROVIDER = "gateway";
    delete process.env.AI_FREE_FALLBACK;

    const attempts = buildAiAttemptChain(VISION_MODEL);

    expect(attempts).toHaveLength(3);
    expect(attempts[0]?.label).toBe("Vercel AI Gateway");
    expect(attempts[1]?.label).toBe("OpenRouter");
    expect(attempts[2]?.label).toBe("OpenRouter (free)");
    expect(attempts[2]?.model).toBe("google/gemma-4-26b-a4b-it:free");

    delete process.env.AI_PRIMARY_PROVIDER;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  it("resolves free text model for suggest flow", () => {
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    delete process.env.AI_FREE_FALLBACK;

    expect(resolveFreeModel(TEXT_MODEL)).toBe(
      "meta-llama/llama-3.2-3b-instruct:free",
    );

    delete process.env.OPENROUTER_API_KEY;
  });

  it("can disable free fallback", () => {
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    process.env.AI_GATEWAY_API_KEY = "gateway-key";
    process.env.AI_FREE_FALLBACK = "false";

    expect(isFreeFallbackEnabled()).toBe(false);
    expect(buildAiAttemptChain(VISION_MODEL)).toHaveLength(2);

    delete process.env.OPENROUTER_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_FREE_FALLBACK;
  });

  it("uses free models first when AI_USE_FREE_MODELS=true", () => {
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    process.env.AI_GATEWAY_API_KEY = "gateway-key";
    process.env.AI_USE_FREE_MODELS = "true";
    delete process.env.AI_FREE_FALLBACK;

    const attempts = buildAiAttemptChain(VISION_MODEL);

    expect(attempts[0]?.label).toBe("OpenRouter (free)");
    expect(attempts[0]?.model).toBe("google/gemma-4-26b-a4b-it:free");
    expect(attempts[1]?.label).toBe("Vercel AI Gateway");
    expect(attempts[2]?.label).toBe("OpenRouter");

    delete process.env.OPENROUTER_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_USE_FREE_MODELS;
  });
});

describe("log model labels", () => {
  it("encodes and parses provider metadata", () => {
    const stored = encodeLogModel("openai/gpt-4o", "Vercel AI Gateway");

    expect(parseLogModel(stored)).toEqual({
      model: "openai/gpt-4o",
      via: "Vercel AI Gateway",
    });
    expect(formatAiModelLabel(stored)).toBe("gpt-4o");
    expect(
      formatAiModelWithProvider(
        stored,
        (model, provider) => `${model} (via ${provider})`,
      ),
    ).toBe("gpt-4o (via Vercel AI Gateway)");
  });

  it("supports legacy model-only values", () => {
    expect(formatAiModelLabel("gpt-4o")).toBe("gpt-4o");
    expect(
      formatAiModelWithProvider("gpt-4o", (model, provider) =>
        `${model} (via ${provider})`,
      ),
    ).toBe("gpt-4o");
  });
});

describe("user AI providers", () => {
  it("maps models for user-provided keys", () => {
    expect(resolveModelForUserProvider(VISION_MODEL, "gateway")).toBe(
      "openai/gpt-4o",
    );
    expect(resolveModelForUserProvider(VISION_MODEL, "openai")).toBe("gpt-4o");
  });
});
