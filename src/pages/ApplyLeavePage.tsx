import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { LeaveBalanceCard } from '@/components/dashboard/LeaveBalanceCard';

export function ApplyLeavePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Apply for Leave</h1>
        <p className="text-muted-foreground">
          Submit a new leave request for approval
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeaveRequestForm />
        </div>
        <div>
          <LeaveBalanceCard />
        </div>
      </div>
    </div>
  );
}
