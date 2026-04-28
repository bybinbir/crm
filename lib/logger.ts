/**
 * Application logger — pino with KVKK-aware redaction.
 *
 * We never log raw PII. The redaction list below covers every field name we
 * know to be sensitive in ISS Manager responses (`isim`, `soyisim`,
 * `firma_unvan`, `telefon_*`, `email`, `unvan`, `adres`) and the encryption
 * key. New PII fields MUST be added here in the same commit that introduces
 * them, or the logger will leak them.
 *
 * pino's redact paths support glob-like wildcards; see
 * https://getpino.io/#/docs/redaction
 */
import pino from "pino";
import { redactDeep } from "@/lib/issmanager/redaction";

const REDACT_PATHS: readonly string[] = [
  // Authentication / secrets
  "*.access_token",
  "*.client_secret",
  "headers.authorization",
  "req.headers.authorization",
  "req.headers.cookie",
  "client_secret",
  "access_token",
  "PII_MASTER_KEY",
  "piiMasterKeyHex",

  // Customer fields (search/find — already API-masked but redact anyway)
  "*.isim",
  "*.soyisim",
  "*.firma_unvan",
  "*.telefon_1",
  "*.telefon_2",
  "*.telefon_3",
  "*.email",

  // Invoice fields (NOT API-masked — this is the dangerous set)
  "*.unvan",
  "*.adres",

  // Nested arrays (records[].* style)
  "*.data.*.isim",
  "*.data.*.soyisim",
  "*.data.*.firma_unvan",
  "*.data.*.telefon_1",
  "*.data.*.email",
  "*.data.*.unvan",
  "*.data.*.adres",
  "*.data.records.*.isim",
  "*.data.records.*.soyisim",
  "*.data.records.*.firma_unvan",
  "*.data.records.*.telefon_1",
  "*.data.records.*.email",
  "*.data.records.*.unvan",
  "*.data.records.*.adres",
];

function makeLogger(): pino.Logger {
  // We avoid a top-level import of `@/lib/config` because the logger may be
  // imported very early — including by tests that mock env. Read env directly.
  const level = process.env["LOG_LEVEL"] ?? "info";
  const isDev = process.env["NODE_ENV"] !== "production";

  const transport = isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      }
    : undefined;

  return pino({
    level,
    redact: {
      paths: [...REDACT_PATHS],
      censor: "[REDACTED]",
      remove: false,
    },
    base: { service: "crmanaliz" },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(transport ? { transport } : {}),
  });
}

export const logger: pino.Logger = makeLogger();

/**
 * Logs an arbitrary object after running it through deep redaction.
 * Use for ISS Manager responses where the field set may be unknown
 * (defense in depth on top of pino's path-based redact).
 */
export function logSafe(
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal",
  msg: string,
  obj: unknown
): void {
  logger[level]({ payload: redactDeep(obj) }, msg);
}
