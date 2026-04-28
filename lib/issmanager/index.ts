/**
 * Public surface of the ISS Manager v2 integration.
 *
 * Import-time policy:
 *   - This module is server-only. Anything that imports it must run in a
 *     Server Component, Route Handler, Server Action, or Node script —
 *     never in client components or middleware.
 *
 *   - If you need to reference a TYPE from a client component (e.g. for prop
 *     shape), import it via `import type { Customer } from "@/lib/issmanager";`
 *     so the runtime code is tree-shaken away.
 */
export { IssmanagerClient } from "./client";
export type { IssmanagerClientOptions, FetchLike } from "./client";
export { getToken, invalidateToken } from "./auth";
export { redactDeep, safeStringify, DEFAULT_SENSITIVE_KEYS } from "./redaction";
export type { RedactOptions } from "./redaction";
export {
  AuthError,
  HttpError,
  NetworkError,
  ParseError,
  ValidationError,
  ConfigError,
  isIssmanagerError,
} from "./errors";
export type { IssmanagerError, IssmanagerErrorKind } from "./errors";
export type {
  Customer,
  Envelope,
  Health,
  Invoice,
  InvoiceItem,
  PaymentType,
  SearchCustomersParamsT,
  FindCustomerParamsT,
  ListInvoicesParamsT,
  CustomerListPayload,
  InvoiceListPayload,
  PaymentTypeListPayload,
} from "./types";
export { unwrapRecords } from "./types";
