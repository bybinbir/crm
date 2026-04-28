/**
 * Revenue analytics — daily / monthly aggregations.
 *
 * Pure functions over `DailyRevenuePoint[]` so they're trivially testable.
 * Database-touching helpers live in `lib/db/repositories.ts`.
 */
import type { DailyRevenuePoint } from "@/lib/db/repositories";

export type RevenueSummary = {
  totalInvoiced: number;
  totalPaid: number;
  paymentRate: number;
  /** Most-recent vs prior-window delta in % (`null` if prior window is 0). */
  weekOverWeek: number | null;
  /** Highest single-day paid figure. */
  peakPaid: { date: string; amount: number } | null;
};

export function summarise(points: DailyRevenuePoint[]): RevenueSummary {
  if (points.length === 0) {
    return {
      totalInvoiced: 0,
      totalPaid: 0,
      paymentRate: 0,
      weekOverWeek: null,
      peakPaid: null,
    };
  }

  const totalInvoiced = points.reduce((acc, p) => acc + p.invoiced, 0);
  const totalPaid = points.reduce((acc, p) => acc + p.paid, 0);
  const paymentRate = totalInvoiced > 0 ? totalPaid / totalInvoiced : 0;

  // Last 7 vs previous 7 days.
  const tail7 = points.slice(-7);
  const prev7 = points.slice(-14, -7);
  const last = tail7.reduce((acc, p) => acc + p.paid, 0);
  const prev = prev7.reduce((acc, p) => acc + p.paid, 0);
  const weekOverWeek = prev > 0 ? (last - prev) / prev : null;

  let peak: { date: string; amount: number } | null = null;
  for (const p of points) {
    if (!peak || p.paid > peak.amount) peak = { date: p.date, amount: p.paid };
  }

  return {
    totalInvoiced,
    totalPaid,
    paymentRate,
    weekOverWeek,
    peakPaid: peak,
  };
}

/**
 * Format a TRY amount for compact display:
 *   1234567 → "1,2M ₺"
 *   123456  → "123K ₺"
 *   1234    → "1.234 ₺"
 *   12      → "12 ₺"
 */
export function formatTRY(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(".", ",")}M ₺`;
  if (abs >= 100_000) return `${Math.round(amount / 1_000)}K ₺`;
  if (abs >= 1_000) {
    return `${new Intl.NumberFormat("tr-TR").format(Math.round(amount))} ₺`;
  }
  return `${Math.round(amount)} ₺`;
}

export function formatPercent(rate: number, digits = 0): string {
  if (!Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(digits).replace(".", ",")}%`;
}
