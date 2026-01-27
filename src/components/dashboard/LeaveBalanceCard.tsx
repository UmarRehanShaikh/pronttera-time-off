import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { Skeleton } from '@/components/ui/skeleton';

export function LeaveBalanceCard() {
  const { data: balance, isLoading } = useLeaveBalance();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!balance) return null;

  const maxLeaves = 20;
  const percentage = (balance.total / maxLeaves) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Leave Balance</span>
          <span className="text-2xl font-bold text-primary">{balance.total}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Total Available</span>
            <span className="font-medium">{balance.total} / {maxLeaves} days</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Q1 (Jan-Mar)</span>
              <span className="font-medium">{balance.q1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Q2 (Apr-Jun)</span>
              <span className="font-medium">{balance.q2}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Q3 (Jul-Sep)</span>
              <span className="font-medium">{balance.q3}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Q4 (Oct-Dec)</span>
              <span className="font-medium">{balance.q4}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Carried Over</span>
              <span className="font-medium">{balance.carried}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Optional Used</span>
              <span className="font-medium">{balance.optionalUsed} / 4</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
