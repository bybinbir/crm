"use server";

import { z } from "zod";
import { IssmanagerClient, isIssmanagerError } from "@/lib/issmanager";
import { logger } from "@/lib/logger";
import { getDb, schema } from "@/lib/db";
import { AuthError, requireCapability } from "@/lib/auth";

const FormSchema = z.object({
  query: z.string().trim().min(3, "En az 3 karakter giriniz"),
});

export type SearchResultCustomer = {
  isim?: string | null | undefined;
  soyisim?: string | null | undefined;
  firma_unvan?: string | null | undefined;
  telefon_1?: string | null | undefined;
  email?: string | null | undefined;
};

export type SearchResult =
  | {
      ok: true;
      query: string;
      total: number;
      page: number;
      totalPages: number;
      customers: SearchResultCustomer[];
    }
  | { ok: false; error: string; kind: string };

export async function searchCustomers(formData: FormData): Promise<SearchResult> {
  try {
    await requireCapability("view:musteriler");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, kind: "auth", error: e.message };
    throw e;
  }
  const parsed = FormSchema.safeParse({ query: formData.get("query") });
  if (!parsed.success) {
    return {
      ok: false,
      kind: "validation",
      error: parsed.error.issues[0]?.message ?? "Geçersiz arama",
    };
  }
  const query = parsed.data.query;
  const client = new IssmanagerClient();
  try {
    const { customers, envelope } = await client.searchCustomers({
      search: query,
      records: 50,
      page: 0,
    });
    await audit(query, "success", customers.length);
    return {
      ok: true,
      query,
      total: envelope.meta.pagination?.total_records ?? customers.length,
      page: envelope.meta.pagination?.page ?? 0,
      totalPages: envelope.meta.pagination?.total_pages ?? 1,
      customers,
    };
  } catch (e) {
    const kind = isIssmanagerError(e) ? e.kind : "unknown";
    const message = e instanceof Error ? e.message : String(e);
    logger.warn({ kind, q_len: query.length }, "customer search failed");
    await audit(query, "error", 0);
    return { ok: false, kind, error: humanize(kind, message) };
  }
}

async function audit(q: string, outcome: "success" | "error", hits: number): Promise<void> {
  try {
    const db = getDb();
    await db.insert(schema.auditEvents).values({
      aksiyon: "search_customer",
      kaynak: "/iss/v2/customers",
      sonuc: outcome,
      requestId: `q_len=${q.length};hits=${hits}`,
    });
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e) }, "audit insert failed");
  }
}

const HUMAN: Record<string, string> = {
  validation: "Geçersiz arama.",
  auth: "ISS Manager kimlik doğrulaması başarısız.",
  network: "ISS Manager API'sine erişilemedi.",
  http: "ISS Manager beklenmeyen bir cevap döndü.",
  parse: "ISS Manager cevabı tanınamadı.",
};

function humanize(kind: string, message: string): string {
  if (kind === "validation") return message;
  return HUMAN[kind] ?? "Bilinmeyen hata oluştu.";
}
