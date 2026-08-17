import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { parseGuestAiSettingsBody } from "@/lib/ai-user-settings";
import { validatePublicHttpUrl } from "@/lib/http-url";
import { scrapeTarget, ScrapeError } from "@/lib/scraper";
import { parseReferenceImageInput } from "@/lib/reference-images";

export async function POST(request: Request) {
  try {
    await initDb();

    const body = (await request.json()) as {
      url?: string;
      targetDescription?: string;
      referenceImage?: {
        data: string;
        mimeType?: string;
      };
      aiSettings?: unknown;
    };

    const url = body.url?.trim() ?? "";
    const targetDescription = body.targetDescription?.trim() ?? "";

    const urlError = validatePublicHttpUrl(url);
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 });
    }

    if (!targetDescription) {
      return NextResponse.json(
        { error: "Target description is required" },
        { status: 400 },
      );
    }

    let referenceImage: { buffer: Buffer; mimeType: string } | undefined;

    if (body.referenceImage?.data) {
      const parsed = parseReferenceImageInput(body.referenceImage);
      referenceImage = parsed;
    }

    const result = await scrapeTarget(url, targetDescription, {
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
      return NextResponse.json(
        {
          error: message,
          screenshotDataUrl: error.screenshot
            ? `data:image/jpeg;base64,${error.screenshot.toString("base64")}`
            : null,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
