/**
 * Unit tests for the KVKK redaction utility.
 * Covers: PII fields masked, secrets masked, null/undefined safe,
 * deep nesting, arrays, cycles, custom keys, substring mode.
 */
import { describe, it, expect } from "vitest";
import {
  redactDeep,
  safeStringify,
  DEFAULT_SENSITIVE_KEYS,
} from "@/lib/issmanager/redaction";

describe("redactDeep", () => {
  it("returns primitives untouched", () => {
    expect(redactDeep(null)).toBeNull();
    expect(redactDeep(undefined)).toBeUndefined();
    expect(redactDeep(42)).toBe(42);
    expect(redactDeep("hello")).toBe("hello");
    expect(redactDeep(true)).toBe(true);
    expect(redactDeep(0n)).toBe(0n);
  });

  it("masks default PII keys at the top level", () => {
    const input = {
      isim: "ALİ",
      soyisim: "BULUT",
      email: "ali@example.com",
      telefon_1: "+90 555 555 5555",
      adres: "Sağlık Mah. 710 Cad. Anamur",
      unvan: "SIRMA GÜRÜZ",
      genel_toplam: 740,
      durum: "Ödendi",
    };
    const out = redactDeep(input);
    expect(out.isim).toBe("[REDACTED]");
    expect(out.soyisim).toBe("[REDACTED]");
    expect(out.email).toBe("[REDACTED]");
    expect(out.telefon_1).toBe("[REDACTED]");
    expect(out.adres).toBe("[REDACTED]");
    expect(out.unvan).toBe("[REDACTED]");
    // Non-sensitive fields untouched.
    expect(out.genel_toplam).toBe(740);
    expect(out.durum).toBe("Ödendi");
  });

  it("does not mutate the input", () => {
    const input = { isim: "ALİ", durum: "Ödendi" };
    const out = redactDeep(input);
    expect(input.isim).toBe("ALİ"); // input untouched
    expect(out.isim).toBe("[REDACTED]");
  });

  it("traverses arrays of records", () => {
    const records = [
      { fatura_no: "1", unvan: "AHMET ALI", genel_toplam: 100 },
      { fatura_no: "2", unvan: "MEHMET ALI", genel_toplam: 200 },
    ];
    const out = redactDeep(records);
    expect(out).toHaveLength(2);
    expect(out[0]?.fatura_no).toBe("1");
    expect(out[0]?.unvan).toBe("[REDACTED]");
    expect(out[1]?.unvan).toBe("[REDACTED]");
    expect(out[1]?.genel_toplam).toBe(200);
  });

  it("walks deeply nested envelope shapes", () => {
    const envelope = {
      data: {
        records: [
          {
            abone_no: "7110860493",
            unvan: "SIRMA GÜRÜZ",
            adres: "ANAMUR/MERSİN",
            kalemler: [{ urun: "Anamur Süper 25", adet: 1, tutar: 740 }],
          },
        ],
      },
      meta: { request_id: "uuid", version: "v2" },
      errors: [],
    };
    const out = redactDeep(envelope);
    const rec = out.data.records[0];
    expect(rec?.abone_no).toBe("7110860493");
    expect(rec?.unvan).toBe("[REDACTED]");
    expect(rec?.adres).toBe("[REDACTED]");
    expect(rec?.kalemler[0]?.urun).toBe("Anamur Süper 25");
    expect(out.meta.request_id).toBe("uuid");
  });

  it("handles null and undefined values inside objects", () => {
    const input = {
      isim: null,
      soyisim: undefined,
      email: "x@y.z",
      firma_unvan: null,
      durum: "Ödenmedi",
    };
    const out = redactDeep(input);
    expect(out.isim).toBe("[REDACTED]");
    expect(out.soyisim).toBe("[REDACTED]");
    expect(out.email).toBe("[REDACTED]");
    expect(out.firma_unvan).toBe("[REDACTED]");
    expect(out.durum).toBe("Ödenmedi");
  });

  it("masks secrets / auth headers", () => {
    const input = {
      headers: {
        authorization: "Bearer issv2_abc123",
        Cookie: "session=xyz",
      },
      access_token: "issv2_zzz",
      client_secret: "topsecret",
      api_key: "xx",
      fine: "ok",
    };
    const out = redactDeep(input);
    expect(out.headers.authorization).toBe("[REDACTED]");
    expect(out.headers.Cookie).toBe("[REDACTED]");
    expect(out.access_token).toBe("[REDACTED]");
    expect(out.client_secret).toBe("[REDACTED]");
    expect(out.api_key).toBe("[REDACTED]");
    expect(out.fine).toBe("ok");
  });

  it("is case-insensitive for key matching", () => {
    const input = { Email: "x@y.z", ISIM: "Ali", Telefon_1: "555" };
    const out = redactDeep(input);
    expect(out.Email).toBe("[REDACTED]");
    expect(out.ISIM).toBe("[REDACTED]");
    expect(out.Telefon_1).toBe("[REDACTED]");
  });

  it("does NOT crash on cyclic references", () => {
    type Node = { isim: string; child?: Node };
    const a: Node = { isim: "A" };
    const b: Node = { isim: "B" };
    a.child = b;
    b.child = a;

    const out = redactDeep(a) as { isim: string; child: { child: unknown } };
    expect(out.isim).toBe("[REDACTED]");
    expect(out.child.child).toBe("[Circular]");
  });

  it("respects custom key lists", () => {
    const out = redactDeep(
      { secret: "shh", isim: "Ali", normal: 1 },
      { keys: ["secret"] }
    );
    expect(out.secret).toBe("[REDACTED]");
    expect(out.isim).toBe("Ali"); // not in custom list → kept
    expect(out.normal).toBe(1);
  });

  it("supports substring mode for prefixed keys", () => {
    const out = redactDeep(
      { customer_email: "x@y.z", company_unvan: "ACME", normal: 1 },
      { mode: "substring" }
    );
    expect(out.customer_email).toBe("[REDACTED]");
    expect(out.company_unvan).toBe("[REDACTED]");
    expect(out.normal).toBe(1);
  });

  it("clones Date and RegExp without mutation", () => {
    const d = new Date("2026-04-28T10:00:00Z");
    const r = /abc/gi;
    const out = redactDeep({ d, r });
    expect(out.d).toBeInstanceOf(Date);
    expect(out.d).not.toBe(d);
    expect((out.d as Date).getTime()).toBe(d.getTime());
    expect(out.r).toBeInstanceOf(RegExp);
    expect((out.r as RegExp).source).toBe("abc");
  });

  it("flattens Error objects to safe POJOs", () => {
    const err = new TypeError("boom");
    const out = redactDeep({ err });
    expect(out.err).toEqual({ name: "TypeError", message: "boom" });
  });

  it("respects maxDepth", () => {
    const deep: Record<string, unknown> = { isim: "A" };
    let cursor = deep;
    for (let i = 0; i < 20; i++) {
      cursor["next"] = { isim: "A", level: i };
      cursor = cursor["next"] as Record<string, unknown>;
    }
    const out = redactDeep(deep, { maxDepth: 3 });
    // Top three levels are processed, deeper levels return as-is.
    expect((out as { isim: string }).isim).toBe("[REDACTED]");
  });

  it("DEFAULT_SENSITIVE_KEYS contains the dangerous invoice fields", () => {
    expect(DEFAULT_SENSITIVE_KEYS).toContain("unvan");
    expect(DEFAULT_SENSITIVE_KEYS).toContain("adres");
    expect(DEFAULT_SENSITIVE_KEYS).toContain("telefon_1");
    expect(DEFAULT_SENSITIVE_KEYS).toContain("email");
    expect(DEFAULT_SENSITIVE_KEYS).toContain("client_secret");
  });
});

describe("safeStringify", () => {
  it("returns redacted JSON for sensitive payloads", () => {
    const out = safeStringify({ unvan: "ABC", durum: "Ödendi" });
    expect(out).toContain("[REDACTED]");
    expect(out).toContain("Ödendi");
    expect(out).not.toContain("ABC");
  });

  it("falls back gracefully on unstringifiable input", () => {
    type Node = { self?: unknown };
    const a: Node = {};
    a.self = a;
    // After redaction the cycle becomes "[Circular]", so JSON works fine.
    expect(safeStringify(a)).toContain("[Circular]");
  });
});
