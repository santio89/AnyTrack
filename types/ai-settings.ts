export type UserAiProvider = "openai" | "openrouter" | "gateway";

export type UserAiSettings = {
  provider: UserAiProvider;
  apiKey: string;
  fallbackEnabled: boolean;
};

export type UserAiSettingsPublic = {
  provider: UserAiProvider | null;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  fallbackEnabled: boolean;
  hostedAiAvailable: boolean;
};

export type GuestAiSettingsStored = {
  provider: UserAiProvider | null;
  apiKey: string | null;
  fallbackEnabled: boolean;
};

export const GUEST_AI_SETTINGS_KEY = "anytrack-ai-settings";

export function isUserAiProvider(value: string): value is UserAiProvider {
  return value === "openai" || value === "openrouter" || value === "gateway";
}

export function toUserAiSettings(
  stored: GuestAiSettingsStored | null,
): UserAiSettings | null {
  if (!stored?.provider || !stored.apiKey?.trim()) {
    return null;
  }

  return {
    provider: stored.provider,
    apiKey: stored.apiKey.trim(),
    fallbackEnabled: stored.fallbackEnabled,
  };
}
