import fs from "node:fs";
import OpenAI from "openai";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  console.error("Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: "https://ai-gateway.vercel.sh/v1",
});

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function tryCall(label: string, params: OpenAI.Chat.ChatCompletionCreateParams) {
  try {
    const result = await client.chat.completions.create(params);
    console.log(`OK  ${label} -> ${result.choices[0]?.message?.content?.slice(0, 60)}`);
  } catch (error) {
    const err = error as { message?: string; status?: number; error?: { message?: string } };
    console.log(`FAIL ${label} -> ${err.message ?? err.error?.message ?? error}`);
  }
}

async function main() {
  const imagePart = {
    type: "image_url" as const,
    image_url: {
      url: `data:image/png;base64,${tinyPng}`,
      detail: "auto" as const,
    },
  };

  await tryCall("gpt-4o text only", {
    model: "gpt-4o",
    messages: [{ role: "user", content: "Say hi" }],
    max_tokens: 20,
  });

  await tryCall("openai/gpt-4o text only", {
    model: "openai/gpt-4o",
    messages: [{ role: "user", content: "Say hi" }],
    max_tokens: 20,
  });

  await tryCall("openai/gpt-4o vision", {
    model: "openai/gpt-4o",
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: "What color?" }, imagePart],
      },
    ],
    max_tokens: 20,
  });

  await tryCall("openai/gpt-4o vision + json", {
    model: "openai/gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: 'Return JSON: {"extracted_value":"x","confidence":1}',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract color" },
          imagePart,
        ],
      },
    ],
    max_tokens: 50,
  });

  await tryCall("openai/gpt-4o-mini vision + json", {
    model: "openai/gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: 'Return JSON {"extracted_value":"x","confidence":1}' },
          imagePart,
        ],
      },
    ],
    max_tokens: 50,
  });

  await tryCall("openai/gpt-4o jpeg data url", {
    model: "openai/gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "hi" },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${tinyPng}`,
              detail: "auto",
            },
          },
        ],
      },
    ],
    max_tokens: 20,
  });
}

main();
