import { beforeAll, describe, it, expect } from "vitest";
import { Buffer } from "node:buffer";

beforeAll(() => {
  const env = process.env as Record<string, string>;
  env["NODE_ENV"] = "test";
  env["LOG_LEVEL"] = "silent";
  env["ISSMANAGER_BASE_URL"] = "http://example.invalid/api";
  env["ISSMANAGER_CLIENT_ID"] = "iss_v2_testtesttesttest";
  env["ISSMANAGER_CLIENT_SECRET"] = "test-secret";
  env["DATABASE_URL"] = "postgres://u:p@localhost:5432/db";
  env["PII_MASTER_KEY"] =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("crypto.encryptString / decryptString", () => {
  it("round-trips ASCII text", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto/encrypt");
    const blob = encryptString("hello world");
    expect(blob).toBeInstanceOf(Buffer);
    expect(decryptString(blob!)).toBe("hello world");
  });

  it("round-trips UTF-8 with multi-byte characters", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto/encrypt");
    const plaintext = "merhaba dunya — 1234";
    const blob = encryptString(plaintext);
    expect(decryptString(blob!)).toBe(plaintext);
  });

  it("returns null for null/undefined input", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto/encrypt");
    expect(encryptString(null)).toBeNull();
    expect(encryptString(undefined)).toBeNull();
    expect(decryptString(null)).toBeNull();
    expect(decryptString(undefined)).toBeNull();
  });

  it("uses a fresh nonce on each encryption", async () => {
    const { encryptString } = await import("@/lib/crypto/encrypt");
    const a = encryptString("repeat me");
    const b = encryptString("repeat me");
    expect(a!.equals(b!)).toBe(false);
  });

  it("rejects truncated ciphertext", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto/encrypt");
    const blob = encryptString("hello");
    expect(() => decryptString(blob!.subarray(0, 10))).toThrow();
  });

  it("rejects tampered ciphertext (auth tag fails)", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto/encrypt");
    const blob = encryptString("hello");
    const t = Buffer.from(blob!);
    t[t.length - 1] = (t[t.length - 1] ?? 0) ^ 0xff;
    expect(() => decryptString(t)).toThrow();
  });

  it("supports hex round-trip helpers", async () => {
    const { encryptStringHex, decryptStringHex } = await import("@/lib/crypto/encrypt");
    const hex = encryptStringHex("merhaba");
    expect(typeof hex).toBe("string");
    expect(decryptStringHex(hex)).toBe("merhaba");
  });

  it("encrypts the empty string", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto/encrypt");
    const blob = encryptString("");
    expect(blob).toBeInstanceOf(Buffer);
    expect(blob!.length).toBe(28);
    expect(decryptString(blob!)).toBe("");
  });
});
