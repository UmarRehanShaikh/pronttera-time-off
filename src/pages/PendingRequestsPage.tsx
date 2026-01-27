import { PendingRequestsTable } from '@/components/manager/PendingRequestsTable';

export function PendingRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Requests</h1>
        <p className="text-muted-foreground">
          Review and manage leave requests from your team
        </p>
      </div>

      <PendingRequestsTable />
    </div>
  );
}
