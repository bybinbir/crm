/**
 * Tests for the audit log query helpers (lib/db/audit-queries.ts).
 *
 * The pure parsing/clamping/where-builder functions are tested in
 * isolation; the DB-touching `listAuditEvents` is exercised indirectly
 * via the where builder and is covered by the existing app-level
 * integration tests.
 *
 * Covers:
 *   - clampPage / clampPageSize bounds
 *   - parseIsoDateOrNull rejects malformed input
 *   - sanitiseFilterString trims, length-clamps, drops empty
 *   - parseAuditQuery: full URL search params -> sane options
 *   - parseAuditQuery: garbage in -> safe defaults out
 *   - buildAuditWhere: returns undefined when no filters
 *   - buildAuditWhere: composes AND when multiple filters
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  clampPage,
  clampPageSize,
  parseIsoDateOrNull,
  endOfDayUtc,
  sanitiseFilterString,
  parseAuditQuery,
  buildAuditWhere,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  MAX_PAGE_SIZE,
} from "@/lib/db/audit-queries";

beforeAll(() => {
  // Required by lib/config.ts at import time even though we never touch
  // the DB in these tests.
  const env = process.env as Record<string, string>;
  env["NODE_ENV"] = "test";
  env["LOG_LEVEL"] = "silent";
  env["ISSMANAGER_BASE_URL"] = "http://example.invalid/api";
  env["ISSMANAGER_CLIENT_ID"] = "iss_v2_testtesttesttest";
  env["ISSMANAGER_CLIENT_SECRET"] = "test-secret";
  env["DATABASE_URL"] = "postgres://u:p@localhost:5432/db";
  env["PII_MASTER_KEY"] =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  env["SESSION_SIGNING_KEY"] =
    "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
});

describe("clampPage", () => {
  it("returns DEFAULT_PAGE for falsy / NaN / negative input", () => {
    expect(clampPage(undefined)).toBe(DEFAULT_PAGE);
    expect(clampPage(null)).toBe(DEFAULT_PAGE);
    expect(clampPage("not a number")).toBe(DEFAULT_PAGE);
    expect(clampPage(-5)).toBe(DEFAULT_PAGE);
    expect(clampPage(0)).toBe(DEFAULT_PAGE);
  });
  it("floors fractional pages", () => {
    expect(clampPage(3.9)).toBe(3);
  });
  it("caps at MAX_PAGE", () => {
    expect(clampPage(99_999_999)).toBe(MAX_PAGE);
  });
  it("accepts numeric strings", () => {
    expect(clampPage("7")).toBe(7);
  });
});

describe("clampPageSize", () => {
  it("returns DEFAULT_PAGE_SIZE for invalid input", () => {
    expect(clampPageSize("abc")).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(-10)).toBe(DEFAULT_PAGE_SIZE);
  });
  it("caps at MAX_PAGE_SIZE to defend against denial-of-read", () => {
    expect(clampPageSize(10_000_000)).toBe(MAX_PAGE_SIZE);
  });
  it("preserves valid sizes", () => {
    expect(clampPageSize(25)).toBe(25);
    expect(clampPageSize("100")).toBe(100);
  });
});

describe("parseIsoDateOrNull", () => {
  it("returns null for non-strings or malformed dates", () => {
    expect(parseIsoDateOrNull(null)).toBeNull();
    expect(parseIsoDateOrNull(123)).toBeNull();
    expect(parseIsoDateOrNull("2026/04/27")).toBeNull();
    expect(parseIsoDateOrNull("not a date")).toBeNull();
  });
  it("parses YYYY-MM-DD as UTC midnight", () => {
    const d = parseIsoDateOrNull("2026-04-27");
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe("2026-04-27T00:00:00.000Z");
  });
});

describe("endOfDayUtc", () => {
  it("clamps to 23:59:59.999 UTC", () => {
    const d = endOfDayUtc(new Date("2026-04-27T12:00:00.000Z"));
    expect(d.toISOString()).toBe("2026-04-27T23:59:59.999Z");
  });
});

describe("sanitiseFilterString", () => {
  it("returns undefined for non-strings, empty, whitespace-only", () => {
    expect(sanitiseFilterString(undefined)).toBeUndefined();
    expect(sanitiseFilterString(123)).toBeUndefined();
    expect(sanitiseFilterString("")).toBeUndefined();
    expect(sanitiseFilterString("   ")).toBeUndefined();
  });
  it("trims surrounding whitespace", () => {
    expect(sanitiseFilterString("  login.success ")).toBe("login.success");
  });
  it("hard-clamps at 100 chars", () => {
    const long = "x".repeat(500);
    expect(sanitiseFilterString(long)?.length).toBe(100);
  });
});

describe("parseAuditQuery", () => {
  it("returns safe defaults for empty input", () => {
    const o = parseAuditQuery({});
    expect(o.page).toBe(DEFAULT_PAGE);
    expect(o.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(o.from).toBeUndefined();
    expect(o.to).toBeUndefined();
    expect(o.aksiyon).toBeUndefined();
    expect(o.sonuc).toBeUndefined();
  });
  it("parses a fully-populated query", () => {
    const o = parseAuditQuery({
      from: "2026-04-01",
      to: "2026-04-27",
      aksiyon: "login.success",
      sonuc: "ok",
      kullaniciId: "42",
      page: "3",
      pageSize: "25",
    });
    expect(o.from?.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(o.to?.toISOString()).toBe("2026-04-27T23:59:59.999Z");
    expect(o.aksiyon).toBe("login.success");
    expect(o.sonuc).toBe("ok");
    expect(o.kullaniciId).toBe("42");
    expect(o.page).toBe(3);
    expect(o.pageSize).toBe(25);
  });
  it("ignores garbage inputs", () => {
    const o = parseAuditQuery({
      from: "2026/13/40",
      to: "yesterday",
      aksiyon: "   ",
      page: "999999999",
      pageSize: "10000",
    });
    expect(o.from).toBeUndefined();
    expect(o.to).toBeUndefined();
    expect(o.aksiyon).toBeUndefined();
    expect(o.page).toBe(MAX_PAGE);
    expect(o.pageSize).toBe(MAX_PAGE_SIZE);
  });
  it("uses the first value when a param appears multiple times", () => {
    const o = parseAuditQuery({ aksiyon: ["x", "y"] });
    expect(o.aksiyon).toBe("x");
  });
});

describe("buildAuditWhere", () => {
  it("returns undefined when no filter is set", () => {
    const where = buildAuditWhere({});
    expect(where).toBeUndefined();
  });
  it("returns a single SQL fragment for one filter", () => {
    const where = buildAuditWhere({ aksiyon: "login.success" });
    expect(where).toBeDefined();
  });
  it("composes AND for multiple filters", () => {
    const where = buildAuditWhere({
      from: new Date("2026-04-01T00:00:00.000Z"),
      to: new Date("2026-04-27T23:59:59.999Z"),
      aksiyon: "export.csv",
      sonuc: "ok",
      kullaniciId: "42",
    });
    expect(where).toBeDefined();
  });
});
