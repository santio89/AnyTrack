import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { parseGuestAiSettingsBody } from "@/lib/ai-user-settings";
import { scrapeTarget, ScrapeError } from "@/lib/scraper";
import { parseReferenceImageInput } from "@/lib/reference-images";

export async function POST(request: Request) {
  try {
    initDb();

    const body = (await request.json()) as {
      url?: string;
      targetDescription?: string;
      headed?: boolean;
      referenceImage?: {
        data: string;
        mimeType?: string;
      };
      aiSettings?: unknown;
    };

    const url = body.url?.trim();
    const targetDescription = body.targetDescription?.trim();

    if (!url || !targetDescription) {
      return NextResponse.json(
        { error: "URL and target description are required" },
        { status: 400 },
      );
    }

    let referenceImage: { buffer: Buffer; mimeType: string } | undefined;

    if (body.referenceImage?.data) {
      const parsed = parseReferenceImageInput(body.referenceImage);
      referenceImage = parsed;
    }

    const result = await scrapeTarget(url, targetDescription, {
      headed: body.headed === true,
      referenceImage: referenceImage ?? null,
      userAi: parseGuestAiSettingsBody(body.aiSettings),
    });

    return NextResponse.json({
      extractedValue: result.extractedValue,
      confidence: result.confidence,
      model: result.model,
      screenshotDataUrl: `data:image/jpeg;base64,${result.screenshot.toString("base64")}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Guest scrape failed";

    if (error instanceof ScrapeError) {
      return NextResponse.json({
        error: message,
        screenshotDataUrl: error.screenshot
          ? `data:image/jpeg;base64,${error.screenshot.toString("base64")}`
          : null,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
