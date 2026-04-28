/**
 * ISS Manager v2 API — Zod schemas + inferred TypeScript types.
 *
 * Every response that crosses the network boundary is validated through
 * `Envelope` first; if the upstream introduces a new field we tolerate it
 * (passthrough by default) but unknown shapes for known fields throw.
 *
 * The shapes here are derived from the OpenAPI 3.0.3 spec at
 * http://192.168.106.118/api-sistem/v2/dokuman/openapi and the field-level
 * notes in the project brief. KVKK masking behaviour is documented inline.
 */
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Common envelope
// ─────────────────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  records: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  total_records: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});

export const MetaSchema = z.object({
  request_id: z.string(),
  timestamp: z.string(),
  version: z.literal("v2"),
  pagination: PaginationSchema.optional(),
});

export const EnvelopeErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

/**
 * Generic envelope factory. All ISS Manager responses share this shell:
 *
 *   { data: T, meta: {...}, errors: [...] }
 */
export const envelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    meta: MetaSchema,
    errors: z.array(EnvelopeErrorSchema).default([]),
  });

export type Envelope<T> = {
  data: T;
  meta: z.infer<typeof MetaSchema>;
  errors: z.infer<typeof EnvelopeErrorSchema>[];
};

// ─────────────────────────────────────────────────────────────────────────────
// /iss/v2/health
// ─────────────────────────────────────────────────────────────────────────────

export const HealthSchema = z.object({
  status: z.string(),
});

export type Health = z.infer<typeof HealthSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /iss/v2/auth/token
// ─────────────────────────────────────────────────────────────────────────────

export const TokenSchema = z.object({
  token_type: z.literal("Bearer"),
  access_token: z.string().min(20),
  expires_in: z.number().int().positive(),
  expires_at: z.string(),
  client_id: z.string(),
});

export type Token = z.infer<typeof TokenSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /iss/v2/payment-types
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentTypeSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  ad: z.string().optional(),
  isim: z.string().optional(),
});

export type PaymentType = z.infer<typeof PaymentTypeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /iss/v2/customers (search) and /iss/v2/customers/find (exact match)
//
// IMPORTANT: This endpoint returns API-masked PII even when the KVKK
// allowlist toggle is on. We treat it as masked-only.
// ─────────────────────────────────────────────────────────────────────────────

export const CustomerSchema = z.object({
  isim: z.string().nullable().optional(),
  soyisim: z.string().nullable().optional(),
  firma_unvan: z.string().nullable().optional(),
  telefon_1: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /iss/v2/invoices
//
// DANGER: invoice payloads contain UNMASKED PII (full name, full address).
// Anything that touches this type must run through redaction before logging
// and through encryption before persisting.
// ─────────────────────────────────────────────────────────────────────────────

export const InvoiceItemSchema = z.object({
  urun: z.string(),
  adet: z.number(),
  tutar: z.number(),
  kdv: z.number(),
  oiv: z.number(),
  brut: z.number(),
});

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const InvoiceSchema = z.object({
  abone_no: z.string(),
  unvan: z.string(),
  adres: z.string(),
  fatura_no: z.string(),
  genel_toplam: z.number(),
  urunler: z.string(),
  fatura_tarihi: z.string(),
  son_odeme_tarihi: z.string(),
  durum: z.string(),
  odendigi_tarih: z.string().nullable(),
  odeme_turu: z.string(),
  kalemler: z.array(InvoiceItemSchema),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Listing payloads — `data` may be an object with `records[]` or a bare array.
// We accept both and normalise on the client.
// ─────────────────────────────────────────────────────────────────────────────

export const customerRecordsSchema = z.union([
  z.array(CustomerSchema),
  z.object({ records: z.array(CustomerSchema) }),
]);

export const invoiceRecordsSchema = z.union([
  z.array(InvoiceSchema),
  z.object({ records: z.array(InvoiceSchema) }),
]);

export const paymentTypeRecordsSchema = z.union([
  z.array(PaymentTypeSchema),
  z.object({ records: z.array(PaymentTypeSchema) }),
]);

export type CustomerListPayload = z.infer<typeof customerRecordsSchema>;
export type InvoiceListPayload = z.infer<typeof invoiceRecordsSchema>;
export type PaymentTypeListPayload = z.infer<typeof paymentTypeRecordsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Request param shapes
// ─────────────────────────────────────────────────────────────────────────────

export const SearchCustomersParams = z.object({
  search: z.string().min(3, "search must be at least 3 characters"),
  records: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(0).optional(),
  type: z.string().optional(),
});
export type SearchCustomersParamsT = z.infer<typeof SearchCustomersParams>;

export const FindCustomerParams = z.object({
  find: z.string().min(3, "find must be at least 3 characters"),
  records: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(0).optional(),
  type: z.string().optional(),
});
export type FindCustomerParamsT = z.infer<typeof FindCustomerParams>;

export const ListInvoicesParams = z.object({
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "start_date must be YYYY-MM-DD"),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "end_date must be YYYY-MM-DD"),
  payment_type: z.string().optional(),
  status: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  records: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(0).optional(),
});
export type ListInvoicesParamsT = z.infer<typeof ListInvoicesParams>;

/**
 * Normalises a `data` payload into a plain `T[]`, regardless of whether
 * the API returned a bare array or `{ records: T[] }`.
 */
export function unwrapRecords<T>(payload: T[] | { records: T[] }): T[] {
  return Array.isArray(payload) ? payload : payload.records;
}
