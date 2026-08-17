import { createChatCompletion, encodeLogModel, VISION_MODEL } from "@/lib/ai";
import type { UserAiSettings } from "@/types/ai-settings";
import {
  getDomainFromUrl,
  getStorageStateForUrl,
  saveSession,
} from "@/lib/sessions";
import { loadReferenceImage } from "@/lib/reference-images";
import { dismissBlockingOverlays } from "@/lib/scrape-overlays";
import { stripUrlParams } from "@/lib/utils";
import {
  buildExtractionFailureMessage,
  isLikelyLoginWall,
  normalizeFailureReason,
  parseVisionResponse,
} from "@/lib/vision-response";
import type OpenAI from "openai";
import { chromium, type Browser } from "playwright";

export interface ScrapeResult {
  extractedValue: string;
  confidence: number;
  model: string;
  screenshot: Buffer;
}

export class ScrapeError extends Error {
  screenshot?: Buffer;

  constructor(message: string, screenshot?: Buffer) {
    super(message);
    this.name = "ScrapeError";
    this.screenshot = screenshot;
  }
}

let browserInstance: Browser | null = null;
let browserHeadless: boolean | null = null;

type BrowserResult = { browser: Browser; actualHeadless: boolean };

async function getBrowser(headed = false): Promise<BrowserResult> {
  let headless = !headed;

  if (headed && !process.env.DISPLAY && process.platform === "linux") {
    console.warn(
      "[AnyTrack] Headed mode requested but no DISPLAY available — falling back to headless",
    );
    headless = true;
  }

  if (
    browserInstance &&
    browserInstance.isConnected() &&
    browserHeadless === headless
  ) {
    return { browser: browserInstance, actualHeadless: headless };
  }

  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }

  const launchOptions = {
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-font-subpixel-positioning",
      "--font-render-hinting=none",
    ],
  };

  try {
    browserInstance = await chromium.launch({
      ...launchOptions,
      channel: "chrome",
    });
  } catch {
    browserInstance = await chromium.launch(launchOptions);
  }

  browserHeadless = headless;
  return { browser: browserInstance, actualHeadless: headless };
}


async function isLoginWall(page: import("playwright").Page): Promise<boolean> {
  const bodyText = await page.locator("body").innerText();
  return isLikelyLoginWall(bodyText);
}

async function waitForSignInIfHeaded(
  page: import("playwright").Page,
  headed: boolean,
) {
  if (!headed || !(await isLoginWall(page))) {
    return;
  }

  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    if (!(await isLoginWall(page))) {
      return;
    }
  }
}

async function captureVisionScreenshot(
  page: import("playwright").Page,
): Promise<Buffer> {
  const maxBytes = 3.5 * 1024 * 1024;
  const qualities = [80, 60, 45];

  let cdp: import("playwright").CDPSession | null = null;

  try {
    cdp = await page.context().newCDPSession(page);

    for (const quality of qualities) {
      const { data } = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality,
        captureBeyondViewport: false,
      });

      const buffer = Buffer.from(data, "base64");

      if (buffer.length <= maxBytes) {
        return buffer;
      }
    }

    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 35,
      captureBeyondViewport: false,
    });

    return Buffer.from(data, "base64");
  } finally {
    if (cdp) {
      await cdp.detach().catch(() => undefined);
    }
  }
}

function buildVisionPrompt(
  url: string,
  targetDescription: string,
  hasReferenceImage: boolean,
): string {
  if (hasReferenceImage) {
    return `You are a precise web data extraction assistant. Analyze the screenshots and extract the requested data.

Target URL: ${url}
Extract the following (the request may be in English, Spanish, or another language): ${targetDescription}

The FIRST image is a reference screenshot from the user showing which element on the page to extract.
The SECOND image is the current live screenshot from the same URL.

Find the same element shown in the reference image and extract the requested value from the current screenshot.

Reply with ONLY valid JSON in this exact shape (no markdown, no prose):
{"extracted_value":"the extracted value as a string","confidence":0.0,"failure_reason":"none"}

Rules:
- If you successfully extract the requested data, set failure_reason to "none" and confidence above 0.
- Extract visible data even when the page also shows header links like "Log in" or "Sign in".
- Only use failure_reason "login_required" when the requested data is actually behind sign-in, hidden by a login modal, or the page explicitly requires authentication to view that specific content.
- Use "not_found" when the page loaded but the requested element is not present.
- Use "not_visible" when the data may exist but is not readable in the screenshot.
- Use "blocked" for captcha, access denied, or bot-check pages.
- Use "loading" for loading states or mostly empty pages.
- If the data cannot be extracted, use an empty string for extracted_value, 0 for confidence, and the most accurate failure_reason.`;
  }

  return `You are a precise web data extraction assistant. Analyze the screenshot and extract the requested data.

Target URL: ${url}
Extract the following (the request may be in English, Spanish, or another language): ${targetDescription}

Reply with ONLY valid JSON in this exact shape (no markdown, no prose):
{"extracted_value":"the extracted value as a string","confidence":0.0,"failure_reason":"none"}

Rules:
- If you successfully extract the requested data, set failure_reason to "none" and confidence above 0.
- Extract visible data even when the page also shows header links like "Log in" or "Sign in".
- Only use failure_reason "login_required" when the requested data is actually behind sign-in, hidden by a login modal, or the page explicitly requires authentication to view that specific content.
- Use "not_found" when the page loaded but the requested element is not present.
- Use "not_visible" when the data may exist but is not readable in the screenshot.
- Use "blocked" for captcha, access denied, or bot-check pages.
- Use "loading" for loading states or mostly empty pages.
- If the data cannot be extracted, use an empty string for extracted_value, 0 for confidence, and the most accurate failure_reason.`;
}

