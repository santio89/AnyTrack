import OpenAI from "openai";
import { chromium } from "playwright";

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  console.error("No API key");
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: "https://ai-gateway.vercel.sh/v1",
});

const tiny =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testModel(model: string, imageB64: string, extra: object = {}) {
  try {
    await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe briefly." },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${imageB64}`, detail: "auto" },
            },
          ],
        },
      ],
      max_tokens: 30,
      ...extra,
    });
    console.log(`${model} OK (${Math.round(imageB64.length / 1024)}kb b64)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`${model} FAIL: ${message}`);
  }
}

async function main() {
  console.log("--- tiny image ---");
  await testModel("openai/gpt-4o", tiny);
  await testModel("gpt-4o", tiny);

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.setContent("<html><body><h1>Price: $1,299</h1></body></html>");

  const fullPng = await page.screenshot({ fullPage: true, type: "png" });
  const viewportJpeg = await page.screenshot({ fullPage: false, type: "jpeg", quality: 75 });

  console.log("\n--- sizes ---");
  console.log("full png:", Math.round(fullPng.length / 1024), "KB");
  console.log("viewport jpeg:", Math.round(viewportJpeg.length / 1024), "KB");

  const bigB64 = fullPng.toString("base64");
  const smallB64 = viewportJpeg.toString("base64");

  console.log("\n--- large png ---");
  await testModel("openai/gpt-4o", bigB64);
  await testModel("openai/gpt-4o", bigB64, {
    response_format: { type: "json_object" },
  });

  console.log("\n--- viewport jpeg ---");
  await testModel("openai/gpt-4o", smallB64, {
    response_format: { type: "json_object" },
  });

  await browser.close();
}

main();
