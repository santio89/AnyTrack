import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import {
  getUserAiSettingsForUserId,
  parseGuestAiSettingsBody,
} from "@/lib/ai-user-settings";
import { getCurrentUserId } from "@/lib/auth/session";
import { resolvePageMetadataForSuggestions } from "@/lib/page-metadata";
import { suggestExtractionTargets } from "@/lib/suggest-targets";

export async function POST(request: Request) {
  try {
    initDb();

    const body = (await request.json()) as {
      url?: string;
      aiSettings?: unknown;
    };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
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