export type ScrapeOptions = {
  headed?: boolean;
  referenceImagePath?: string | null;
  referenceImage?: { buffer: Buffer; mimeType: string } | null;
  userAi?: UserAiSettings | null;
  sessionUserId?: number | null;
};

async function extractWithVision(
  url: string,
  targetDescription: string,
  screenshot: Buffer,
  options: Pick<
    ScrapeOptions,
    "referenceImagePath" | "referenceImage" | "userAi"
  > = {},
): Promise<{ extractedValue: string; confidence: number; model: string }> {
  const referenceImage =
    options.referenceImage ??
    (await loadReferenceImage(options.referenceImagePath));
  const liveBase64 = screenshot.toString("base64");

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: buildVisionPrompt(url, targetDescription, Boolean(referenceImage)),
    },
  ];

  if (referenceImage) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${referenceImage.mimeType};base64,${referenceImage.buffer.toString("base64")}`,
        detail: "auto",
      },
    });
  }

  content.push({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${liveBase64}`,
      detail: "auto",
    },
  });

  let response;
  let modelUsed: string;

  try {
    const result = await createChatCompletion(
      {
        model: VISION_MODEL,
        messages: [{ role: "user", content }],
        max_tokens: 500,
      },
      { userAi: options.userAi },
    );
    response = result.completion;
    modelUsed = encodeLogModel(result.model, result.via);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vision API request failed";
    throw new ScrapeError(
      `${message} (screenshot: ${Math.round(screenshot.length / 1024)} KB)`,
      screenshot,
    );
  }

  const responseContent = response.choices[0]?.message?.content;

  if (!responseContent) {
    throw new ScrapeError("Vision model returned an empty response", screenshot);
  }

  const parsed = parseVisionResponse(responseContent);
  const extractedValue = String(parsed.extracted_value ?? "").trim();
  const confidence = Number(parsed.confidence ?? 0);

  if (!extractedValue || confidence <= 0) {
    const failureReason = normalizeFailureReason(parsed.failure_reason);
    throw new ScrapeError(
      buildExtractionFailureMessage(failureReason, targetDescription),
      screenshot,
    );
  }

  return { extractedValue, confidence, model: modelUsed };
}

async function scrapeOnce(
  url: string,
  targetDescription: string,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  return Promise.race([
    scrapeOnceInner(url, targetDescription, options),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new ScrapeError("Scrape timed out")),
        240_000,
      ),
    ),
  ]);
}

async function scrapeOnceInner(
  url: string,
  targetDescription: string,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const { browser, actualHeadless } = await getBrowser(options.headed ?? false);
  const isHeaded = !actualHeadless;
  const domain = getDomainFromUrl(url);
  const storageState = await getStorageStateForUrl(url, options.sessionUserId);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    },
    ...(storageState ? { storageState } : {}),
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);

    await dismissBlockingOverlays(page);
    await page.waitForTimeout(isHeaded ? 3000 : 2000);
    await dismissBlockingOverlays(page);
    await waitForSignInIfHeaded(page, isHeaded);

    if (!isHeaded) {
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.textContent =
          "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;}";
        document.head.appendChild(style);

        for (const el of document.querySelectorAll("*")) {
          (el as HTMLElement).style.animationPlayState = "paused";
        }

        window.requestAnimationFrame = () => 0;
        window.requestIdleCallback = (cb: TimerHandler) => setTimeout(cb, 0);
        window.cancelAnimationFrame = () => {};
        window.cancelIdleCallback = () => {};

        for (const obj of [window, document, document.body, document.documentElement]) {
          if (obj) {
            for (const key of Object.getOwnPropertyNames(obj)) {
              if (typeof key === "string" && key.startsWith("on") && key.length > 2) {
                try {
                  (obj as unknown as Record<string, unknown>)[key] = null;
                } catch {}
              }
            }
          }
        }
      });
    }

    const screenshot = await captureVisionScreenshot(page);
    const visionResult = await extractWithVision(
      url,
      targetDescription,
      screenshot,
      options,
    );

    return {
      ...visionResult,
      screenshot,
    };
  } finally {
    if (isHeaded && options.sessionUserId != null) {
      try {
        await saveSession(
          options.sessionUserId,
          domain,
          await context.storageState(),
        );
      } catch (error) {
        console.warn("[AnyTrack] Could not save session from visible browser run:", error);
      }
    }

    await context.close();
  }
}

export async function scrapeTarget(
  url: string,
  targetDescription: string,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  try {
    return await scrapeOnce(url, targetDescription, options);
  } catch (firstError) {
    const strippedUrl = stripUrlParams(url);

    if (strippedUrl === url) {
      throw firstError;
    }

    try {
      return await scrapeOnce(strippedUrl, targetDescription, options);
    } catch {
      throw firstError;
    }
  }
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    browserHeadless = null;
  }
}
