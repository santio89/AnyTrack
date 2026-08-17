import type {
  GuestAiSettingsStored,
  UserAiSettings,
  UserAiSettingsPublic,
} from "@/types/ai-settings";
import {
  GUEST_AI_SETTINGS_KEY,
  isUserAiProvider,
  toUserAiSettings,
} from "@/types/ai-settings";

function getSecretPreview(secret: string): string {
  const trimmed = secret.trim();

  if (trimmed.length <= 4) {
    return "••••";
  }

  return `••••${trimmed.slice(-4)}`;
}

export function loadGuestAiSettings(): GuestAiSettingsStored {
  if (typeof window === "undefined") {
    return {
      provider: null,
      apiKey: null,
      fallbackEnabled: true,
    };
  }

  try {
    const raw = window.localStorage.getItem(GUEST_AI_SETTINGS_KEY);

    if (!raw) {
      return {
        provider: null,
        apiKey: null,
        fallbackEnabled: true,
      };
    }

    const parsed = JSON.parse(raw) as Partial<GuestAiSettingsStored>;

    return {
      provider:
        parsed.provider && isUserAiProvider(parsed.provider)
          ? parsed.provider
          : null,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : null,
      fallbackEnabled: parsed.fallbackEnabled !== false,
    };
  } catch {
    return {
      provider: null,
      apiKey: null,
      fallbackEnabled: true,
    };
  }
}

export function saveGuestAiSettings(settings: GuestAiSettingsStored) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GUEST_AI_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearGuestAiSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GUEST_AI_SETTINGS_KEY);
}

export function getGuestUserAiSettings(): UserAiSettings | null {
  return toUserAiSettings(loadGuestAiSettings());
}

export function toGuestAiSettingsPublic(
  stored: GuestAiSettingsStored,
  hostedAiAvailable: boolean,
): UserAiSettingsPublic {
  return {
    provider: stored.provider,
    hasApiKey: Boolean(stored.apiKey?.trim()),
    apiKeyPreview: stored.apiKey?.trim()
      ? getSecretPreview(stored.apiKey.trim())
      : null,
    fallbackEnabled: stored.fallbackEnabled,
    hostedAiAvailable,
  };
}
