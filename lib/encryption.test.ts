import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, getSecretPreview } from "@/lib/encryption";

describe("encryption", () => {
  it("encrypts and decrypts secrets", () => {
    const plaintext = "sk-test-openai-key-1234567890";
    const encrypted = encryptSecret(plaintext);

    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("masks secret previews", () => {
    expect(getSecretPreview("sk-abcdefghijklmnop")).toBe("••••mnop");
  });
});
