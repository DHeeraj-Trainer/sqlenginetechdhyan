/**
 * AES-256-GCM encryption for stored MySQL passwords.
 *
 * Server-only. Never import from route or component code — the filename
 * suffix `.server.ts` is what keeps the client bundle from pulling it in.
 *
 * Format: base64( iv[12] || authTag[16] || ciphertext )
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

function key(): Buffer {
  const raw = process.env.MYSQL_CRED_KEY;
  if (!raw) throw new Error("MYSQL_CRED_KEY is not set");
  // The secret is a random 64-char string, not necessarily 32 bytes when
  // decoded. SHA-256 gives us a fixed-length key regardless of format.
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptPassword(plaintext: string): string {
  if (!plaintext) throw new Error("password required");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptPassword(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  if (buf.length < 12 + 16 + 1) throw new Error("ciphertext too short");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
