/**
 * Dashboard data snapshot loader. Pulled out of the page so the page
 * component stays small and the snapshot can be tested or reused.
 */
import {
  customerCount,
  dailyRevenue,
  paymentRateLast30Days,
  type DailyRevenuePoint,
} from "@/lib/db/repositories";
import { unpaidCustomerCount } from "@/lib/analiz/churn";

export type DashboardSnapshot = {
  customers: number | null;
  rate: { invoiced: number; paid: number; rate: number } | null;
  unpaid: number | null;
  daily: DailyRevenuePoint[];
  error: string | null;
};

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  try {
    const [customers, rate, unpaid, daily] = await Promise.all([
      customerCount(),
      paymentRateLast30Days(),
      unpaidCustomerCount(30),
      dailyRevenue(30),
    ]);
    return { customers, rate, unpaid, daily, error: null };
  } catch (e) {
    return {
      customers: null,
      rate: null,
      unpaid: null,
      daily: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
