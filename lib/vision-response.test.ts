import { describe, expect, it } from "vitest";
import {
  buildExtractionFailureMessage,
  isLikelyLoginWall,
  normalizeFailureReason,
  parseVisionExtraction,
  parseVisionResponse,
} from "@/lib/vision-response";

describe("vision response parsing", () => {
  it("parses valid json payloads", () => {
    expect(
      parseVisionResponse(
        '{"extracted_value":"$19.99","confidence":0.92,"failure_reason":"none"}',
      ),
    ).toMatchObject({
      extracted_value: "$19.99",
      confidence: 0.92,
    });
  });

  it("extracts json embedded in prose", () => {
    expect(
      parseVisionResponse('Here is the result: {"extracted_value":"42","confidence":0.8}'),
    ).toMatchObject({
      extracted_value: "42",
    });
  });

  it("normalizes unknown failure reasons", () => {
    expect(normalizeFailureReason("weird")).toBe("not_found");
    expect(normalizeFailureReason("blocked")).toBe("blocked");
  });

  it("builds user-facing failure messages", () => {
    expect(buildExtractionFailureMessage("blocked", "price")).toContain("blocked");
  });

  it("throws when extraction payload is empty", () => {
    expect(() =>
      parseVisionExtraction(
        '{"extracted_value":"","confidence":0,"failure_reason":"not_found"}',
        "price",
      ),
    ).toThrow(/Could not find/);
  });
});

describe("login wall detection", () => {
  it("detects short login forms", () => {
    expect(
      isLikelyLoginWall("Sign in\nEmail\nPassword\nContinue"),
    ).toBe(true);
  });

  it("ignores normal product pages", () => {
    expect(
      isLikelyLoginWall(
        "Wireless headphones with active noise cancellation and 30 hour battery life. Free shipping nationwide.",
      ),
    ).toBe(false);
  });
});
