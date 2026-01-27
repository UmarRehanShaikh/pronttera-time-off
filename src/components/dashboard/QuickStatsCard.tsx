import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';

export function QuickStatsCard() {
  const { data: requests } = useLeaveRequests();
  const { data: balance } = useLeaveBalance();

  const pendingCount = requests?.filter((r) => r.status === 'pending').length || 0;
  const approvedCount = requests?.filter((r) => r.status === 'approved').length || 0;
  const rejectedCount = requests?.filter((r) => r.status === 'rejected').length || 0;

  const stats = [
    {
      label: 'Available Leaves',
      value: balance?.total || 0,
      icon: CalendarDays,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Approved',
      value: approvedCount,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Rejected',
      value: rejectedCount,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className={`rounded-full p-3 ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
