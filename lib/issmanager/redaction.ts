/**
 * KVKK-compliant redaction utility.
 *
 * Walks an arbitrary value (object/array/primitive) and replaces the value of
 * any key whose name appears in the sensitive-key list with `[REDACTED]`.
 *
 * Design notes:
 *   - Whole-string match by default (case-insensitive). Substring match is
 *     opt-in via the `mode: "substring"` parameter.
 *   - Cycle-safe: revisits via a WeakSet so circular structures don't loop.
 *   - Non-mutating: always returns a fresh structure; the input is untouched.
 *   - Preserves arrays (incl. mixed-type arrays) and primitive nulls/undefined.
 *   - Symbols and class instances are returned as-is (we don't introspect
 *     non-plain objects); rely on `safeStringify` for those.
 *
 * Default sensitive keys cover both ISS Manager API payload field names
 * (Turkish: isim, soyisim, telefon_1, …) and common secret names. New PII
 * fields MUST be added here in the same commit that introduces them in the
 * codebase, otherwise the logger will leak them.
 */

export const DEFAULT_SENSITIVE_KEYS: readonly string[] = [
  // ISS Manager customer fields (already API-masked, but redact regardless)
  "isim",
  "soyisim",
  "firma_unvan",
  "telefon",
  "telefon_1",
  "telefon_2",
  "telefon_3",
  "email",
  "tckn",
  "pasaport",
  "pppoe_k_adi",
  "pppoe_k_parola",
  "oim_k_adi",

  // ISS Manager invoice fields (UNMASKED upstream — most dangerous)
  "unvan",
  "adres",

  // Authentication / secrets
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "passphrase",
  "api_key",
  "apikey",
  "private_key",
  "pii_master_key",
  "piimasterkey",
  "session_signing_key",
  "sessionsigningkey",
];

const REDACTED = "[REDACTED]";

export type RedactOptions = {
  /** Override the sensitive key list. */
  keys?: readonly string[];
  /**
   * "exact" (default) — case-insensitive whole-key match.
   * "substring"        — case-insensitive substring match (catches `customer_email`, etc.)
   */
  mode?: "exact" | "substring";
  /** Custom replacement value. Default `[REDACTED]`. */
  replacement?: string;
  /** Maximum traversal depth (defense against pathological inputs). */
  maxDepth?: number;
};

/**
 * Returns a deep clone with sensitive fields replaced.
 * Safe on `null`, `undefined`, primitives, arrays, plain objects, and cycles.
 */
export function redactDeep<T>(input: T, options: RedactOptions = {}): T {
  const keys = (options.keys ?? DEFAULT_SENSITIVE_KEYS).map((k) => k.toLowerCase());
  const mode = options.mode ?? "exact";
  const replacement = options.replacement ?? REDACTED;
  const maxDepth = options.maxDepth ?? 32;

  const isSensitive = (k: string): boolean => {
    const lower = k.toLowerCase();
    if (mode === "exact") return keys.includes(lower);
    return keys.some((needle) => lower.includes(needle));
  };

  const seen = new WeakSet<object>();

  const walk = (value: unknown, depth: number): unknown => {
    if (depth >= maxDepth) return value;
    if (value === null || value === undefined) return value;

    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean" || t === "bigint") {
      return value;
    }
    if (t === "function" || t === "symbol") return value;

    // Arrays — recurse element-wise, do NOT match key names.
    if (Array.isArray(value)) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
      return value.map((el) => walk(el, depth + 1));
    }

    // Plain objects
    if (t === "object") {
      const obj = value as Record<string, unknown>;
      if (seen.has(obj)) return "[Circular]";
      seen.add(obj);

      // Special handling for built-ins that we don't want to traverse.
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
      if (obj instanceof Error) {
        return {
          name: obj.name,
          message: obj.message,
        };
      }

      const out: Record<string, unknown> = {};
      for (const k of Object.keys(obj)) {
        if (isSensitive(k)) {
          out[k] = replacement;
        } else {
          out[k] = walk(obj[k], depth + 1);
        }
      }
      return out;
    }

    return value;
  };

  return walk(input, 0) as T;
}

/**
 * Convenience wrapper: redact, then JSON-stringify with a `[Unstringifiable]`
 * fallback for circulars. Use this in error handlers where you want a single
 * safe string.
 */
export function safeStringify(input: unknown, options?: RedactOptions): string {
  try {
    return JSON.stringify(redactDeep(input, options));
  } catch {
    return "[Unstringifiable]";
  }
}
