/**
 * Session HMAC signing key loader.
 *
 * `SESSION_SIGNING_KEY` is a 32-byte (64 hex) secret reserved for
 * `lib/auth/session.ts` HMAC sign/verify. It is INTENTIONALLY DECOUPLED
 * from `PII_MASTER_KEY` (used by `lib/crypto/key.ts` for AES-256-GCM
 * column encryption) so the blast radius of a leak stays scoped:
 *
 *   - PII_MASTER_KEY leak       → PII columns decryptable; sessions still safe.
 *   - SESSION_SIGNING_KEY leak  → session forgery possible; PII still safe.
 *
 * Both keys must be rotated independently and never share a value
 * (enforced in `lib/config.ts` via a Zod superRefine).
 *
 * Validation cadence:
 *   - Format check by Zod regex on env load (`lib/config.ts`).
 *   - 32-byte length re-check on each lazy load here.
 *   - Production fail-fast: if SESSION_SIGNING_KEY is missing or malformed,
 *     `loadConfig()` throws before any request handler runs.
 */
import { Buffer } from "node:buffer";
import { config } from "@/lib/config";
import { ConfigError } from "@/lib/issmanager/errors";

let cachedKey: Buffer | undefined;

/** Returns the 32-byte session signing key, validating shape on first call. */
export function getSessionSigningKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = config.sessionSigningKeyHex;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    // Defence in depth: config Zod already enforces this; we re-check at the
    // boundary so a future code path that bypasses config still fails closed.
    // The error message NEVER includes the key value, only its structural defect.
    throw new ConfigError(
      "SESSION_SIGNING_KEY must be 64 hex chars (32 bytes). Generate with: " +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  cachedKey = Buffer.from(hex, "hex");
  if (cachedKey.length !== 32) {
    throw new ConfigError("SESSION_SIGNING_KEY decoded to non-32-byte buffer");
  }
  return cachedKey;
}

/** Test hook: forget the cached key so a new env can be picked up. */
export function __resetSessionSigningKeyForTests(): void {
  cachedKey = undefined;
}
