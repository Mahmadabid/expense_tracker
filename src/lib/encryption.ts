import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended length for GCM

function getKey(): Buffer {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("DATA_ENCRYPTION_KEY is not set in environment variables");
  }

  const normalized = key.trim();

  if (/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    const decoded = Buffer.from(normalized, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  }

  const buffer = Buffer.from(normalized);
  if (buffer.length < 32) {
    return Buffer.concat([buffer, Buffer.alloc(32 - buffer.length)]);
  }
  return buffer.subarray(0, 32);
}

export function encrypt(plaintext: string) {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string) {
  const key = getKey();
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = data.subarray(IV_LENGTH + 16);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
