import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { db, initDb } from "@/lib/db";
import { decryptSecret, encryptSecret, getSecretPreview } from "@/lib/encryption";
import { isAiConfigured } from "@/lib/ai";
import type { UserAiProvider, UserAiSettings, UserAiSettingsPublic } from "@/types/ai-settings";
import { isUserAiProvider } from "@/types/ai-settings";

export function parseGuestAiSettingsBody(
  value: unknown,
): UserAiSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const body = value as {
    provider?: string;
    apiKey?: string;
    fallbackEnabled?: boolean;
  };

  if (!body.provider || !isUserAiProvider(body.provider)) {
    return null;
  }

  if (!body.apiKey?.trim()) {
    return null;
  }

  return {
    provider: body.provider,
    apiKey: body.apiKey.trim(),
    fallbackEnabled: body.fallbackEnabled !== false,
  };
}

export async function getUserAiSettingsForUserId(
  userId: number,
): Promise<UserAiSettings | null> {
  initDb();

  const [user] = await db
    .select({
      aiProvider: users.aiProvider,
      aiApiKeyEncrypted: users.aiApiKeyEncrypted,
      aiFallbackEnabled: users.aiFallbackEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.aiProvider || !user.aiApiKeyEncrypted) {
    return null;
  }

  if (!isUserAiProvider(user.aiProvider)) {
    return null;
  }

  try {
    const apiKey = decryptSecret(user.aiApiKeyEncrypted);

    if (!apiKey.trim()) {
      return null;
    }

    return {
      provider: user.aiProvider,
      apiKey: apiKey.trim(),
      fallbackEnabled: user.aiFallbackEnabled,
    };
  } catch (error) {
    console.error("[AnyTrack] Failed to decrypt user AI credentials:", error);
    return null;
  }
}

export async function getUserAiSettingsPublic(
  userId: number,
): Promise<UserAiSettingsPublic> {
  initDb();

  const [user] = await db
    .select({
      aiProvider: users.aiProvider,
      aiApiKeyEncrypted: users.aiApiKeyEncrypted,
      aiFallbackEnabled: users.aiFallbackEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let apiKeyPreview: string | null = null;

  if (user?.aiApiKeyEncrypted) {
    try {
      apiKeyPreview = getSecretPreview(decryptSecret(user.aiApiKeyEncrypted));
    } catch {
      apiKeyPreview = "••••";
    }
  }

  return {
    provider:
      user?.aiProvider && isUserAiProvider(user.aiProvider)
        ? user.aiProvider
        : null,
    hasApiKey: Boolean(user?.aiApiKeyEncrypted),
    apiKeyPreview,
    fallbackEnabled: user?.aiFallbackEnabled ?? true,
    hostedAiAvailable: isAiConfigured(),
  };
}

export async function saveUserAiSettings(
  userId: number,
  input: {
    provider?: UserAiProvider | null;
    apiKey?: string | null;
    fallbackEnabled?: boolean;
    clearApiKey?: boolean;
  },
): Promise<UserAiSettingsPublic> {
  initDb();

  const [existing] = await db
    .select({
      aiProvider: users.aiProvider,
      aiApiKeyEncrypted: users.aiApiKeyEncrypted,
      aiFallbackEnabled: users.aiFallbackEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  const nextProvider =
    input.provider !== undefined
      ? input.provider
      : existing.aiProvider && isUserAiProvider(existing.aiProvider)
        ? existing.aiProvider
        : null;

  const nextFallbackEnabled =
    input.fallbackEnabled !== undefined
      ? input.fallbackEnabled
      : existing.aiFallbackEnabled;

  let nextEncryptedKey = existing.aiApiKeyEncrypted;

  if (input.clearApiKey) {
    nextEncryptedKey = null;
  } else if (input.apiKey !== undefined) {
    const trimmed = input.apiKey?.trim() ?? "";

    if (trimmed) {
      nextEncryptedKey = encryptSecret(trimmed);
    }
  }

  if (nextEncryptedKey && !nextProvider) {
    throw new Error("Select a provider before saving an API key");
  }

  await db
    .update(users)
    .set({
      aiProvider: nextProvider,
      aiApiKeyEncrypted: nextEncryptedKey,
      aiFallbackEnabled: nextFallbackEnabled,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return getUserAiSettingsPublic(userId);
}

export async function clearUserAiSettings(userId: number) {
  initDb();

  await db
    .update(users)
    .set({
      aiProvider: null,
      aiApiKeyEncrypted: null,
      aiFallbackEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
