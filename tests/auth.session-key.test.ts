/**
 * Tests for SESSION_SIGNING_KEY decoupling from PII_MASTER_KEY.
 *
 * Covers (M5 madde 1):
 *   - Sign + verify happy path with a dedicated SESSION_SIGNING_KEY.
 *   - Wrong SESSION_SIGNING_KEY rejects an otherwise-valid session.
 *   - PII_MASTER_KEY drift does NOT affect session verify (proves decoupling).
 *   - Missing SESSION_SIGNING_KEY in production triggers fail-fast.
 *   - Malformed SESSION_SIGNING_KEY in production triggers fail-fast.
 *   - Reusing PII_MASTER_KEY as SESSION_SIGNING_KEY is rejected by config.
 *   - Redaction list masks SESSION_SIGNING_KEY field names.
 *   - Error path does not leak the key value.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { redactDeep } from "@/lib/issmanager/redaction";

const KEY_A = "1111111111111111111111111111111111111111111111111111111111111111";
const KEY_B = "2222222222222222222222222222222222222222222222222222222222222222";
const KEY_C = "3333333333333333333333333333333333333333333333333333333333333333";

function setEnv(overrides: Record<string, string | undefined>): void {
  const env = process.env as Record<string, string | undefined>;
  env["NODE_ENV"] = "test";
  env["LOG_LEVEL"] = "silent";
  env["ISSMANAGER_BASE_URL"] = "http://example.invalid/api";
  env["ISSMANAGER_CLIENT_ID"] = "iss_v2_testtesttesttest";
  env["ISSMANAGER_CLIENT_SECRET"] = "test-secret";
  env["DATABASE_URL"] = "postgres://u:p@localhost:5432/db";
  env["PII_MASTER_KEY"] = KEY_A;
  env["SESSION_SIGNING_KEY"] = KEY_B;
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
}

async function freshConfigAndKeyModules(): Promise<{
  loadConfig: () => unknown;
  __resetConfigForTests: () => void;
  getSessionSigningKey: () => Buffer;
  __resetSessionSigningKeyForTests: () => void;
}> {
  const cfg = await import("@/lib/config");
  const key = await import("@/lib/auth/key");
  cfg.__resetConfigForTests();
  key.__resetSessionSigningKeyForTests();
  return {
    loadConfig: cfg.loadConfig,
    __resetConfigForTests: cfg.__resetConfigForTests,
    getSessionSigningKey: key.getSessionSigningKey,
    __resetSessionSigningKeyForTests: key.__resetSessionSigningKeyForTests,
  };
}

function sign(payload: string, key: Buffer): string {
  const sig = createHmac("sha256", key).update(payload).digest().toString("base64url");
  return `${payload}.${sig}`;
}
function verify(token: string, key: Buffer): boolean {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", key).update(payload).digest().toString("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

describe("SESSION_SIGNING_KEY decoupled from PII_MASTER_KEY", () => {
  beforeEach(() => {
    setEnv({});
  });

  it("signs and verifies a session with the dedicated session signing key", async () => {
    const { getSessionSigningKey } = await freshConfigAndKeyModules();
    const k = getSessionSigningKey();
    expect(k.length).toBe(32);
    const token = sign("payload-A", k);
    expect(verify(token, k)).toBe(true);
  });

  it("rejects a token signed with a different SESSION_SIGNING_KEY", async () => {
    const { getSessionSigningKey } = await freshConfigAndKeyModules();
    const real = getSessionSigningKey();
    const attacker = Buffer.from(KEY_C, "hex");
    const forged = sign("payload-B", attacker);
    expect(verify(forged, real)).toBe(false);
  });

  it("survives PII_MASTER_KEY rotation: session verify still works", async () => {
    const m1 = await freshConfigAndKeyModules();
    const sessionKey1 = m1.getSessionSigningKey();
    const token = sign("payload-stable", sessionKey1);

    setEnv({ PII_MASTER_KEY: KEY_C, SESSION_SIGNING_KEY: KEY_B });
    const m2 = await freshConfigAndKeyModules();
    const sessionKey2 = m2.getSessionSigningKey();

    expect(sessionKey2.equals(sessionKey1)).toBe(true);
    expect(verify(token, sessionKey2)).toBe(true);
  });

  it("fails fast in production when SESSION_SIGNING_KEY is missing", async () => {
    setEnv({ NODE_ENV: "production", SESSION_SIGNING_KEY: undefined });
    const { loadConfig, __resetConfigForTests } = await freshConfigAndKeyModules();
    __resetConfigForTests();
    expect(() => loadConfig()).toThrowError(/SESSION_SIGNING_KEY/);
  });

  it("fails fast in production when SESSION_SIGNING_KEY is malformed", async () => {
    setEnv({ NODE_ENV: "production", SESSION_SIGNING_KEY: "not-hex-at-all" });
    const { loadConfig, __resetConfigForTests } = await freshConfigAndKeyModules();
    __resetConfigForTests();
    expect(() => loadConfig()).toThrowError(
      /SESSION_SIGNING_KEY must be 64 hex characters/
    );
  });

  it("rejects reusing PII_MASTER_KEY as SESSION_SIGNING_KEY (config superRefine)", async () => {
    setEnv({ SESSION_SIGNING_KEY: KEY_A }); // same as PII_MASTER_KEY
    const { loadConfig, __resetConfigForTests } = await freshConfigAndKeyModules();
    __resetConfigForTests();
    expect(() => loadConfig()).toThrowError(/must differ from PII_MASTER_KEY/);
  });

  it("redacts SESSION_SIGNING_KEY field names in arbitrary log payloads", () => {
    const out = redactDeep({
      session_signing_key: KEY_B,
      sessionSigningKey: KEY_B,
      SESSION_SIGNING_KEY: KEY_B,
      not_a_secret: "ok",
    });
    expect(out.session_signing_key).toBe("[REDACTED]");
    expect(out.sessionSigningKey).toBe("[REDACTED]");
    expect(out.SESSION_SIGNING_KEY).toBe("[REDACTED]");
    expect(out.not_a_secret).toBe("ok");
  });

  it("error path does not leak the key value", async () => {
    setEnv({ SESSION_SIGNING_KEY: "ZZZ-not-hex" });
    const { loadConfig, __resetConfigForTests } = await freshConfigAndKeyModules();
    __resetConfigForTests();
    let caught: unknown;
    try {
      loadConfig();
    } catch (e) {
      caught = e;
    }
    const message = caught instanceof Error ? caught.message : String(caught);
    expect(message).toMatch(/SESSION_SIGNING_KEY/);
    expect(message).not.toContain("ZZZ-not-hex");
  });
});
