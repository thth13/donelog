import { Header } from "@/components/Header";
import { StatsDashboard } from "@/components/StatsDashboard";
import { requireUser } from "@/lib/auth";
import { AccountProvider } from "@/components/AccountProvider";
import { TaskSync } from "@/components/TaskSync";

export default async function StatsPage() {
  const user = await requireUser();
  return <AccountProvider user={user}><main className="stats-shell"><Header stats /><StatsDashboard /></main><TaskSync /></AccountProvider>;
}
