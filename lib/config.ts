/**
 * Zod-validated environment loader.
 *
 * Single source of truth for runtime config. Importing this module fails fast
 * with a precise error if any required variable is missing or malformed —
 * we'd rather the process refuse to start than silently misbehave.
 *
 * Usage:
 *   import { config } from "@/lib/config";
 *   await fetch(config.issmanager.baseUrl + "/iss/v2/health");
 *
 * Tests: replace `process.env` before importing.
 */
import { z } from "zod";

const Schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  // ─── ISS Manager ────────────────────────────────────────────────────────
  ISSMANAGER_BASE_URL: z.string().url(),
  ISSMANAGER_CLIENT_ID: z.string().min(1, "ISSMANAGER_CLIENT_ID is required"),
  ISSMANAGER_CLIENT_SECRET: z
    .string()
    .min(1, "ISSMANAGER_CLIENT_SECRET is required"),
  ISSMANAGER_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  ISSMANAGER_MAX_RETRY: z.coerce.number().int().min(0).max(10).default(3),

  // ─── Database ───────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((s) => s.startsWith("postgres://") || s.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a postgres:// connection string",
    }),

  // ─── Encryption ─────────────────────────────────────────────────────────
  // 32 bytes = 64 hex chars. AES-256-GCM key length.
  PII_MASTER_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "PII_MASTER_KEY must be 64 hex characters (32 bytes)"),

  // ─── Session HMAC signing ──────────────────────────────────────────────
  // 32 bytes = 64 hex chars, used by `lib/auth/session.ts` for HMAC sign/verify.
  // INTENTIONALLY DECOUPLED from PII_MASTER_KEY: a leak of one key must not
  // compromise the other (see `lib/auth/key.ts` doc comment for rationale).
  SESSION_SIGNING_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      "SESSION_SIGNING_KEY must be 64 hex characters (32 bytes)"
    ),
}).superRefine((data, ctx) => {
  // Same-secret reuse defeats the whole point of having two keys.
  if (data.SESSION_SIGNING_KEY === data.PII_MASTER_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_SIGNING_KEY"],
      message:
        "SESSION_SIGNING_KEY must differ from PII_MASTER_KEY (do not reuse the same secret)",
    });
  }
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  logLevel: z.infer<typeof Schema>["LOG_LEVEL"];
  issmanager: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    timeoutMs: number;
    maxRetry: number;
  };
  databaseUrl: string;
  piiMasterKeyHex: string;
  sessionSigningKeyHex: string;
};

let cached: AppConfig | undefined;

/**
 * Parse and freeze config from process.env. Cached after first call.
 * Throws an aggregate error listing every invalid variable.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) return cached;

  const parsed = Schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const v = parsed.data;
  cached = {
    nodeEnv: v.NODE_ENV,
    logLevel: v.LOG_LEVEL,
    issmanager: {
      baseUrl: v.ISSMANAGER_BASE_URL.replace(/\/+$/, ""),
      clientId: v.ISSMANAGER_CLIENT_ID,
      clientSecret: v.ISSMANAGER_CLIENT_SECRET,
      timeoutMs: v.ISSMANAGER_TIMEOUT_MS,
      maxRetry: v.ISSMANAGER_MAX_RETRY,
    },
    databaseUrl: v.DATABASE_URL,
    piiMasterKeyHex: v.PII_MASTER_KEY,
    sessionSigningKeyHex: v.SESSION_SIGNING_KEY,
  };
  return cached;
}

/**
 * Reset cached config — only meant for tests.
 */
export function __resetConfigForTests(): void {
  cached = undefined;
}

/**
 * Lazy-evaluated config proxy. Importing modules can do
 * `import { config } from "@/lib/config"` without forcing eager parse at
 * import time — useful in tests and edge contexts.
 */
export const config: AppConfig = new Proxy({} as AppConfig, {
  get(_t, prop: keyof AppConfig) {
    return loadConfig()[prop];
  },
});
