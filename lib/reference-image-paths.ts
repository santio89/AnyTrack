export function parseReferenceImagePaths(
  stored: string | null | undefined,
  legacyPath?: string | null,
): string[] {
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // Fall through to legacy handling.
    }
  }

  return legacyPath ? [legacyPath] : [];
}

export function serializeReferenceImagePaths(paths: string[]): string | null {
  return paths.length > 0 ? JSON.stringify(paths) : null;
}
