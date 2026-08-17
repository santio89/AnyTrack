import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import type { UserAiProvider, UserAiSettings } from "@/types/ai-settings";

const GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const VISION_MODEL = process.env.AI_VISION_MODEL ?? "openai/gpt-4o";
export const TEXT_MODEL = process.env.AI_TEXT_MODEL ?? "openai/gpt-4o-mini";

const DEFAULT_FREE_VISION_MODEL = "google/gemma-4-26b-a4b-it:free";
const DEFAULT_FREE_TEXT_MODEL = "meta-llama/llama-3.2-3b-instruct:free";

export type AiProvider = "gateway" | "openrouter";

type AiAttempt = {
  provider: AiProvider;
  model: string;
  label: string;
};

export function isGatewayConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN);
}

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function isAiConfigured() {
  return isGatewayConfigured() || isOpenRouterConfigured();
}

export function isFreeFallbackEnabled() {
  return process.env.AI_FREE_FALLBACK !== "false";
}

export function isFreeModelsPrimary() {
  return process.env.AI_USE_FREE_MODELS === "true";
}

export function getPrimaryAiProvider(): AiProvider {
  const preferred = process.env.AI_PRIMARY_PROVIDER?.toLowerCase();

  if (preferred === "openrouter") {
    if (isOpenRouterConfigured()) {
      return "openrouter";
    }

    if (isGatewayConfigured()) {
      return "gateway";
    }
  }

  if (preferred === "gateway") {
    if (isGatewayConfigured()) {
      return "gateway";
    }

    if (isOpenRouterConfigured()) {
      return "openrouter";
    }
  }

  if (isGatewayConfigured()) {
    return "gateway";
  }

  return "openrouter";
}

function getSecondaryAiProvider(primary: AiProvider): AiProvider | null {
  if (primary === "gateway" && isOpenRouterConfigured()) {
    return "openrouter";
  }

  if (primary === "openrouter" && isGatewayConfigured()) {
    return "gateway";
  }

  return null;
}

function createGatewayClient(): OpenAI | null {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: GATEWAY_BASE_URL,
  });
}

function createOpenRouterClient(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer":
        process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "AnyTrack",
    },
  });
}

function getClientForProvider(provider: AiProvider): OpenAI | null {
  return provider === "gateway"
    ? createGatewayClient()
    : createOpenRouterClient();
}

export function resolveModelForProvider(
  model: string,
  provider: AiProvider,
): string {
  if (provider === "openrouter") {
    if (model === VISION_MODEL && process.env.OPENROUTER_VISION_MODEL) {
      return process.env.OPENROUTER_VISION_MODEL;
    }

    if (model === TEXT_MODEL && process.env.OPENROUTER_TEXT_MODEL) {
      return process.env.OPENROUTER_TEXT_MODEL;
    }

    if (process.env.OPENROUTER_MODEL) {
      return process.env.OPENROUTER_MODEL;
    }
  }

  return model;
}

export function resolveFreeModel(model: string): string | null {
  if (!isOpenRouterConfigured()) {
    return null;
  }

  if (!isFreeFallbackEnabled() && !isFreeModelsPrimary()) {
    return null;
  }

  if (model === VISION_MODEL || model === process.env.OPENROUTER_VISION_MODEL) {
    return process.env.OPENROUTER_FREE_VISION_MODEL ?? DEFAULT_FREE_VISION_MODEL;
  }

  if (model === TEXT_MODEL || model === process.env.OPENROUTER_TEXT_MODEL) {
    return process.env.OPENROUTER_FREE_TEXT_MODEL ?? DEFAULT_FREE_TEXT_MODEL;
  }

  return process.env.OPENROUTER_FREE_MODEL ?? "openrouter/free";
}

