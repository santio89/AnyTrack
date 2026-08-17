import { describe, expect, it } from "vitest";
import { parsePublicHttpUrl, validatePublicHttpUrl } from "@/lib/http-url";

describe("parsePublicHttpUrl", () => {
  it("accepts public https URLs", () => {
    expect(parsePublicHttpUrl("https://example.com/path")?.hostname).toBe(
      "example.com",
    );
  });

  it("rejects non-http protocols", () => {
    expect(parsePublicHttpUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects localhost and private IPs", () => {
    expect(parsePublicHttpUrl("http://localhost:3000")).toBeNull();
    expect(parsePublicHttpUrl("http://127.0.0.1")).toBeNull();
    expect(parsePublicHttpUrl("http://192.168.1.10")).toBeNull();
  });
});

describe("validatePublicHttpUrl", () => {
  it("returns an error for invalid URLs", () => {
    expect(validatePublicHttpUrl("")).toBe("URL is required");
    expect(validatePublicHttpUrl("not-a-url")).toBe(
      "URL must be a valid public http or https address",
    );
  });
});
