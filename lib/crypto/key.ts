/**
 * Master key loader for column-level encryption.
 *
 * The key lives in `PII_MASTER_KEY` as a 64-character hex string (32 bytes,
 * AES-256-GCM key length). We do not derive sub-keys per column — KVKK
 * scope here is "encrypt PII at rest with AES-256-GCM"; HKDF-style
 * separation is reserved for M3 when role-scoped keys land.
 */
import { Buffer } from "node:buffer";
import { config } from "@/lib/config";
import { ConfigError } from "@/lib/issmanager/errors";

let cachedKey: Buffer | undefined;

export function getMasterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = config.piiMasterKeyHex;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new ConfigError(
      "PII_MASTER_KEY must be 64 hex chars (32 bytes). Generate with: " +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  cachedKey = Buffer.from(hex, "hex");
  if (cachedKey.length !== 32) {
    throw new ConfigError("PII_MASTER_KEY decoded to non-32-byte buffer");
  }
  return cachedKey;
}

/** Test hook: forget the cached key so a new env can be picked up. */
export function __resetMasterKeyForTests(): void {
  cachedKey = undefined;
}
