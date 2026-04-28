#!/usr/bin/env tsx
/**
 * crmanaliz smoke test — verifies live ISS Manager v2 connectivity end to end.
 *
 * Exercises the four READ endpoints in order:
 *   1. GET  /iss/v2/health
 *   2. POST /iss/v2/auth/token         (via getToken)
 *   3. GET  /iss/v2/payment-types
 *   4. GET  /iss/v2/customers/find?find=ali
 *   5. GET  /iss/v2/invoices?start_date=YESTERDAY&end_date=YESTERDAY
 *
 * Output:
 *   - Pretty progress lines on stderr.
 *   - Single redacted JSON summary on stdout (so it's pipeable into jq /
 *     monitoring).
 *
 * Exit codes:
 *   - 0  all checks passed.
 *   - 1  any check failed (token, parse, http, network).
 *
 * Read-only by design: NEVER calls /extra-days or /invoices/send.
 */
import { performance } from "node:perf_hooks";
import {
  IssmanagerClient,
  redactDeep,
  isIssmanagerError,
} from "@/lib/issmanager";

type StepResult =
  | {
      name: string;
      status: "ok";
      durationMs: number;
      sample: unknown;
    }
  | {
      name: string;
      status: "fail";
      durationMs: number;
      kind: string;
      message: string;
    };

function info(msg: string): void {
  process.stderr.write(`\x1b[36m›\x1b[0m ${msg}\n`);
}

function ok(msg: string): void {
  process.stderr.write(`\x1b[32m✓\x1b[0m ${msg}\n`);
}

function bad(msg: string): void {
  process.stderr.write(`\x1b[31m✗\x1b[0m ${msg}\n`);
}

async function step<T>(
  name: string,
  fn: () => Promise<T>,
  sampler: (v: T) => unknown = (v) => v
): Promise<StepResult> {
  const t0 = performance.now();
  try {
    const value = await fn();
    const durationMs = Math.round(performance.now() - t0);
    ok(`${name} (${durationMs} ms)`);
    return { name, status: "ok", durationMs, sample: redactDeep(sampler(value)) };
  } catch (e) {
    const durationMs = Math.round(performance.now() - t0);
    const kind = isIssmanagerError(e) ? e.kind : e instanceof Error ? "error" : "unknown";
    const message = e instanceof Error ? e.message : String(e);
    bad(`${name} → ${kind}: ${message}`);
    return { name, status: "fail", durationMs, kind, message };
  }
}

function isoDate(d: Date): string {
  // YYYY-MM-DD in local TZ (Turkey for binbirnet).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main(): Promise<void> {
  info("crmanaliz ISS Manager v2 smoke");
  const client = new IssmanagerClient();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const results: StepResult[] = [];

  results.push(
    await step("health", () => client.getHealth())
  );
  results.push(
    await step("payment-types", () => client.getPaymentTypes(), (xs) => ({
      count: Array.isArray(xs) ? xs.length : 0,
      first: Array.isArray(xs) ? xs[0] : null,
    }))
  );
  results.push(
    await step(
      "customers/find?find=ali",
      () => client.findCustomer({ find: "ali", records: 3, page: 0 }),
      (r) => ({
        count: r.customers.length,
        pagination: r.envelope.meta.pagination ?? null,
        firstCustomer: r.customers[0] ?? null,
      })
    )
  );
  results.push(
    await step(
      `invoices?start_date=${isoDate(yesterday)}&end_date=${isoDate(yesterday)}`,
      () =>
        client.listInvoices({
          start_date: isoDate(yesterday),
          end_date: isoDate(yesterday),
          records: 5,
          page: 0,
        }),
      (r) => ({
        count: r.invoices.length,
        pagination: r.envelope.meta.pagination ?? null,
        firstInvoice: r.invoices[0] ?? null,
      })
    )
  );

  const failed = results.filter((r) => r.status === "fail");
  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    succeeded: results.length - failed.length,
    failed: failed.length,
    results,
  };

  // stdout = machine-friendly redacted JSON.
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");

  if (failed.length > 0) {
    bad(`${failed.length}/${results.length} step(s) failed.`);
    process.exit(1);
  }
  ok(`all ${results.length} step(s) passed.`);
  process.exit(0);
}

main().catch((e) => {
  bad(`unexpected: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
