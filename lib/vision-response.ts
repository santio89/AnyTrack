export type VisionFailureReason =
  | "login_required"
  | "blocked"
  | "loading"
  | "not_visible"
  | "not_found";

export type VisionResponsePayload = {
  extracted_value?: string;
  confidence?: number;
  failure_reason?: string;
};

export function parseVisionResponse(content: string): VisionResponsePayload {
  try {
    return JSON.parse(content) as VisionResponsePayload;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Vision model did not return valid JSON");
    }

    return JSON.parse(match[0]) as VisionResponsePayload;
  }
}

export function normalizeFailureReason(
  value: string | undefined,
): VisionFailureReason {
  switch (value) {
    case "login_required":
    case "blocked":
    case "loading":
    case "not_visible":
      return value;
    default:
      return "not_found";
  }
}

export function buildExtractionFailureMessage(
  reason: VisionFailureReason,
  targetDescription: string,
): string {
  switch (reason) {
    case "login_required":
      return `Could not extract "${targetDescription}" because signing in is required to view that content.`;
    case "blocked":
      return "The site blocked the automated request or showed a captcha.";
    case "loading":
      return "The page had not finished loading when the screenshot was taken.";
    case "not_visible":
      return `Could not read "${targetDescription}" from the screenshot. It may be off-screen or hidden.`;
    default:
      return `Could not find "${targetDescription}" on the page.`;
  }
}

export function isLikelyLoginWall(bodyText: string): boolean {
  if (/ingresa a\s*tu cuenta/i.test(bodyText)) {
    return true;
  }

  const words = bodyText.split(/\s+/).filter(Boolean);

  return (
    words.length < 40 &&
    /iniciar sesi[oó]n|log\s*in|sign\s*in/i.test(bodyText) &&
    /(?:correo|email|contrase|password|continue|continuar)/i.test(bodyText)
  );
}

export function parseVisionExtraction(
  content: string,
  targetDescription: string,
): { extractedValue: string; confidence: number } {
  const parsed = parseVisionResponse(content);
  const extractedValue = String(parsed.extracted_value ?? "").trim();
  const confidence = Number(parsed.confidence ?? 0);

  if (!extractedValue || confidence <= 0) {
    const failureReason = normalizeFailureReason(parsed.failure_reason);
    throw new Error(buildExtractionFailureMessage(failureReason, targetDescription));
  }

  return { extractedValue, confidence };
}
