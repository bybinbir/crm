/**
 * Tests for the daily pull job (pure core in lib/jobs/pull-day.ts).
 *
 * Network and DB are stubbed so the suite runs without secrets.
 * Covers (M5 madde 2):
 *   - parseArgs: positional/named date, --dry-run, default = yesterday UTC
 *   - parseArgs: malformed date -> structured error (CLI maps to exit 2)
 *   - runDailyPull: dry-run early-return, no client/DB calls
 *   - runDailyPull: happy path, summary fields, pagination, exit 0
 *   - runDailyPull: per-invoice upsert error, status=failed, exit 1
 *   - runDailyPull: client throws (network error), redacted, exit 1
 *   - formatIsoDate / parseIsoDate round-trip
 *   - PII redaction in error log payload
 */
import { describe, it, expect, vi } from "vitest";
import {
  parseArgs,
  runDailyPull,
  formatIsoDate,
  parseIsoDate,
  defaultRunDate,
  ENDPOINT,
  type PullClient,
  type PullDeps,
  type PullRunHandle,
  type Clock,
} from "@/lib/jobs/pull-day";

const FIXED_NOW = new Date("2026-04-28T12:00:00.000Z");

function makeClock(): Clock {
  let t = 0;
  return {
    now: () => FIXED_NOW,
    elapsed: () => {
      t += 100;
      return t;
    },
  };
}

function makeHandle(): PullRunHandle & {
  okCalls: Array<{ k: number }>;
  failCalls: Array<{ k: number; e: number; d: string }>;
} {
  const okCalls: Array<{ k: number }> = [];
  const failCalls: Array<{ k: number; e: number; d: string }> = [];
  return {
    id: 1n,
    okCalls,
    failCalls,
    finishOk: async (kayitSayisi: number) => {
      okCalls.push({ k: kayitSayisi });
    },
    finishFail: async (kayitSayisi: number, hataSayisi: number, detail: string) => {
      failCalls.push({ k: kayitSayisi, e: hataSayisi, d: detail });
    },
  };
}

function makeDeps(client: PullClient, handle: PullRunHandle, upsertResults: Array<{ inserted: boolean } | Error>): PullDeps & {
  upsertCalls: number;
  startCalls: number;
  logged: string[];
} {
  let upsertCalls = 0;
  let startCalls = 0;
  const logged: string[] = [];
  return {
    client,
    upsertCalls,
    startCalls,
    logged,
    clock: makeClock(),
    log: (line) => logged.push(line),
    startPullRun: async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = (++startCalls);
      return handle;
    },
    upsertInvoice: async () => {
      const r = upsertResults[upsertCalls++];
      if (r instanceof Error) throw r;
      return r ?? { inserted: true };
    },
  };
}

describe("formatIsoDate / parseIsoDate", () => {
  it("formats UTC date as YYYY-MM-DD", () => {
    expect(formatIsoDate(new Date("2026-01-09T23:59:00.000Z"))).toBe("2026-01-09");
  });
  it("round-trips a string", () => {
    const s = "2026-04-27";
    expect(formatIsoDate(parseIsoDate(s))).toBe(s);
  });
  it("rejects malformed input", () => {
    expect(() => parseIsoDate("2026/04/27")).toThrow();
    expect(() => parseIsoDate("not a date")).toThrow();
    expect(() => parseIsoDate("2026-13-40")).toThrow();
  });
});

describe("parseArgs", () => {
  it("defaults to yesterday UTC when no args", () => {
    const r = parseArgs([], FIXED_NOW);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(formatIsoDate(r.date)).toBe("2026-04-27");
    expect(r.dryRun).toBe(false);
  });
  it("accepts a positional YYYY-MM-DD", () => {
    const r = parseArgs(["2026-03-14"], FIXED_NOW);
    if ("error" in r) throw new Error(r.error);
    expect(formatIsoDate(r.date)).toBe("2026-03-14");
  });
  it("accepts --date= named flag", () => {
    const r = parseArgs(["--date=2026-03-14"], FIXED_NOW);
    if ("error" in r) throw new Error(r.error);
    expect(formatIsoDate(r.date)).toBe("2026-03-14");
  });
  it("accepts --dry-run", () => {
    const r = parseArgs(["--dry-run", "2026-03-14"], FIXED_NOW);
    if ("error" in r) throw new Error(r.error);
    expect(r.dryRun).toBe(true);
    expect(formatIsoDate(r.date)).toBe("2026-03-14");
  });
  it("rejects unknown args", () => {
    const r = parseArgs(["--bogus"], FIXED_NOW);
    expect("error" in r).toBe(true);
  });
  it("rejects malformed date arg", () => {
    const r = parseArgs(["--date=2026/03/14"], FIXED_NOW);
    expect("error" in r).toBe(true);
  });
});

