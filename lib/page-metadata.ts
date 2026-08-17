function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractMetaContent(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return undefined;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

export type PageMetadata = {
  title?: string;
  description?: string;
  hostname: string;
  pathname?: string;
};

export type ResolvedPageMetadata = PageMetadata & {
  metadataLimited: boolean;
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
};

function metadataFromUrl(url: string): PageMetadata {
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    pathname: parsed.pathname,
  };
}

export async function resolvePageMetadataForSuggestions(
  url: string,
): Promise<ResolvedPageMetadata> {
  const base = metadataFromUrl(url);

  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });

    if (!response.ok) {
      return { ...base, metadataLimited: true };
    }

    const html = await response.text();
    const title =
      extractMetaContent(html, "og:title") ??
      extractTitle(html) ??
      extractMetaContent(html, "twitter:title");
    const description =
      extractMetaContent(html, "og:description") ??
      extractMetaContent(html, "description") ??
      extractMetaContent(html, "twitter:description");

    return {
      ...base,
      title,
      description,
      metadataLimited: false,
    };
  } catch {
    return { ...base, metadataLimited: true };
  }
}

/** @deprecated Use resolvePageMetadataForSuggestions for graceful fallbacks. */
export async function fetchPageMetadata(url: string): Promise<PageMetadata> {
  const resolved = await resolvePageMetadataForSuggestions(url);

  if (resolved.metadataLimited && !resolved.title && !resolved.description) {
    throw new Error("Could not fetch page metadata");
  }

  return resolved;
}
