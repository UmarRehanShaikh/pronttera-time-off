import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TestTube, Database, CheckCircle, AlertCircle } from 'lucide-react';

export function TriggerTestPanel() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Check if trigger exists
  const { data: triggerStatus, refetch: checkTrigger } = useQuery({
    queryKey: ['trigger-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'LEAVE_APPROVED')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  // Test the trigger with a simple request
  const testTrigger = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Create a test leave request
      const { data: request, error: createError } = await supabase
        .from('leave_requests')
        .insert({
          user_id: user.id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          days: 1,
          leave_type: 'general',
          reason: 'Test request for trigger verification',
          status: 'pending'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Approve the request to trigger the deduction
      const { data: approved, error: approveError } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: user.id
        })
        .eq('id', request.id)
        .select()
        .single();

      if (approveError) throw approveError;

      // Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if audit log was created
      const { data: auditLog, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('record_id', approved.id)
        .eq('action', 'LEAVE_APPROVED')
        .maybeSingle();

      if (auditError) throw auditError;

      // Check if ledger was updated
      const currentYear = new Date().getFullYear();
      const { data: ledger, error: ledgerError } = await supabase
        .from('leave_ledger')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (ledgerError) throw ledgerError;

      return {
        request: approved,
        auditLog,
        ledger,
        triggerWorking: !!auditLog
      };
    },
    onSuccess: (result) => {
      if (result.triggerWorking) {
        toast({
          title: 'Trigger Working! ✅',
          description: 'Leave deduction trigger is functioning correctly.',
        });
      } else {
        toast({
          title: 'Trigger Not Working ❌',
          description: 'The trigger did not execute. Check database logs.',
          variant: 'destructive',
        });
      }
      
      // Refresh trigger status
      checkTrigger();
    },
    onError: (error) => {
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Trigger Test Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Test if the leave deduction trigger is working properly.
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkTrigger()}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Check Status
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => testTrigger.mutate()}
            disabled={testTrigger.isPending}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Test Trigger
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={triggerStatus && triggerStatus.length > 0 ? "default" : "destructive"}>
              Trigger Status
            </Badge>
            <span className="text-sm">
              {triggerStatus && triggerStatus.length > 0 
                ? `✅ Working (${triggerStatus.length} recent logs)` 
                : '❌ Not detected'}
            </span>
          </div>

          {triggerStatus && triggerStatus.length > 0 && (
            <div className="text-xs space-y-1">
              <div className="font-semibold">Recent Trigger Executions:</div>
              {triggerStatus.slice(0, 3).map((log, index) => (
                <div key={log.id} className="text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()} - {log.new_data?.message || 'No message'}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <strong>How it works:</strong>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Creates a test leave request</li>
            <li>Approves it to trigger the deduction</li>
            <li>Checks if audit log was created</li>
            <li>Verifies ledger was updated</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