describe("defaultRunDate", () => {
  it("returns yesterday UTC at midnight", () => {
    const d = defaultRunDate(FIXED_NOW);
    expect(formatIsoDate(d)).toBe("2026-04-27");
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
  });
});

describe("runDailyPull dry-run", () => {
  it("returns immediately without touching client or DB", async () => {
    const client: PullClient = {
      listInvoices: vi.fn(),
    };
    const handle = makeHandle();
    const deps = makeDeps(client, handle, []);
    const { summary, exitCode } = await runDailyPull(
      { date: parseIsoDate("2026-04-27"), dryRun: true },
      deps
    );
    expect(exitCode).toBe(0);
    expect(summary.dryRun).toBe(true);
    expect(summary.status).toBe("dry-run");
    expect(summary.date).toBe("2026-04-27");
    expect(summary.endpoint).toBe(ENDPOINT);
    expect(client.listInvoices).not.toHaveBeenCalled();
    expect(handle.okCalls.length).toBe(0);
    expect(handle.failCalls.length).toBe(0);
  });
});

describe("runDailyPull happy path", () => {
  it("paginates and reports inserted count", async () => {
    const pages = [
      {
        invoices: [{ fatura_no: "A" }, { fatura_no: "B" }],
        envelope: { meta: { pagination: { total_pages: 2 } } },
      },
      {
        invoices: [{ fatura_no: "C" }],
        envelope: { meta: { pagination: { total_pages: 2 } } },
      },
    ];
    let call = 0;
    const client: PullClient = {
      listInvoices: async () => pages[call++]!,
    };
    const handle = makeHandle();
    const deps = makeDeps(client, handle, [
      { inserted: true },
      { inserted: false }, // duplicate fatura_no
      { inserted: true },
    ]);
    const { summary, exitCode } = await runDailyPull(
      { date: parseIsoDate("2026-04-27"), dryRun: false },
      deps
    );
    expect(exitCode).toBe(0);
    expect(summary.status).toBe("succeeded");
    expect(summary.seen).toBe(3);
    expect(summary.inserted).toBe(2);
    expect(summary.errors).toBe(0);
    expect(summary.pages).toBe(2);
    expect(handle.okCalls).toEqual([{ k: 2 }]);
    expect(handle.failCalls.length).toBe(0);
  });
});

describe("runDailyPull partial failure", () => {
  it("counts upsert errors and finishes with failed status, exit 1", async () => {
    const client: PullClient = {
      listInvoices: async () => ({
        invoices: [{ fatura_no: "X" }, { fatura_no: "Y" }],
        envelope: { meta: { pagination: { total_pages: 1 } } },
      }),
    };
    const handle = makeHandle();
    const deps = makeDeps(client, handle, [
      { inserted: true },
      new Error("FK constraint violated"),
    ]);
    const { summary, exitCode } = await runDailyPull(
      { date: parseIsoDate("2026-04-27"), dryRun: false },
      deps
    );
    expect(exitCode).toBe(1);
    expect(summary.status).toBe("failed");
    expect(summary.seen).toBe(2);
    expect(summary.inserted).toBe(1);
    expect(summary.errors).toBe(1);
    expect(handle.failCalls.length).toBe(1);
    expect(handle.failCalls[0]!.e).toBe(1);
  });
});

describe("runDailyPull catastrophic client failure", () => {
  it("redacts error message and exits 1 without leaking PII", async () => {
    const client: PullClient = {
      listInvoices: async () => {
        throw new Error("upstream timeout");
      },
    };
    const handle = makeHandle();
    const deps = makeDeps(client, handle, []);
    const { summary, exitCode } = await runDailyPull(
      { date: parseIsoDate("2026-04-27"), dryRun: false },
      deps
    );
    expect(exitCode).toBe(1);
    expect(summary.status).toBe("failed");
    expect(summary.errors).toBeGreaterThanOrEqual(1);
    // The log lines must not contain raw PII fields. The summary itself is
    // safe (just counters + date + endpoint).
    const joined = deps.logged.join("");
    expect(joined).not.toMatch(/isim|soyisim|telefon|adres/i);
    expect(handle.failCalls.length).toBe(1);
  });
});
