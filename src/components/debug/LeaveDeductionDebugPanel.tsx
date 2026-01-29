import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLeaveDeductionDebug } from '@/hooks/useLeaveDeductionDebug';
import { useAuth } from '@/contexts/AuthContext';
import { Bug, Play, CheckCircle } from 'lucide-react';
import { TriggerTestPanel } from './TriggerTestPanel';
import { ManualLeaveTest } from './ManualLeaveTest';

export function LeaveDeductionDebugPanel() {
  const { isAdmin } = useAuth();
  const { checkLedgerStatus, manualDeduction } = useLeaveDeductionDebug();

  // Only show debug panel for admins
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Leave Deduction Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Debug tools for troubleshooting leave balance calculation issues.
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkLedgerStatus.mutate(undefined)}
              disabled={checkLedgerStatus.isPending}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Check Balance Status
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const requestId = prompt('Enter Leave Request ID to manually deduct:');
                if (requestId) {
                  manualDeduction.mutate(requestId);
                }
              }}
              disabled={manualDeduction.isPending}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Manual Deduction
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Check Balance</Badge>
              <span className="text-muted-foreground">
                Compares expected vs actual leave balances
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Manual Deduction</Badge>
              <span className="text-muted-foreground">
                Forces deduction for a specific approved request
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3">
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Approve a leave request first</li>
              <li>Use "Check Balance Status" to verify calculations</li>
              <li>If mismatch found, use "Manual Deduction" with the request ID</li>
              <li>Check browser console for detailed debug information</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <TriggerTestPanel />
      <ManualLeaveTest />
    </>
  );
}
