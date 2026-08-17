const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(normalized)) {
    return true;
  }

  if (normalized.endsWith(".localhost")) {
    return true;
  }

  if (normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  return isPrivateIpv4(normalized);
}

export function parsePublicHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    if (!parsed.hostname || isBlockedHostname(parsed.hostname)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function validatePublicHttpUrl(url: string): string | null {
  const trimmed = url.trim();

  if (!trimmed) {
    return "URL is required";
  }

  if (!parsePublicHttpUrl(trimmed)) {
    return "URL must be a valid public http or https address";
  }

  return null;
}
