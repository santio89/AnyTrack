import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

type EncryptedPayload = {
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

function getEncryptionKey(): Buffer {
  const raw = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;

  if (raw) {
    const key = Buffer.from(raw, "base64");

    if (key.length !== 32) {
      throw new Error(
        "AI_CREDENTIALS_ENCRYPTION_KEY must be 32 bytes encoded as base64",
      );
    }

    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AI_CREDENTIALS_ENCRYPTION_KEY is required in production to store user API keys",
    );
  }

  return scryptSync("anytrack-dev-ai-credentials", "anytrack-dev-salt", 32);
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };

  return JSON.stringify(payload);
}

export function decryptSecret(serialized: string): string {
  const payload = JSON.parse(serialized) as EncryptedPayload;

  if (payload.v !== 1) {
    throw new Error("Unsupported encrypted payload version");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function getSecretPreview(secret: string): string {
  const trimmed = secret.trim();

  if (trimmed.length <= 4) {
    return "••••";
  }

  return `••••${trimmed.slice(-4)}`;
}