export function buildAiAttemptChain(model: string): AiAttempt[] {
  const attempts: AiAttempt[] = [];

  function pushAttempt(provider: AiProvider, resolvedModel: string, label: string) {
    const duplicate = attempts.some(
      (attempt) =>
        attempt.provider === provider && attempt.model === resolvedModel,
    );

    if (!duplicate) {
      attempts.push({ provider, model: resolvedModel, label });
    }
  }

  if (isFreeModelsPrimary() && isOpenRouterConfigured()) {
    const freeModel = resolveFreeModel(model);

    if (freeModel) {
      pushAttempt("openrouter", freeModel, "OpenRouter (free)");

      if (isGatewayConfigured()) {
        pushAttempt("gateway", model, providerLabel("gateway"));
      }

      const paidOpenRouterModel = resolveModelForProvider(model, "openrouter");

      if (paidOpenRouterModel !== freeModel) {
        pushAttempt("openrouter", paidOpenRouterModel, providerLabel("openrouter"));
      }

      return attempts;
    }
  }

  const primary = getPrimaryAiProvider();
  const secondary = getSecondaryAiProvider(primary);

  pushAttempt(
    primary,
    primary === "openrouter"
      ? resolveModelForProvider(model, "openrouter")
      : model,
    providerLabel(primary),
  );

  if (secondary) {
    pushAttempt(
      secondary,
      secondary === "openrouter"
        ? resolveModelForProvider(model, "openrouter")
        : model,
      providerLabel(secondary),
    );
  }

  const freeModel = resolveFreeModel(model);

  if (freeModel) {
    pushAttempt("openrouter", freeModel, "OpenRouter (free)");
  }

  return attempts;
}

export function shouldFallbackToAlternateProvider(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  if (
    /insufficient.?credits|out of credits|quota|billing|payment required|exceeded.*limit/.test(
      message,
    )
  ) {
    return true;
  }

  if (status == null) {
    return true;
  }

  return status === 401 || status === 402 || status === 403 || status === 429 || status >= 500;
}

/** @deprecated Use shouldFallbackToAlternateProvider instead. */
export function shouldFallbackToOpenRouter(error: unknown): boolean {
  if (!isOpenRouterConfigured()) {
    return false;
  }

  return shouldFallbackToAlternateProvider(error);
}

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function providerLabel(provider: AiProvider): string {
  return provider === "gateway" ? "Vercel AI Gateway" : "OpenRouter";
}

function userProviderLabel(provider: UserAiProvider): string {
  switch (provider) {
    case "openai":
      return "OpenAI (your key)";
    case "openrouter":
      return "OpenRouter (your key)";
    case "gateway":
      return "Vercel AI Gateway (your key)";
  }
}

export function resolveModelForUserProvider(
  model: string,
  provider: UserAiProvider,
): string {
  if (provider === "openai") {
    if (model === VISION_MODEL) {
      return process.env.OPENAI_VISION_MODEL ?? "gpt-4o";
    }

    if (model === TEXT_MODEL) {
      return process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";
    }

    if (model.includes("/")) {
      return model.split("/").slice(1).join("/");
    }

    return model;
  }

  if (provider === "openrouter") {
    return resolveModelForProvider(model, "openrouter");
  }

  return model;
}

function createClientForUser(settings: UserAiSettings): OpenAI {
  switch (settings.provider) {
    case "openai":
      return new OpenAI({ apiKey: settings.apiKey });
    case "openrouter":
      return new OpenAI({
        apiKey: settings.apiKey,
        baseURL: OPENROUTER_BASE_URL,
        defaultHeaders: {
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME ?? "AnyTrack",
        },
      });
    case "gateway":
      return new OpenAI({
        apiKey: settings.apiKey,
        baseURL: GATEWAY_BASE_URL,
      });
  }
}

export type ChatCompletionResult = {
  completion: OpenAI.Chat.Completions.ChatCompletion;
  model: string;
  via: string;
};

const LOG_MODEL_VIA_SEPARATOR = "|||";

export function encodeLogModel(model: string, via: string): string {
  return `${model}${LOG_MODEL_VIA_SEPARATOR}${via}`;
}

export function parseLogModel(stored: string): { model: string; via: string | null } {
  const separatorIndex = stored.lastIndexOf(LOG_MODEL_VIA_SEPARATOR);

  if (separatorIndex === -1) {
    return { model: stored, via: null };
  }

  return {
    model: stored.slice(0, separatorIndex),
    via: stored.slice(separatorIndex + LOG_MODEL_VIA_SEPARATOR.length) || null,
  };
}

