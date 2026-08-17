import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import {
  getUserAiSettingsForUserId,
  parseGuestAiSettingsBody,
} from "@/lib/ai-user-settings";
import { getCurrentUserId } from "@/lib/auth/session";
import { validatePublicHttpUrl } from "@/lib/http-url";
import { resolvePageMetadataForSuggestions } from "@/lib/page-metadata";
import { suggestExtractionTargets } from "@/lib/suggest-targets";

export async function POST(request: Request) {
  try {
    await initDb();

    const body = (await request.json()) as {
      url?: string;
      aiSettings?: unknown;
    };
    const url = body.url?.trim() ?? "";
    const urlError = validatePublicHttpUrl(url);
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 });
    }

    const metadata = await resolvePageMetadataForSuggestions(url);
    const userId = await getCurrentUserId();
    const userAi = userId
      ? await getUserAiSettingsForUserId(userId)
      : parseGuestAiSettingsBody(body.aiSettings);
    const suggestions = await suggestExtractionTargets(url, metadata, userAi);

    return NextResponse.json({
      suggestions,
      metadata,
      metadataLimited: metadata.metadataLimited,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to suggest extraction targets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
