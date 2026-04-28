#!/usr/bin/env tsx
/**
 * Daily invoice pull — CLI wrapper.
 *
 * Usage:
 *   pnpm pull:day                      # yesterday (UTC)
 *   pnpm pull:day -- 2026-04-27        # positional date
 *   pnpm pull:day -- --date=2026-04-27 # named date
 *   pnpm pull:day -- --dry-run         # parse + log, no network, no DB
 *
 * Exit codes:
 *   0  → success or successful dry-run
 *   1  → recoverable failure (network/HTTP/parse/DB error) — systemd should
 *        retry on the next timer tick (Restart=no, Persistent=true)
 *   2  → invalid invocation (bad CLI argument)
 *
 * Strategy:
 *   - 1-day window because /invoices wide-range times out at >45s upstream.
 *   - Page through `records=100` until total_pages exhausted.
 *   - Per-invoice upsert with `ON CONFLICT (fatura_no) DO NOTHING`, so
 *     re-running the same day is idempotent.
 *   - Each run row in `pull_runs` (status running/succeeded/failed).
 *   - Summary printed as one JSON object on stdout for observability.
 */
import { IssmanagerClient } from "@/lib/issmanager";
import { closeDb } from "@/lib/db";
import { startPullRun, upsertInvoice } from "@/lib/db/repositories";
import { runDailyPull, parseArgs } from "@/lib/jobs/pull-day";

async function main(): Promise<never> {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv, new Date());
  if ("error" in parsed) {
    process.stderr.write(`! ${parsed.error}\n`);
    process.stderr.write(
      "usage: pull:day [--dry-run] [--date=YYYY-MM-DD | YYYY-MM-DD]\n"
    );
    process.exit(2);
  }

  // Dry-run skips network and DB entirely. Useful for CI smoke and for
  // verifying the runner installation on a fresh server before any secrets
  // are populated.
  if (parsed.dryRun) {
    const { summary, exitCode } = await runDailyPull(parsed, {
      client: {
        listInvoices: () => {
          throw new Error("listInvoices must not be called in dry-run");
        },
      },
      startPullRun: () => {
        throw new Error("startPullRun must not be called in dry-run");
      },
      upsertInvoice: () => {
        throw new Error("upsertInvoice must not be called in dry-run");
      },
    });
    process.stdout.write(JSON.stringify(summary) + "\n");
    process.exit(exitCode);
  }

  const client = new IssmanagerClient();
  try {
    const { summary, exitCode } = await runDailyPull(parsed, {
      client: {
        listInvoices: (args) => client.listInvoices(args),
      },
      startPullRun,
      upsertInvoice: (inv) => upsertInvoice(inv as Parameters<typeof upsertInvoice>[0]),
    });
    process.stdout.write(JSON.stringify(summary) + "\n");
    process.exit(exitCode);
  } finally {
    await closeDb().catch(() => undefined);
  }
}

main().catch(async (e) => {
  process.stderr.write(`unexpected: ${e instanceof Error ? e.message : String(e)}\n`);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