export function formatAiModelLabel(model: string): string {
  const { model: rawModel } = parseLogModel(model);
  const withoutProvider = rawModel.includes("/")
    ? rawModel.split("/").slice(1).join("/")
    : rawModel;

  return withoutProvider;
}

export function formatAiModelWithProvider(
  stored: string,
  formatVia: (model: string, provider: string) => string,
): string {
  const { model, via } = parseLogModel(stored);
  const displayModel = formatAiModelLabel(model);

  if (!via) {
    return displayModel;
  }

  return formatVia(displayModel, via);
}

function logProviderLabel(provider: AiProvider | "openai"): string {
  switch (provider) {
    case "gateway":
      return "Vercel AI Gateway";
    case "openrouter":
      return "OpenRouter";
    case "openai":
      return "OpenAI";
  }
}

/** @deprecated Use createChatCompletion() for automatic provider fallback. */
export function getVisionClient(): OpenAI {
  const primary = getPrimaryAiProvider();
  const client = getClientForProvider(primary);

  if (!client) {
    throw new Error(
      "No AI provider configured. Set AI_GATEWAY_API_KEY or OPENROUTER_API_KEY.",
    );
  }

  return client;
}

export type CreateChatCompletionOptions = {
  userAi?: UserAiSettings | null;
};

export async function createChatCompletion(
  params: ChatCompletionCreateParamsNonStreaming,
  options?: CreateChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const errors: string[] = [];
  const userAi = options?.userAi?.apiKey?.trim()
    ? {
        ...options.userAi,
        apiKey: options.userAi.apiKey.trim(),
      }
    : null;

  if (userAi) {
    const client = createClientForUser(userAi);
    const model = resolveModelForUserProvider(params.model, userAi.provider);
    const label = userProviderLabel(userAi.provider);

    try {
      const response = await client.chat.completions.create({
        ...params,
        model,
      });

      return {
        completion: response,
        model,
        via: logProviderLabel(userAi.provider),
      };
    } catch (error) {
      const message = getErrorMessage(error);
      errors.push(`${label} (${model}): ${message}`);

      if (!userAi.fallbackEnabled || !isAiConfigured()) {
        throw error;
      }

      console.warn(
        `[AnyTrack] ${label} failed, falling back to AnyTrack hosted AI:`,
        message,
      );
    }
  }

  const attempts = buildAiAttemptChain(params.model);

  if (attempts.length === 0) {
    throw new Error(
      errors.length > 0
        ? `All AI providers failed. ${errors.join(". ")}`
        : "No AI provider configured. Set AI_GATEWAY_API_KEY or OPENROUTER_API_KEY.",
    );
  }

  for (let index = 0; index < attempts.length; index++) {
    const attempt = attempts[index];
    const client = getClientForProvider(attempt.provider);

    if (!client) {
      continue;
    }

    try {
      const response = await client.chat.completions.create({
        ...params,
        model: attempt.model,
      });

      if (index > 0) {
        console.log(
          `[AnyTrack] AI request succeeded via ${attempt.label} (${attempt.model})`,
        );
      }

      return {
        completion: response,
        model: attempt.model,
        via: attempt.label,
      };
    } catch (error) {
      const message = getErrorMessage(error);
      errors.push(`${attempt.label} (${attempt.model}): ${message}`);

      const isLastAttempt = index === attempts.length - 1;

      if (isLastAttempt || !shouldFallbackToAlternateProvider(error)) {
        throw new Error(`All AI providers failed. ${errors.join(". ")}`);
      }

      const nextAttempt = attempts[index + 1];

      console.warn(
        `[AnyTrack] ${attempt.label} failed, retrying with ${nextAttempt.label}:`,
        message,
      );
    }
  }

  throw new Error(
    errors.length > 0
      ? `All AI providers failed. ${errors.join(". ")}`
      : "No AI provider configured. Set AI_GATEWAY_API_KEY or OPENROUTER_API_KEY.",
  );
}
