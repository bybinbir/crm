/**
 * Error taxonomy for ISS Manager interactions.
 *
 * Every failure mode gets a discriminated, typed class so callers can react
 * appropriately:
 *
 *   - AuthError        → token endpoint failed; surface a config error.
 *   - HttpError        → upstream returned a non-2xx; carries status + body.
 *   - NetworkError     → fetch threw (DNS, connection, timeout) — retryable.
 *   - ParseError       → response shape didn't match Zod schema; never retry.
 *   - ValidationError  → caller passed invalid params (e.g. search < 3 chars).
 *   - ConfigError      → env / setup is wrong before we even hit the wire.
 *
 * All errors are safe to log: their `toString()` deliberately omits the
 * upstream body to avoid PII leakage. Use `.detail` if you need to inspect
 * it inside a try/catch with redacted logging.
 */

export type IssmanagerErrorKind =
  | "auth"
  | "http"
  | "network"
  | "parse"
  | "validation"
  | "config";

abstract class BaseIssmanagerError extends Error {
  abstract readonly kind: IssmanagerErrorKind;
  override readonly cause?: unknown;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class AuthError extends BaseIssmanagerError {
  readonly kind = "auth" as const;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class HttpError extends BaseIssmanagerError {
  readonly kind = "http" as const;
  readonly status: number;
  readonly statusText: string;
  /** Upstream body, kept private to discourage accidental logging. */
  readonly detail?: string;
  readonly url: string;

  constructor(args: {
    status: number;
    statusText: string;
    url: string;
    detail?: string;
    cause?: unknown;
  }) {
    super(`HTTP ${args.status} ${args.statusText} from ${args.url}`, {
      cause: args.cause,
    });
    this.status = args.status;
    this.statusText = args.statusText;
    this.url = args.url;
    if (args.detail !== undefined) {
      this.detail = args.detail;
    }
  }

  /** True for 5xx, 408, and 429 — the cases retry can help with. */
  get retryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }
}

export class NetworkError extends BaseIssmanagerError {
  readonly kind = "network" as const;
  readonly url: string;
  constructor(message: string, url: string, options?: { cause?: unknown }) {
    super(message, options);
    this.url = url;
  }
  readonly retryable = true;
}

export class ParseError extends BaseIssmanagerError {
  readonly kind = "parse" as const;
  readonly url: string;
  readonly issues: string;
  constructor(args: { url: string; issues: string; cause?: unknown }) {
    super(`Failed to parse response from ${args.url}: ${args.issues}`, {
      cause: args.cause,
    });
    this.url = args.url;
    this.issues = args.issues;
  }
  readonly retryable = false;
}

export class ValidationError extends BaseIssmanagerError {
  readonly kind = "validation" as const;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
  readonly retryable = false;
}

export class ConfigError extends BaseIssmanagerError {
  readonly kind = "config" as const;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
  readonly retryable = false;
}

export type IssmanagerError =
  | AuthError
  | HttpError
  | NetworkError
  | ParseError
  | ValidationError
  | ConfigError;

export function isIssmanagerError(e: unknown): e is IssmanagerError {
  return (
    e instanceof AuthError ||
    e instanceof HttpError ||
    e instanceof NetworkError ||
    e instanceof ParseError ||
    e instanceof ValidationError ||
    e instanceof ConfigError
  );
}
