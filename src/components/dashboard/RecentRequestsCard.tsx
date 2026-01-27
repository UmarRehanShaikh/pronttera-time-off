import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { LeaveStatus } from '@/lib/types';

const statusVariants: Record<LeaveStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  cancelled: 'outline',
};

export function RecentRequestsCard() {
  const { data: requests, isLoading } = useLeaveRequests();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const recentRequests = requests?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {recentRequests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No leave requests yet
          </p>
        ) : (
          <div className="space-y-4">
            {recentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {format(new Date(request.start_date), 'MMM d')} -{' '}
                    {format(new Date(request.end_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.days} day{request.days > 1 ? 's' : ''} •{' '}
                    {request.leave_type === 'optional' ? 'Optional Holiday' : 'General Leave'}
                  </p>
                </div>
                <Badge variant={statusVariants[request.status]}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
