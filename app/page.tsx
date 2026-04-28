import { HomeView } from "@/components/dashboard/home-view";
import { loadDashboardSnapshot } from "@/lib/dashboard-snapshot";

export const dynamic = "force-dynamic";

export default async function HomePage(): Promise<React.ReactElement> {
  const snap = await loadDashboardSnapshot();
  return <HomeView snap={snap} />;
}
