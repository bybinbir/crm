/**
 * AES-256-GCM column encryption helpers.
 *
 * Storage format (BYTEA):
 *
 *   ┌──────────┬───────────────┬───────────────┐
 *   │ nonce 12 │   tag 16      │ ciphertext N  │
 *   └──────────┴───────────────┴───────────────┘
 *
 * That layout makes the value self-describing: any consumer who has the
 * master key can decrypt by reading the first 28 bytes off the front. We
 * keep the format dense (no envelope JSON) because column scans on huge
 * invoice sets benefit from short payloads.
 *
 * Nonce policy:
 *   - 12 random bytes per encryption call.
 *   - 2^96 nonces × 1 key gives ~2^32 safe encryptions before collision risk
 *     (NIST SP 800-38D); for crmanaliz volumes this is comfortable.
 *
 * NEVER reuse `encryptString`'s nonce. Helpers here always generate fresh.
 */
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getMasterKey } from "./key";

const NONCE_LEN = 12;
const TAG_LEN = 16;
const ALGO = "aes-256-gcm";

export type EncryptedBuffer = Buffer;

/**
 * Encrypts a UTF-8 string. Returns a `Buffer` ready to be written to a
 * Postgres BYTEA column.
 *
 * Pass `null` or `undefined` to short-circuit and return `null`. This makes
 * call sites symmetric with API responses (`isim` etc. may legitimately be
 * absent).
 */
export function encryptString(plaintext: string | null | undefined): EncryptedBuffer | null {
  if (plaintext === null || plaintext === undefined) return null;
  const key = getMasterKey();
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv(ALGO, key, nonce);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, ct]);
}

/**
 * Inverse of `encryptString`. Returns `null` when the input is `null` /
 * `undefined`. Throws on tampered ciphertext (GCM auth tag failure).
 */
export function decryptString(blob: Buffer | Uint8Array | null | undefined): string | null {
  if (blob === null || blob === undefined) return null;
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  if (buf.length < NONCE_LEN + TAG_LEN) {
    throw new Error("encrypted blob is shorter than nonce+tag minimum");
  }
  const key = getMasterKey();
  const nonce = buf.subarray(0, NONCE_LEN);
  const tag = buf.subarray(NONCE_LEN, NONCE_LEN + TAG_LEN);
  const ct = buf.subarray(NONCE_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/**
 * Convenience: encrypt → hex. Useful for fixtures and test snapshots where
 * you want a printable representation. Production paths should prefer the
 * raw Buffer form to avoid double-encoding.
 */
export function encryptStringHex(plaintext: string | null | undefined): string | null {
  const buf = encryptString(plaintext);
  return buf ? buf.toString("hex") : null;
}

export function decryptStringHex(hex: string | null | undefined): string | null {
  if (hex === null || hex === undefined) return null;
  return decryptString(Buffer.from(hex, "hex"));
}
