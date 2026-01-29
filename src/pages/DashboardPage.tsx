import { useAuth } from '@/contexts/AuthContext';
import { QuickStatsCard } from '@/components/dashboard/QuickStatsCard';
import { LeaveBalanceCard } from '@/components/dashboard/LeaveBalanceCard';
import { RecentRequestsCard } from '@/components/dashboard/RecentRequestsCard';
import { LeaveDeductionDebugPanel } from '@/components/debug/LeaveDeductionDebugPanel';

export function DashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.first_name}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your leave status
        </p>
      </div>

      <QuickStatsCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <LeaveBalanceCard />
        <RecentRequestsCard />
      </div>

      <LeaveDeductionDebugPanel />
    </div>
  );
}
