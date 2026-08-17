import { createChatCompletion, TEXT_MODEL } from "@/lib/ai";
import type { UserAiSettings } from "@/types/ai-settings";
import type { PageMetadata } from "@/lib/page-metadata";

function stripCodeFences(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? content).trim();
}

function humanizeSuggestion(value: string): string {
  return value
    .replace(/^[`"'[\s]+|[`"'\]\s]+$/g, "")
    .replace(/\\"/g, '"')
    .trim();
}

export function parseSuggestions(content: string): string[] {
  const stripped = stripCodeFences(content.trim());
  const jsonArrayMatch = stripped.match(/\[[\s\S]*\]/);

  if (jsonArrayMatch) {
    try {
      const parsed = JSON.parse(jsonArrayMatch[0]) as unknown;

      if (Array.isArray(parsed)) {
        const suggestions = parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => humanizeSuggestion(item))
          .filter(Boolean);

        if (suggestions.length > 0) {
          return suggestions.slice(0, 5);
        }
      }
    } catch {
      // Fall through to other parsers.
    }
  }

  try {
    const parsed = JSON.parse(stripped) as unknown;

    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => humanizeSuggestion(item))
        .filter(Boolean)
        .slice(0, 5);
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { suggestions?: unknown }).suggestions)
    ) {
      return ((parsed as { suggestions: unknown[] }).suggestions ?? [])
        .filter((item): item is string => typeof item === "string")
        .map((item) => humanizeSuggestion(item))
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch {
    // Fall through to line parsing.
  }

  return stripped
    .split("\n")
    .map((line) =>
      humanizeSuggestion(line.replace(/^[-*\d.)\s]+/, "").replace(/^["']|["']$/g, "")),
    )
    .filter((line) => line.length > 0 && !/^[[\]`{]/.test(line))
    .slice(0, 5);
}

export function buildFallbackSuggestions(metadata: PageMetadata): string[] {
  const host = metadata.hostname.replace(/^www\./, "");

  if (/amazon|ebay|shopify/i.test(host)) {
    return [
      "Current product price",
      "Product availability or stock status",
      "Product title",
    ];
  }

  if (/github/i.test(host)) {
    return ["Star count", "Latest release version", "Open issues count"];
  }

  if (/latam|avianca|aerolineas|iberia|ryanair|delta|united|americanairlines/i.test(host)) {
    return [
      "Lowest flight price shown",
      "Promotional fare or deal banner",
      "Route or destination headline",
    ];
  }

  if (/booking|expedia|kayak|skyscanner|despegar/i.test(host)) {
    return [
      "Displayed price for the selected dates",
      "Hotel or flight availability message",
      "Main offer or promotion text",
    ];
  }

  return [
    "Main headline or title on the page",
    "Primary price or number shown",
    "Key status message or availability text",
  ];
}

export async function suggestExtractionTargets(
  url: string,
  metadata: PageMetadata & { metadataLimited?: boolean },
  userAi?: UserAiSettings | null,
): Promise<string[]> {
  const limitedNote = metadata.metadataLimited
    ? "\nNote: The site blocked automated page access, so infer likely targets from the URL and domain only."
    : "";

  try {
    const { completion: response } = await createChatCompletion(
      {
        model: TEXT_MODEL,
        messages: [
        {
          role: "user",
          content: `You help users monitor websites. Given a URL and page metadata, suggest 3 concise extraction targets the user might want to track over time.

URL: ${url}
Site: ${metadata.hostname}
Path: ${metadata.pathname ?? "/"}
Page title: ${metadata.title ?? "unknown"}
Description: ${metadata.description ?? "unknown"}${limitedNote}

Reply with exactly 3 plain-language suggestions, one per line. Do not use JSON, markdown, bullets, or numbering.

Example:
Current product price
Stock availability
Product title`,
        },
      ],
      max_tokens: 200,
      temperature: 0.4,
      },
      { userAi },
    );

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return buildFallbackSuggestions(metadata);
    }

    const suggestions = parseSuggestions(content);
    return suggestions.length > 0 ? suggestions : buildFallbackSuggestions(metadata);
  } catch {
    return buildFallbackSuggestions(metadata);
  }
}
