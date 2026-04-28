#!/usr/bin/env tsx
/**
 * Daily invoice pull — pulls one day's worth of invoices from ISS Manager
 * v2 and persists them to the local DB.
 *
 * Usage:
 *   pnpm pull:day                    # yesterday (Europe/Istanbul)
 *   pnpm pull:day -- 2026-04-27      # specific day
 *
 * Strategy:
 *   - 1-day window because /invoices wide-range times out at >45s.
 *   - Page through `records=100` until total_pages exhausted.
 *   - Per-invoice upsert; duplicate fatura_no rows are ignored
 *     (`ON CONFLICT DO NOTHING`).
 *   - Each run is written to `pull_runs` with status running/succeeded/failed.
 *
 * Idempotent: safe to re-run for the same day.
 */
import { performance } from "node:perf_hooks";
import {
  IssmanagerClient,
  isIssmanagerError,
  redactDeep,
} from "@/lib/issmanager";
import { closeDb } from "@/lib/db";
import { startPullRun, upsertInvoice } from "@/lib/db/repositories";

const PAGE_SIZE = 100;

function parseDateArg(): Date {
  const arg = process.argv[2];
  if (!arg) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(arg);
  if (!m) {
    process.stderr.write(`bad date arg: ${arg}; expected YYYY-MM-DD\n`);
    process.exit(2);
  }
  return new Date(`${arg}T00:00:00.000Z`);
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main(): Promise<void> {
  const day = parseDateArg();
  const dateStr = isoDate(day);
  process.stderr.write(`› crmanaliz pull-day ${dateStr}\n`);

  const client = new IssmanagerClient();
  const handle = await startPullRun("/iss/v2/invoices", day, day);

  let inserted = 0;
  let seen = 0;
  let errors = 0;

  const t0 = performance.now();

  try {
    let page = 0;
    while (true) {
      const res = await client.listInvoices({
        start_date: dateStr,
        end_date: dateStr,
        records: PAGE_SIZE,
        page,
      });

      seen += res.invoices.length;
      for (const inv of res.invoices) {
        try {
          const r = await upsertInvoice(inv);
          if (r.inserted) inserted += 1;
        } catch (e) {
          errors += 1;
          process.stderr.write(
            `  ✗ upsert failed for fatura ${inv.fatura_no}: ${
              e instanceof Error ? e.message : String(e)
            }\n`
          );
        }
      }

      const pag = res.envelope.meta.pagination;
      const totalPages = pag?.total_pages ?? 1;
      process.stderr.write(
        `  page ${page + 1}/${totalPages}: ${res.invoices.length} invoices\n`
      );
      page += 1;
      if (page >= totalPages) break;
    }

    const ms = Math.round(performance.now() - t0);
    process.stderr.write(
      `✓ done in ${ms} ms — seen ${seen}, inserted ${inserted}, errors ${errors}\n`
    );

    if (errors > 0) {
      await handle.finishFail(inserted, errors, `${errors} invoice upserts failed`);
      process.exit(1);
    }
    await handle.finishOk(inserted);

    process.stdout.write(
      JSON.stringify({
        date: dateStr,
        seen,
        inserted,
        errors,
        durationMs: ms,
      }) + "\n"
    );
    process.exit(0);
  } catch (e) {
    const kind = isIssmanagerError(e) ? e.kind : "unknown";
    const message = e instanceof Error ? e.message : String(e);
    process.stderr.write(`✗ pull-day failed (${kind}): ${message}\n`);
    await handle.finishFail(inserted, errors + 1, `${kind}: ${message}`);
    // Print a redacted summary for debugging without leaking PII.
    process.stdout.write(JSON.stringify(redactDeep({ kind, message })) + "\n");
    process.exit(1);
  } finally {
    await closeDb().catch(() => undefined);
  }
}

main().catch(async (e) => {
  process.stderr.write(`unexpected: ${e instanceof Error ? e.message : String(e)}\n`);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
