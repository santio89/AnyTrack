import { describe, expect, it } from "vitest";
import {
  parseReferenceImagePaths,
  serializeReferenceImagePaths,
} from "@/lib/reference-image-paths";
import { stripUrlParams } from "@/lib/utils";

describe("utils", () => {
  it("strips query params and hash from urls", () => {
    expect(stripUrlParams("https://example.com/path?foo=1#section")).toBe(
      "https://example.com/path",
    );
  });
});

describe("reference image paths", () => {
  it("parses json arrays", () => {
    expect(parseReferenceImagePaths('["a.jpg","b.jpg"]')).toEqual([
      "a.jpg",
      "b.jpg",
    ]);
  });

  it("falls back to legacy single path", () => {
    expect(parseReferenceImagePaths(null, "legacy.jpg")).toEqual(["legacy.jpg"]);
  });

  it("serializes non-empty arrays", () => {
    expect(serializeReferenceImagePaths(["a.jpg"])).toBe('["a.jpg"]');
    expect(serializeReferenceImagePaths([])).toBeNull();
  });
});
