import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import {
  clearUserAiSettings,
  getUserAiSettingsPublic,
  saveUserAiSettings,
} from "@/lib/ai-user-settings";
import { isAiConfigured } from "@/lib/ai";
import {
  getCurrentUserId,
  requireUserId,
  unauthorizedResponse,
} from "@/lib/auth/session";
import { isUserAiProvider } from "@/types/ai-settings";

export async function GET() {
  try {
    await initDb();
    const userId = await getCurrentUserId();

    if (userId == null) {
      return unauthorizedResponse();
    }

    const settings = await getUserAiSettingsPublic(userId);

    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load AI settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDb();
    const userId = await requireUserId();

    const body = (await request.json()) as {
      provider?: string | null;
      apiKey?: string | null;
      fallbackEnabled?: boolean;
      clearApiKey?: boolean;
    };

    if (
      body.provider != null &&
      body.provider !== "" &&
      !isUserAiProvider(body.provider)
    ) {
      return NextResponse.json({ error: "Invalid AI provider" }, { status: 400 });
    }

    const settings = await saveUserAiSettings(userId, {
      provider:
        body.provider === ""
          ? null
          : body.provider && isUserAiProvider(body.provider)
            ? body.provider
            : undefined,
      apiKey: body.apiKey,
      fallbackEnabled: body.fallbackEnabled,
      clearApiKey: body.clearApiKey === true,
    });

    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save AI settings";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  try {
    await initDb();
    const userId = await requireUserId();
    await clearUserAiSettings(userId);

    return NextResponse.json({
      provider: null,
      hasApiKey: false,
      apiKeyPreview: null,
      fallbackEnabled: true,
      hostedAiAvailable: isAiConfigured(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to clear AI settings";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
